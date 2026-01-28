"""
会话管理路由
处理会话的 CRUD 操作
注：当前版本会话存储在前端 localStorage，此路由预留给后期数据库存储
"""
from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.schemas import Conversation

router = APIRouter(prefix="/conversations", tags=["conversations"])

# 临时内存存储（后期替换为数据库）
_conversations: dict[str, Conversation] = {}


@router.get("")
async def list_conversations() -> list[Conversation]:
    """获取所有会话列表"""
    return list(_conversations.values())


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str) -> Conversation:
    """获取单个会话详情"""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="会话不存在")
    return _conversations[conversation_id]


@router.post("")
async def create_conversation(conversation: Conversation) -> Conversation:
    """创建新会话"""
    _conversations[conversation.id] = conversation
    return conversation


@router.put("/{conversation_id}")
async def update_conversation(conversation_id: str, conversation: Conversation) -> Conversation:
    """更新会话"""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="会话不存在")
    _conversations[conversation_id] = conversation
    return conversation


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除会话"""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="会话不存在")
    del _conversations[conversation_id]
    return {"message": "删除成功"}
