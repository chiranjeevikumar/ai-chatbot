"""Feedback router: like / dislike AI messages."""
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_db
from ..services.auth import get_current_user
from ..models.schemas import FeedbackRequest, FeedbackDelete

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/")
def set_feedback(req: FeedbackRequest, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            # Upsert: handles switching between like/dislike
            cur.execute(
                """INSERT INTO message_feedback (message_id, user_id, feedback)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (message_id, user_id)
                   DO UPDATE SET feedback = EXCLUDED.feedback, created_at = NOW()""",
                (req.message_id, user["user_id"], req.feedback),
            )
    return {"success": True}


@router.delete("/")
def remove_feedback(req: FeedbackDelete, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM message_feedback WHERE message_id = %s AND user_id = %s RETURNING id",
                (req.message_id, user["user_id"]),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True}
