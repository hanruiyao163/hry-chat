"""
聊天路由
处理对话相关的 API 请求
"""
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.models.schemas import ChatRequest, ChatChunk, Message
from app.services.llm import get_llm_service
from app.services.mock_llm import MOCK_CITATIONS

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def chat(request: ChatRequest):
    """
    聊天接口 - 流式响应
    
    使用 SSE (Server-Sent Events) 推送消息片段
    """
    llm_service = get_llm_service()
    message_id = str(uuid.uuid4())
    
    async def generate():
        """生成流式响应"""
        full_content = ""
        
        try:
            # 转换消息格式
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            async for chunk in llm_service.stream(messages):
                full_content += chunk
                data = ChatChunk(content=chunk, done=False)
                yield {
                    "event": "message",
                    "data": data.model_dump_json()
                }
            
            # 发送完成信号
            # 如果是 Mock 模式，附带引用数据
            citations = None
            if settings.MOCK_MODE:
                # 解析内容中的引用
                citations = _extract_citations(full_content)
            
            done_data = ChatChunk(
                content="",
                done=True,
                message_id=message_id,
                citations=citations
            )
            yield {
                "event": "message",
                "data": done_data.model_dump_json()
            }
            
        except Exception as e:
            error_data = {"error": str(e)}
            yield {
                "event": "error",
                "data": json.dumps(error_data)
            }
    
    return EventSourceResponse(generate())


def _extract_citations(content: str) -> list[dict]:
    """
    从内容中提取引用标注
    支持 [^数字] 和 [[文本]] 格式
    """
    import re
    
    citations = []
    seen_ids = set()
    
    # 匹配 [^数字] 格式
    footnote_pattern = r'\[\^(\d+)\]'
    for match in re.finditer(footnote_pattern, content):
        ref_id = match.group(1)
        if ref_id not in seen_ids and ref_id in MOCK_CITATIONS:
            citations.append(MOCK_CITATIONS[ref_id])
            seen_ids.add(ref_id)
    
    # 匹配 [[文本]] 格式
    bracket_pattern = r'\[\[([^\]]+)\]\]'
    for match in re.finditer(bracket_pattern, content):
        ref_name = match.group(1)
        if ref_name not in seen_ids and ref_name in MOCK_CITATIONS:
            citations.append(MOCK_CITATIONS[ref_name])
            seen_ids.add(ref_name)
    
    return citations


@router.post("/complete")
async def chat_complete(request: ChatRequest) -> Message:
    """
    聊天接口 - 非流式响应
    
    一次性返回完整响应（用于不需要流式的场景）
    """
    llm_service = get_llm_service()
    message_id = str(uuid.uuid4())
    
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]
    
    full_content = ""
    async for chunk in llm_service.stream(messages):
        full_content += chunk
    
    citations = None
    if settings.MOCK_MODE:
        citations = _extract_citations(full_content)
    
    return Message(
        id=message_id,
        role="assistant",
        content=full_content,
        created_at=datetime.now(),
        citations=citations
    )
