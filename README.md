# 🚀 AI Chatbot — Full-Stack Production Application

A full-stack, ChatGPT-style web application built with a **Next.js** frontend, a high-performance **Python (FastAPI)** backend, **Layerbase PostgreSQL** for persistence, and **OpenRouter** for AI models with real-time streaming.

---

## ✨ Features

- **⚡ Real-Time Streaming Responses**: Token-by-token streaming using Server-Sent Events (SSE).
- **💬 Conversation Management**:
  - Create new chats
  - Search conversation history
  - Rename conversations inline
  - Delete conversations with confirmation
  - Automatic descriptive title generation based on first message
- **🧠 Cross-Conversation Long-Term Memory**:
  - Automatically identifies and saves user preferences, goals, and facts
  - Dedicated **Memory Manager** modal to view, add, and clear memories
  - Automatically injects memories as context into future conversations
- **🔗 Shareable Chat Links**:
  - Generate public links to share conversations
  - Public read-only view with AI conversation summarizer
- **👍 Feedback System**:
  - Like / Dislike responses with immediate feedback
  - One-click markdown and code-block copying with copy confirmation
- **🔐 Secure Authentication**:
  - Email & password registration and login with bcrypt hashing & JWT tokens
- **🎨 Modern Dark Glassmorphic Design**:
  - Violet/indigo gradient aesthetic with smooth transitions and micro-animations

---

## 🏗️ Architecture

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   Next.js 16 (App Router)      │  HTTP   │      Python 3.11 (FastAPI)     │
│   Tailwind CSS / Lucide Icons  │───────▶ │   Uvicorn / Pydantic / Jose    │
│   http://localhost:3000        │ ◀──SSE──│   http://127.0.0.1:8000        │
└────────────────────────────────┘         └───────────────┬────────────────┘
                                                           │
                                   ┌───────────────────────┴───────────────────────┐
                                   ▼                                               ▼
                     ┌───────────────────────────┐                   ┌───────────────────────────┐
                     │    Layerbase PostgreSQL   │                   │      OpenRouter API       │
                     │  Conversations, Messages, │                   │    openrouter/auto or     │
                     │   Memories, Feedback      │                   │    custom LLM models      │
                     └───────────────────────────┘                   └───────────────────────────┘
```

---

## 🛠️ Project Structure

```
chatbot/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── models/           # Pydantic schemas
│   │   ├── routers/          # auth, conversations, chat, feedback, memories, share
│   │   ├── services/         # ai, auth, context, memory
│   │   ├── config.py         # App configuration & .env loader
│   │   ├── database.py       # PostgreSQL pool & auto-schema migrations
│   │   └── main.py           # FastAPI entrypoint & CORS
│   ├── .env                  # Backend secrets & DB connection string
│   └── requirements.txt      # Python dependencies
│
├── src/                      # Next.js Frontend
│   ├── app/
│   │   ├── chat/             # Main interactive chat interface
│   │   ├── login/            # Login page
│   │   ├── signup/           # Signup page
│   │   ├── share/[token]/    # Public shareable conversation viewer
│   │   ├── globals.css       # Tailwind CSS & glassmorphism utilities
│   │   └── layout.tsx        # Auth provider & root layout
│   ├── components/           # Sidebar, Message, MessageInput, ShareButton, MemoryManager
│   ├── contexts/             # AuthContext (JWT management)
│   └── hooks/                # useApi (Fetch & SSE helpers)
│
├── .env.local                # Frontend environment configuration
└── package.json              # Next.js dependencies & scripts
```

---

## 🚀 Quickstart (Local Windows Setup)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **Python**: 3.10+ (tested on Python 3.11)

### 2. Configure Backend Environment
Edit `backend/.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=openrouter/auto
DATABASE_URL=postgresql://postgres:<password>@<host>/<database>?sslmode=require
SECRET_KEY=your_secure_random_jwt_secret_key_at_least_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### 3. Install Backend Dependencies & Start FastAPI
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database schema and indexes are automatically verified and created upon startup.*

### 4. Configure Frontend Environment
Edit `.env.local` in `chatbot/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Install Frontend Dependencies & Start Next.js
In a separate terminal:
```powershell
cd chatbot
npm install
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🌐 Deployment Guide

### Deploying Frontend to Vercel
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), import your repository and select the `chatbot` folder as the root directory.
3. Configure the Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed FastAPI backend URL (e.g. `https://my-backend.railway.app`)
   - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (e.g. `https://my-chatbot.vercel.app`)
4. Click **Deploy**.

### Deploying Backend (Railway, Render, Fly.io, or VPS)
1. Deploy the `backend/` directory as a Python application.
2. Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Set the environment variables in your hosting provider's dashboard matching `backend/.env`.

---

## 📋 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user and obtain JWT token |
| `GET` | `/api/conversations/` | List conversations (with `?search=` filter) |
| `POST` | `/api/conversations/` | Create new conversation |
| `GET` | `/api/conversations/{id}` | Get conversation metadata |
| `PATCH` | `/api/conversations/{id}` | Rename conversation or toggle sharing |
| `DELETE` | `/api/conversations/{id}` | Delete conversation and messages |
| `GET` | `/api/conversations/{id}/messages` | List all messages for a conversation |
| `POST` | `/api/chat/` | Send message and receive SSE stream |
| `POST` | `/api/feedback/` | Submit like / dislike for a message |
| `DELETE` | `/api/feedback/` | Remove feedback |
| `GET` | `/api/memories/` | List user memories |
| `POST` | `/api/memories/` | Manually add a user memory |
| `DELETE` | `/api/memories/` | Delete single memory or clear all |
| `GET` | `/api/share/{token}` | Public view of shared conversation |
| `POST` | `/api/share/{token}/summarize` | AI summary of shared conversation |
