"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import get_settings
from .database import init_db
from .routers import auth, conversations, chat, feedback, memories, share

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks."""
    init_db()
    yield


app = FastAPI(
    title="AI Chatbot API",
    description="Full-stack AI chatbot backend with OpenRouter + Layerbase PostgreSQL",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router,          prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(chat.router,          prefix="/api")
app.include_router(feedback.router,      prefix="/api")
app.include_router(memories.router,      prefix="/api")
app.include_router(share.router,         prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Chatbot API is running 🚀"}


@app.get("/health")
def health():
    return {"status": "healthy"}
