"""Conversation context management and auto-summarization."""
from ..database import get_db
from .ai import summarize_conversation

SUMMARIZE_THRESHOLD = 20  # messages before summarization kicks in
MAX_RECENT_MESSAGES = 10  # messages to keep in context after summarization


def get_conversation_messages(conversation_id: str) -> list[dict]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
                (conversation_id,),
            )
            return [dict(r) for r in cur.fetchall()]


def build_context(conversation_id: str, summary: str | None) -> list[dict]:
    """Return a trimmed message list suitable for sending to the AI."""
    messages = get_conversation_messages(conversation_id)

    if len(messages) > MAX_RECENT_MESSAGES and summary:
        context = [{"role": "system", "content": f"Conversation summary so far:\n{summary}"}]
        context.extend(messages[-MAX_RECENT_MESSAGES:])
        return context

    return messages


def maybe_summarize(conversation_id: str) -> None:
    """Trigger summarization if the conversation is long enough."""
    messages = get_conversation_messages(conversation_id)
    if len(messages) < SUMMARIZE_THRESHOLD:
        return

    # Get existing summary
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT summary FROM conversations WHERE id = %s", (conversation_id,))
            row = cur.fetchone()
            existing = row["summary"] if row else None

    try:
        new_summary = summarize_conversation(messages, existing)
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE conversations SET summary = %s, updated_at = NOW() WHERE id = %s",
                    (new_summary, conversation_id),
                )
    except Exception as exc:
        print(f"Summarization error: {exc}")
