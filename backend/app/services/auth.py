"""Authentication service: JWT tokens, password hashing, user management."""
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..database import get_db
from ..config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


# ── Password helpers ────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── JWT helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.access_token_expire_days)
    payload["exp"] = expire
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


# ── Dependency: get current authenticated user ──────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return {
        "user_id": payload["user_id"],
        "email": payload["email"],
        "name": payload["name"],
    }


# ── User registration & login ────────────────────────────────────────────────

def register_user(email: str, name: str, password: str) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise ValueError("Email already registered")

            pw_hash = hash_password(password)
            cur.execute(
                """INSERT INTO users (email, name, password_hash)
                   VALUES (%s, %s, %s)
                   RETURNING id, email, name, created_at, updated_at""",
                (email, name, pw_hash),
            )
            user = dict(cur.fetchone())

    token = create_access_token(
        {"user_id": str(user["id"]), "email": user["email"], "name": user["name"]}
    )
    user["id"] = str(user["id"])
    user["created_at"] = user["created_at"].isoformat()
    user["updated_at"] = user["updated_at"].isoformat()
    return {"user": user, "token": token}


def login_user(email: str, password: str) -> dict:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid email or password")

    user = dict(user)
    token = create_access_token(
        {"user_id": str(user["id"]), "email": user["email"], "name": user["name"]}
    )
    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user["name"],
            "created_at": user["created_at"].isoformat(),
            "updated_at": user["updated_at"].isoformat(),
        },
        "token": token,
    }
