"""
Pydantic 模型定义
用于请求/响应数据验证
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    """单条消息"""
    id: str = Field(..., description="消息ID")
    role: str = Field(..., description="角色: user / assistant / system")
    content: str = Field(..., description="消息内容")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    
    # 引用相关（用于知识库功能）
    citations: Optional[list[dict]] = Field(default=None, description="引用列表")


class ChatRequest(BaseModel):
    """聊天请求"""
    messages: list[Message] = Field(..., description="消息历史")
    conversation_id: Optional[str] = Field(default=None, description="会话ID")
    
    # 可选参数
    temperature: float = Field(default=0.7, ge=0, le=2, description="温度参数")
    max_tokens: Optional[int] = Field(default=None, description="最大token数")


class ChatChunk(BaseModel):
    """流式响应的单个块"""
    content: str = Field(..., description="内容片段")
    done: bool = Field(default=False, description="是否完成")
    
    # 完成时附带的元数据
    message_id: Optional[str] = Field(default=None, description="完整消息ID")
    citations: Optional[list[dict]] = Field(default=None, description="引用列表")


class Conversation(BaseModel):
    """会话"""
    id: str = Field(..., description="会话ID")
    title: str = Field(default="新对话", description="会话标题")
    messages: list[Message] = Field(default_factory=list, description="消息列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class ConfigResponse(BaseModel):
    """配置响应（暴露给前端的安全配置）"""
    provider: str = Field(..., description="LLM提供商")
    model: str = Field(..., description="模型名称")
    mock_mode: bool = Field(..., description="是否为Mock模式")
    app_name: str = Field(..., description="应用名称")
