"""AI service using OpenRouter (compatible with openai>=1.x and >=3.x)."""
import os
import json
import httpx
from typing import AsyncGenerator, Optional
from ..config import get_settings

settings = get_settings()

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_HEADERS = {
    "Authorization": f"Bearer {settings.openrouter_api_key}",
    "HTTP-Referer": settings.frontend_url,
    "X-Title": "AI Chatbot",
    "Content-Type": "application/json",
}


def get_completion(messages: list[dict], max_tokens: int = 2000, temperature: float = 0.7) -> str:
    """Synchronous non-streaming completion via raw HTTPX."""
    payload = {
        "model": settings.ai_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(f"{OPENROUTER_BASE}/chat/completions", headers=_HEADERS, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"] or ""


async def get_stream(
    messages: list[dict],
    max_tokens: int = 2000,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """Async streaming completion — yields text chunks."""
    payload = {
        "model": settings.ai_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", f"{OPENROUTER_BASE}/chat/completions", headers=_HEADERS, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    content = chunk["choices"][0]["delta"].get("content")
                    if content:
                        yield content
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


def extract_memories(user_message: str, ai_response: str) -> list[str]:
    """Extract long-term useful facts about the user from a conversation turn."""
    prompt = f"""Analyze this conversation and extract any important, long-term facts about the user.

User said: "{user_message}"
AI responded: "{ai_response}"

Rules:
- Only extract genuinely useful personal facts (profession, skills, preferences, goals)
- Do NOT extract: passwords, API keys, payment info, or any sensitive data
- Do NOT extract temporary or context-specific info
- Return an empty JSON array if nothing important
- Return ONLY a valid JSON array of short strings

Example: ["User is an AI/ML engineer", "User works primarily with Python"]
"""
    try:
        content = get_completion([{"role": "user", "content": prompt}], max_tokens=300, temperature=0.2)
        start, end = content.find("["), content.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        memories = json.loads(content[start:end])
        return [m for m in memories if isinstance(m, str) and len(m.strip()) >= 5]
    except Exception:
        return []


def generate_title(first_message: str) -> str:
    """Generate a short conversation title from the first user message."""
    try:
        content = get_completion(
            [{"role": "user", "content": f'Generate a concise, catchy 3-5 word title for a conversation starting with:\n"{first_message[:250]}"\n\nReturn ONLY the title text. Do not wrap in quotes or add periods.'}],
            max_tokens=50,
            temperature=0.3,
        )
        cleaned = content.strip().strip('"\'*#')
        if cleaned and len(cleaned) <= 60 and cleaned.lower() != "new chat":
            return cleaned
    except Exception:
        pass

    # Reliable fallback based on user's first words
    words = first_message.strip().split()[:5]
    fallback = " ".join(words)
    if len(fallback) > 35:
        fallback = fallback[:35].rsplit(" ", 1)[0]
    return fallback.strip().title() or "New Chat"


def summarize_conversation(messages: list[dict], existing_summary: Optional[str] = None) -> str:
    """Produce or update a conversation summary."""
    text = "\n\n".join(
        f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}"
        for m in messages if m.get("role") != "system"
    )
    if existing_summary:
        prompt = f"Update this summary with new messages:\n\nCurrent summary: {existing_summary}\n\nNew messages:\n{text}\n\nWrite an updated concise summary (3-5 sentences)."
    else:
        prompt = f"Summarize this conversation in 3-5 sentences:\n\n{text}"

    try:
        return get_completion([{"role": "user", "content": prompt}], max_tokens=300, temperature=0.3)
    except Exception:
        return existing_summary or ""


def generate_shared_summary(messages: list[dict]) -> str:
    """Generate a structured summary for a shared conversation."""
    text = "\n\n".join(
        f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}"
        for m in messages if m.get("role") != "system"
    )
    prompt = f"""Analyze this conversation and provide a structured summary:

{text}

Format your response exactly like this:
**Main Topic:** [what the conversation is primarily about]

**Key Points:**
• [point 1]
• [point 2]
• [point 3]

**Important Decisions/Conclusions:**
• [decision or conclusion]

**Open Questions:**
• [any unresolved questions, or "None" if all resolved]"""

    return get_completion([{"role": "user", "content": prompt}], max_tokens=600, temperature=0.3)
