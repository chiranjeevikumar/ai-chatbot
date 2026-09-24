"""Conversations router: CRUD + share."""
from fastapi import APIRouter, HTTPException, Depends, Query
import secrets
from ..database import get_db
from ..services.auth import get_current_user
from ..models.schemas import ConversationCreate, ConversationUpdate, ConversationOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _serialize(row: dict) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["user_id"] = str(d["user_id"])
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    d.setdefault("message_count", 0)
    return d


@router.get("/")
def list_conversations(
    search: str = Query(""),
    user=Depends(get_current_user),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            if search:
                cur.execute(
                    """SELECT c.*, COUNT(m.id)::int AS message_count
                       FROM conversations c
                       LEFT JOIN messages m ON m.conversation_id = c.id
                       WHERE c.user_id = %s AND LOWER(c.title) LIKE LOWER(%s)
                       GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 50""",
                    (user["user_id"], f"%{search}%"),
                )
            else:
                cur.execute(
                    """SELECT c.*, COUNT(m.id)::int AS message_count
                       FROM conversations c
                       LEFT JOIN messages m ON m.conversation_id = c.id
                       WHERE c.user_id = %s
                       GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 50""",
                    (user["user_id"],),
                )
            rows = cur.fetchall()
    return {"conversations": [_serialize(r) for r in rows]}


@router.post("/", status_code=201)
def create_conversation(req: ConversationCreate, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations (user_id, title) VALUES (%s, %s) RETURNING *",
                (user["user_id"], req.title or "New Chat"),
            )
            row = cur.fetchone()
    return {"conversation": _serialize(row)}


@router.get("/{conv_id}")
def get_conversation(conv_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM conversations WHERE id = %s AND user_id = %s",
                (conv_id, user["user_id"]),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": _serialize(row)}


@router.patch("/{conv_id}")
def update_conversation(conv_id: str, req: ConversationUpdate, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM conversations WHERE id = %s AND user_id = %s",
                (conv_id, user["user_id"]),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Conversation not found")

            updates = []
            values = []

            if req.title is not None:
                updates.append("title = %s")
                values.append(req.title)

            if req.is_shared is not None:
                updates.append("is_shared = %s")
                values.append(req.is_shared)
                if req.is_shared and not existing["share_token"]:
                    updates.append("share_token = %s")
                    values.append(secrets.token_urlsafe(24))

            if not updates:
                return {"conversation": _serialize(existing)}

            updates.append("updated_at = NOW()")
            values.extend([conv_id, user["user_id"]])
            sql = f"UPDATE conversations SET {', '.join(updates)} WHERE id = %s AND user_id = %s RETURNING *"
            cur.execute(sql, values)
            row = cur.fetchone()

    return {"conversation": _serialize(row)}


@router.delete("/{conv_id}")
def delete_conversation(conv_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM conversations WHERE id = %s AND user_id = %s RETURNING id",
                (conv_id, user["user_id"]),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@router.get("/{conv_id}/messages")
def get_messages(conv_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute(
                "SELECT id FROM conversations WHERE id = %s AND user_id = %s",
                (conv_id, user["user_id"]),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")

            cur.execute(
                """SELECT m.*, mf.feedback
                   FROM messages m
                   LEFT JOIN message_feedback mf
                     ON mf.message_id = m.id AND mf.user_id = %s
                   WHERE m.conversation_id = %s
                   ORDER BY m.created_at ASC""",
                (user["user_id"], conv_id),
            )
            rows = cur.fetchall()

    def ser(r):
        d = dict(r)
        d["id"] = str(d["id"])
        d["conversation_id"] = str(d["conversation_id"])
        d["created_at"] = d["created_at"].isoformat()
        return d

    return {"messages": [ser(r) for r in rows]}
