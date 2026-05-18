from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from datetime import datetime, date
from fastapi.middleware.cors import CORSMiddleware
import requests

from database import SessionLocal, engine
import models

from auth import hash_password, verify_password, create_token

import os
import json
import re
import google.generativeai as genai

# =========================
# ENV
# =========================
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY bulunamadı!")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

# =========================
# APP
# =========================
app = FastAPI()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# DB
# =========================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# MODELS
# =========================
class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TransactionCreate(BaseModel):
    title: str
    amount: float
    category: str  # zorunlu / eğlence / yatırım vs
    type: str  # income / expense
    date: str | None = None  # YYYY-MM-DD (opsiyonel)


class UserData(BaseModel):
    income: float
    savings: float
    essentials: float
    entertainment: float
    goal: str
    risk: str


class FollowUpData(BaseModel):
    follow_up_answers: list[str]
    goal: str
    risk: str
    income: float
    savings: float
    essentials: float
    entertainment: float


# =========================
# TOKEN HELPER
# =========================
from auth import decode_token


def get_user_id(authorization: str):
    if not authorization:
        raise HTTPException(401, "Token missing")

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid token header")

    token = authorization.replace("Bearer ", "").strip()
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    return payload["user_id"]


def normalize_tx_type(tx_type: str) -> str:
    tx_type = (tx_type or "").lower().strip()
    if tx_type not in {"income", "expense"}:
        raise HTTPException(400, "type must be 'income' or 'expense'")
    return tx_type


def normalize_date_str(d: str | None) -> str:
    # DB için ISO date (YYYY-MM-DD) yeterli
    if not d:
        return date.today().isoformat()
    try:
        parsed = datetime.strptime(d, "%Y-%m-%d").date()
        return parsed.isoformat()
    except Exception:
        raise HTTPException(400, "date must be YYYY-MM-DD")


def build_tx_text(txs: list[models.Transaction]):
    return "\n".join([f"{t.type} | {t.category}: {t.amount}" for t in txs])


def persist_analysis(db: Session, user_id: int, data: UserData, result: dict):

    """Persist AI analysis as a transcript-like record.

    - models.Analysis.summary  -> Short Turkish summary (UI’de gösterilecek)
    - models.Analysis.transcript -> Full transcript/debug-like text

    Not: Transcript alanı models.Analysis içinde yoksa yok sayılır.
    """


    allocation = result.get("allocation") or {}

    analysis_kwargs = {
        "user_id": user_id,
        "income": data.income,
        "savings": data.savings,
        "essentials": data.essentials,
        "entertainment": data.entertainment,
        "risk_level": result.get("risk_level"),
        "summary": result.get("summary"),
        "stocks": allocation.get("stocks"),
        "gold": allocation.get("gold"),
        "crypto": allocation.get("crypto"),
        "cash": allocation.get("cash"),
    }

    # eski DB şemasında transcript kolonu olmayabilir.
    if hasattr(models.Analysis, "transcript"):
        analysis_kwargs["transcript"] = (
            result.get("transcript")
            or result.get("debug_transcript")
            or result.get("debug_transactions")
            or ""
        )

    analysis = models.Analysis(**analysis_kwargs)

    db.add(analysis)
    db.commit()


# =========================
# HOME
# =========================
@app.get("/")
def home():
    return {"message": "FinPilot AI Running 🚀"}


# =========================
# REGISTER
# =========================
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()

    if existing:
        raise HTTPException(400, "User already exists")

    new_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created"}


# =========================
# LOGIN
# =========================
@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user:
        raise HTTPException(400, "User not found")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(400, "Wrong password")

    token = create_token(db_user.id)

    return {"access_token": token, "user_id": db_user.id}


# =========================
# TRANSACTION ADD
# =========================
@app.post("/transactions")
def add_transaction(
    data: TransactionCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(authorization)

    tx_type = normalize_tx_type(data.type)
    tx_date = normalize_date_str(data.date)

    tx = models.Transaction(
        user_id=user_id,
        title=data.title,
        amount=float(data.amount),
        category=(data.category or "").lower().strip(),
        type=tx_type,
        created_at=tx_date,  # YYYY-MM-DD
    )

    db.add(tx)
    db.commit()

    return {"message": "transaction added"}


def filter_transactions_by_scope(query, from_date: str | None, to_date: str | None, year: str | None, month: str | None, d: str | None):
    # created_at DB'de YYYY-MM-DD
    if d:
        query = query.filter(models.Transaction.created_at == d)

    if year and month:
        prefix = f"{year}-{month.zfill(2)}"
        query = query.filter(models.Transaction.created_at.startswith(prefix))

    if from_date and to_date:
        query = query.filter(models.Transaction.created_at >= from_date).filter(models.Transaction.created_at <= to_date)

    return query


# =========================
# TRANSACTION LIST
# =========================
@app.get("/transactions")
def get_transactions(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    date: str | None = None,  # YYYY-MM-DD
    year: str | None = None,  # YYYY
    month: str | None = None,  # 1-12
):
    user_id = get_user_id(authorization)

    q = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.id.desc())

    d_norm = None
    if date:
        d_norm = normalize_date_str(date)

    y_norm = None
    m_norm = None
    if year:
        try:
            y_norm = str(int(year))
        except Exception:
            raise HTTPException(400, "year must be YYYY")

    if month:
        try:
            m_norm = str(int(month))
        except Exception:
            raise HTTPException(400, "month must be 1-12")

    q = filter_transactions_by_scope(q, None, None, y_norm, m_norm, d_norm)

    return q.all()


