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


class KnowledgeBaseCreate(BaseModel):
    """创建知识库请求"""
    name: str = Field(..., min_length=1, max_length=128, description="知识库名称")
    description: str = Field(default="", max_length=1024, description="知识库描述")


class UpdateKnowledgeBaseRequest(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="知识库名称")
    description: Optional[str] = Field(default=None, max_length=1024, description="知识库描述")


class KnowledgeBaseResponse(BaseModel):
    """知识库响应"""
    id: str = Field(..., description="知识库ID")
    name: str = Field(..., description="知识库名称")
    description: str = Field(default="", description="知识库描述")
    document_count: int = Field(default=0, description="文档数量")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class KnowledgeDocumentResponse(BaseModel):
    """知识库文档响应"""
    id: str = Field(..., description="文档ID")
    knowledge_base_id: str = Field(..., description="知识库ID")
    filename: str = Field(..., description="文件名")
    content_type: str = Field(default="", description="MIME类型")
    size_bytes: int = Field(..., description="文件大小")
    status: str = Field(default="uploaded", description="文档状态")
    is_enabled: bool = Field(default=True, description="是否启用")
    uploaded_by: str = Field(default="current_user", description="上传人")
    source: str = Field(default="manual_upload", description="来源")
    tags: list[str] = Field(default_factory=list, description="标签")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class UploadKnowledgeDocumentsResponse(BaseModel):
    """上传文档响应"""
    uploaded: list[KnowledgeDocumentResponse] = Field(default_factory=list, description="上传成功的文档")


class KnowledgeDocumentListResponse(BaseModel):
    """知识库文档分页列表响应"""
    items: list[KnowledgeDocumentResponse] = Field(default_factory=list, description="文档列表")
    total: int = Field(default=0, description="总数")
    page: int = Field(default=1, description="当前页")
    page_size: int = Field(default=20, description="每页大小")


class UpdateKnowledgeDocumentRequest(BaseModel):
    """更新文档请求"""
    filename: Optional[str] = Field(default=None, min_length=1, max_length=255, description="文件名")
    is_enabled: Optional[bool] = Field(default=None, description="是否启用")


class UpdateKnowledgeDocumentTagsRequest(BaseModel):
    """更新文档标签请求"""
    tags: list[str] = Field(default_factory=list, description="标签列表")


class BatchDocumentOperationRequest(BaseModel):
    """批量文档操作请求"""
    operation: str = Field(..., description="操作类型: delete / enable / disable")
    document_ids: list[str] = Field(default_factory=list, description="文档ID列表")


class BatchDocumentOperationResponse(BaseModel):
    """批量文档操作响应"""
    affected: int = Field(default=0, description="受影响数量")


class DownloadDocumentResponse(BaseModel):
    """文档下载元数据"""
    filename: str = Field(..., description="文件名")
    content_type: str = Field(default="application/octet-stream", description="内容类型")


class PreviewDocumentResponse(BaseModel):
    """文档预览响应"""
    content: str = Field(..., description="预览内容")
