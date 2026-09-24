"""Chat router: streaming AI responses with SSE."""
import asyncio
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from ..database import get_db
from ..services.auth import get_current_user
from ..services.ai import get_stream, generate_title, extract_memories
from ..services.memory import get_relevant_memories_text, save_memories
from ..services.context import build_context, maybe_summarize
from ..models.schemas import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


async def event_stream(
    conversation_id: str,
    user_id: str,
    user_message: str,
    user_message_id: str,
    context_messages: list[dict],
    is_first_message: bool,
    conversation_title: str,
):
    """Async generator that yields SSE events."""
    full_response = ""

    # Start title generation concurrently if this is the first message or titled "New Chat"
    title_task = None
    if is_first_message or conversation_title == "New Chat":
        title_task = asyncio.create_task(asyncio.to_thread(generate_title, user_message))

    try:
        async for chunk in get_stream(context_messages):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
        return

    # Check and save title if generated
    new_title = None
    if title_task:
        try:
            new_title = await asyncio.wait_for(title_task, timeout=5.0)
            if new_title and new_title != "New Chat":
                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE conversations SET title = %s, updated_at = NOW() WHERE id = %s",
                            (new_title, conversation_id),
                        )
                yield f"data: {json.dumps({'type': 'title', 'title': new_title})}\n\n"
        except Exception as exc:
            print(f"Auto-title task error: {exc}")

    # Save AI message to DB
    ai_message_id = ""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (%s, %s, %s) RETURNING id",
                (conversation_id, "assistant", full_response),
            )
            ai_message_id = str(cur.fetchone()["id"])
            cur.execute(
                "UPDATE conversations SET updated_at = NOW() WHERE id = %s",
                (conversation_id,),
            )

    # Memory extraction + summarization (fire-and-forget in background)
    asyncio.create_task(_background_tasks(user_id, conversation_id, user_message, full_response))

    done_payload = {
        "type": "done",
        "messageId": ai_message_id,
        "userMessageId": user_message_id,
    }
    if new_title:
        done_payload["title"] = new_title

    yield f"data: {json.dumps(done_payload)}\n\n"


async def _background_tasks(user_id: str, conversation_id: str, user_msg: str, ai_msg: str):
    try:
        loop = asyncio.get_event_loop()
        memories = await loop.run_in_executor(None, extract_memories, user_msg, ai_msg)
        if memories:
            await loop.run_in_executor(None, save_memories, user_id, memories)
        await loop.run_in_executor(None, maybe_summarize, conversation_id)
    except Exception as exc:
        print(f"Background task error: {exc}")


@router.post("/")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Verify conversation belongs to user
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM conversations WHERE id = %s AND user_id = %s",
                (req.conversation_id, user["user_id"]),
            )
            conversation = cur.fetchone()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation = dict(conversation)

    # Save user message
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (%s, %s, %s) RETURNING id",
                (req.conversation_id, "user", req.message.strip()),
            )
            user_message_id = str(cur.fetchone()["id"])

    # Build AI context
    memories_text = get_relevant_memories_text(user["user_id"])
    system_prompt = "You are a helpful, knowledgeable AI assistant. Be concise, accurate, and friendly."
    if memories_text:
        system_prompt += f"\n\nWhat you know about this user:\n{memories_text}"

    history = build_context(req.conversation_id, conversation.get("summary"))
    context_messages = [{"role": "system", "content": system_prompt}] + history

    # Count user messages to detect first message
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = %s AND role = 'user'",
                (req.conversation_id,),
            )
            count = cur.fetchone()["cnt"]

    is_first = count == 1  # just inserted, so 1 means first

    return StreamingResponse(
        event_stream(
            req.conversation_id,
            user["user_id"],
            req.message.strip(),
            user_message_id,
            context_messages,
            is_first,
            conversation.get("title", "New Chat"),
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
