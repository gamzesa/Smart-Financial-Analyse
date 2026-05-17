from passlib.context import CryptContext
import jwt
import datetime

SECRET_KEY = "secret123"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(password, hashed):
    return pwd_context.verify(password, hashed)

def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token: str):
    """JWT token'ı doğrular ve payload döner. Geçersizse exception fırlatır."""
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
