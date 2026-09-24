"""Auth router: register, login, logout."""
from fastapi import APIRouter, HTTPException, status
from ..models.schemas import RegisterRequest, LoginRequest, TokenResponse
from ..services.auth import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest):
    try:
        return register_user(req.email.lower().strip(), req.name.strip(), req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    try:
        return login_user(req.email.lower().strip(), req.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
def logout():
    # JWT is stateless; client discards the token
    return {"success": True}
