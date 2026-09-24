@echo off
echo Starting AI Chatbot Backend (FastAPI/Python)...
cd /d "%~dp0backend"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
