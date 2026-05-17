from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)

    # hashed password
    hashed_password = Column(String)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    income = Column(Float)
    savings = Column(Float)
    essentials = Column(Float)
    entertainment = Column(Float)

    risk_level = Column(String)
    summary = Column(Text)
    # Transcript eski DB şemalarında olmayabilir. Bu alan eklenirse UI tarafında kullanılabilir.
    transcript = Column(Text)

    stocks = Column(Float)
    gold = Column(Float)
    crypto = Column(Float)
    cash = Column(Float)
    

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    title = Column(String)
    amount = Column(Float)
    category = Column(String)

    type = Column(String)  # income / expense

    # SQLite + API tarafı için datetime'ı string olarak döndürebiliriz ama DB'de datetime uyumlu saklamak daha sağlıklı.
    created_at = Column(String)
