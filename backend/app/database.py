"""PostgreSQL database connection and schema initialization."""
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator
from .config import get_settings

settings = get_settings()


@contextmanager
def get_db() -> Generator:
    """Context manager for database connections."""
    conn = psycopg2.connect(settings.database_url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create all tables and indexes if they don't exist."""
    schema_sql = """
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Conversations table
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
            summary TEXT,
            is_shared BOOLEAN DEFAULT FALSE,
            share_token VARCHAR(255) UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Messages table
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Message feedback table
        CREATE TABLE IF NOT EXISTS message_feedback (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            feedback VARCHAR(10) NOT NULL CHECK (feedback IN ('like', 'dislike')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(message_id, user_id)
        );

        -- User memories table
        CREATE TABLE IF NOT EXISTS user_memories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            memory TEXT NOT NULL,
            category VARCHAR(100) DEFAULT 'general',
            importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);
        CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_share_token
            ON conversations(share_token) WHERE share_token IS NOT NULL;
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)
    print("[INFO] Database schema initialized successfully")