# =========================
# JSON CLEANER
# =========================

def extract_json(text: str):
    try:
        text = (text or "").strip()
        text = re.sub(r"```json", "", text)
        text = re.sub(r"```", "", text)

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return None
    except Exception:
        return None



# =========================
# ANALYZE
# =========================
@app.post("/analyze")
def analyze(
    data: UserData,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(authorization)

    history = db.query(models.Analysis).filter(models.Analysis.user_id == user_id).all()
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()

    history_text = "\n".join([h.summary for h in history if h.summary])
    tx_text = build_tx_text(txs)

    prompt = f"""
You are a personal finance advisor AI.

You MUST use the user's real transaction history.
Each line in Transactions includes type (income/expense) explicitly.

Transactions (type | category: amount):
{tx_text}

User profile:
Income: {data.income}
Savings: {data.savings}
Essentials: {data.essentials}
Entertainment: {data.entertainment}
Goal: {data.goal}
Risk: {data.risk}

Additionally consider previous analyses (if any):
{history_text}

Tasks:
1) Compute a short Turkish summary based on actual cashflow (income vs expense) patterns.
2) Detect likely risk level in Turkish categories: Düşük / Orta / Yüksek.
3) Provide exactly 3 short Turkish recommendations.
4) Provide an allocation distribution in percentages that sums to 100.
5) Ask exactly 3 follow-up questions (short, clear, Turkish) that help refine the advice.

Return ONLY valid JSON in this exact schema:
{{
  "risk_level": "Düşük|Orta|Yüksek",
  "summary": "... (kısa, Türkçe)",
  "recommendations": ["...","...","..."],
  "allocation": {{
    "stocks": 0,
    "gold": 0,
    "crypto": 0,
    "cash": 0
  }},
  "follow_up_questions": ["...","...","..."]
}}
"""

    response = model.generate_content(prompt)
    result = extract_json(getattr(response, "text", ""))

    if not result:
        raise HTTPException(500, "AI parse failed")

    # transcript olarak tüm ham cevabı saklamak (UI'de gösterilebilir)
    result["transcript"] = getattr(response, "text", "")

    persist_analysis(db, user_id, data, result)

    # Debug
    try:
        result["debug_transactions"] = tx_text.splitlines()[:30]
        result["debug_type_counts"] = {
            "income": sum(1 for _t in txs if _t.type == "income"),
            "expense": sum(1 for _t in txs if _t.type == "expense"),
        }
    except Exception:
        pass

    return result


# =========================
# ANALYSIS LIST
# =========================
@app.get("/analyses")
def list_analyses(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(authorization)

    q = db.query(models.Analysis).filter(models.Analysis.user_id == user_id).order_by(models.Analysis.id.desc())
    rows = q.all()

    # frontend JSON-friendly
    return [
        {
            "id": r.id,
            "risk_level": r.risk_level,
            "summary": r.summary,
            "transcript": r.transcript,
            "stocks": r.stocks,
            "gold": r.gold,
            "crypto": r.crypto,
            "cash": r.cash,
            "income": r.income,
            "savings": r.savings,
            "essentials": r.essentials,
            "entertainment": r.entertainment,
        }
        for r in rows
    ]


# =========================
# FOLLOW-UP
# =========================

@app.post("/analyze/follow-up")
def follow_up(
    data: FollowUpData,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(authorization)

    history = db.query(models.Analysis).filter(models.Analysis.user_id == user_id).all()
    txs = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()

    history_text = "\n".join([h.summary for h in history if h.summary])
    tx_text = build_tx_text(txs)

    answers = data.follow_up_answers or []
    answers_text = "\n".join([f"Soru {i+1}: {a}" for i, a in enumerate(answers)])

    prompt = f"""
You are a personal finance advisor AI.

We already produced an initial analysis.
Now we refine it using the user's follow-up answers.

Transactions (type | category: amount):
{tx_text}

User profile:
Income: {data.income}
Savings: {data.savings}
Essentials: {data.essentials}
Entertainment: {data.entertainment}
Goal: {data.goal}
Risk: {data.risk}

Previous analyses (if any):
{history_text}

User follow-up answers:
{answers_text}

Tasks:
1) Update the short Turkish summary based on answers and real cashflow.
2) Provide exactly 3 short Turkish recommendations.
3) Provide an updated allocation distribution in percentages that sums to 100.
4) Detect likely risk level in Turkish categories: Düşük / Orta / Yüksek.

Return ONLY valid JSON in this exact schema:
{{
  "risk_level": "Düşük|Orta|Yüksek",
  "summary": "... (kısa, Türkçe)",
  "recommendations": ["...","...","..."],
  "allocation": {{
    "stocks": 0,
    "gold": 0,
    "crypto": 0,
    "cash": 0
  }},
  "follow_up_questions": ["...","...","..."]
}}
"""

    response = model.generate_content(prompt)
    result = extract_json(getattr(response, "text", ""))

    if not result:
        raise HTTPException(500, "AI parse failed")

    persist_analysis(
        db,
        user_id,
        UserData(
            income=data.income,
            savings=data.savings,
            essentials=data.essentials,
            entertainment=data.entertainment,
            goal=data.goal,
            risk=data.risk,
        ),
        result,
    )

    return result

