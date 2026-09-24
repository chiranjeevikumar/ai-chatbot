"""Memories router: view, delete, clear user memories."""
from fastapi import APIRouter, HTTPException, Depends
from ..services.auth import get_current_user
from ..services.memory import get_user_memories, delete_memory, clear_all_memories, add_memory
from ..models.schemas import MemoryDelete, MemoryCreate

router = APIRouter(prefix="/memories", tags=["memories"])


@router.get("/")
def list_memories(user=Depends(get_current_user)):
    memories = get_user_memories(user["user_id"])
    return {"memories": memories}


@router.post("/", status_code=201)
def create_memory(req: MemoryCreate, user=Depends(get_current_user)):
    memory = add_memory(user["user_id"], req.memory, req.category, req.importance)
    return {"memory": memory}


@router.delete("/")
def remove_memories(req: MemoryDelete, user=Depends(get_current_user)):
    if req.clear_all:
        clear_all_memories(user["user_id"])
        return {"success": True, "message": "All memories cleared"}

    if req.memory_id:
        deleted = delete_memory(user["user_id"], req.memory_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Memory not found")
        return {"success": True}

    raise HTTPException(status_code=400, detail="Provide memory_id or clear_all=true")
