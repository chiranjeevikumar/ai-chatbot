"""Memory service: store, retrieve, categorize user memories."""
from typing import Optional
from ..database import get_db


def _categorize(memory: str) -> str:
    lower = memory.lower()
    if any(k in lower for k in ("work", "job", "engineer", "developer", "profession")):
        return "profession"
    if any(k in lower for k in ("prefer", "like", "love", "enjoy", "hate", "dislike")):
        return "preference"
    if any(k in lower for k in ("learn", "study", "skill", "course")):
        return "learning"
    if any(k in lower for k in ("python", "javascript", "typescript", "code", "programming")):
        return "technical"
    return "general"


def _importance(memory: str) -> int:
    lower = memory.lower()
    if any(k in lower for k in ("engineer", "developer", "profession", "career")):
        return 9
    if any(k in lower for k in ("always", "never", "prefer")):
        return 7
    if any(k in lower for k in ("learn", "goal", "want")):
        return 6
    return 5


def get_user_memories(user_id: str) -> list[dict]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM user_memories WHERE user_id = %s ORDER BY importance DESC, updated_at DESC",
                (user_id,),
            )
            rows = cur.fetchall()
    return [_serialize(r) for r in rows]


def get_relevant_memories_text(user_id: str, limit: int = 10) -> str:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT memory FROM user_memories WHERE user_id = %s ORDER BY importance DESC, updated_at DESC LIMIT %s",
                (user_id, limit),
            )
            rows = cur.fetchall()
    if not rows:
        return ""
    return "\n".join(f"- {r['memory']}" for r in rows)


def save_memories(user_id: str, memories: list[str]) -> None:
    for memory in memories:
        if not memory or len(memory.strip()) < 5:
            continue
        with get_db() as conn:
            with conn.cursor() as cur:
                # Skip duplicates (case-insensitive)
                cur.execute(
                    "SELECT id FROM user_memories WHERE user_id = %s AND LOWER(memory) = LOWER(%s)",
                    (user_id, memory.strip()),
                )
                if cur.fetchone():
                    continue
                cur.execute(
                    "INSERT INTO user_memories (user_id, memory, category, importance) VALUES (%s, %s, %s, %s)",
                    (user_id, memory.strip(), _categorize(memory), _importance(memory)),
                )


def add_memory(user_id: str, memory: str, category: Optional[str] = None, importance: Optional[int] = None) -> dict:
    cat = category or _categorize(memory)
    imp = importance or _importance(memory)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_memories (user_id, memory, category, importance) VALUES (%s, %s, %s, %s) RETURNING *",
                (user_id, memory.strip(), cat, imp),
            )
            row = cur.fetchone()
    return _serialize(row)


def delete_memory(user_id: str, memory_id: str) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_memories WHERE id = %s AND user_id = %s RETURNING id",
                (memory_id, user_id),
            )
            return cur.fetchone() is not None


def clear_all_memories(user_id: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memories WHERE user_id = %s", (user_id,))


def _serialize(row) -> dict:
    d = dict(row)
    d["id"] = str(d["id"])
    d["user_id"] = str(d["user_id"])
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    return d
