"""Share router: public access to shared conversations."""
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..services.ai import generate_shared_summary

router = APIRouter(prefix="/share", tags=["share"])


def _ser_conv(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    # Remove sensitive fields
    d.pop("user_id", None)
    d.pop("share_token", None)
    return d


def _ser_msg(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["conversation_id"] = str(d["conversation_id"])
    d["created_at"] = d["created_at"].isoformat()
    return d


@router.get("/{token}")
def get_shared_conversation(token: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, title, summary, created_at, updated_at
                   FROM conversations
                   WHERE share_token = %s AND is_shared = TRUE""",
                (token,),
            )
            conv = cur.fetchone()

    if not conv:
        raise HTTPException(status_code=404, detail="Shared conversation not found or link expired")

    conv_dict = _ser_conv(conv)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, conversation_id, role, content, created_at
                   FROM messages WHERE conversation_id = %s ORDER BY created_at ASC""",
                (conv["id"],),
            )
            messages = [_ser_msg(r) for r in cur.fetchall()]

    return {"conversation": conv_dict, "messages": messages}


@router.post("/{token}/summarize")
def summarize_shared(token: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title FROM conversations WHERE share_token = %s AND is_shared = TRUE",
                (token,),
            )
            conv = cur.fetchone()

    if not conv:
        raise HTTPException(status_code=404, detail="Shared conversation not found")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
                (conv["id"],),
            )
            messages = [dict(r) for r in cur.fetchall()]

    if not messages:
        raise HTTPException(status_code=400, detail="Conversation has no messages to summarize")

    try:
        summary = generate_shared_summary(messages)
        return {"summary": summary}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {exc}")
