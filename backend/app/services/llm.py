"""
LLM 服务模块
支持多种 LLM 提供商，预留 LangChain 接口
"""
from typing import AsyncGenerator, Protocol

from app.core.config import settings
from app.services.mock_llm import mock_llm_service


class LLMServiceProtocol(Protocol):
    """LLM 服务协议（接口）"""
    
    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """流式返回内容"""
        ...


class OpenAILLMService:
    """OpenAI LLM 服务"""
    
    def __init__(self):
        # 延迟导入，避免在 Mock 模式下报错
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL
        )
    
    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """
        流式调用 OpenAI API
        
        Args:
            messages: 消息历史
            
        Yields:
            内容片段
        """
        # 转换消息格式
        openai_messages = [
            {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            for msg in messages
        ]
        
        response = await self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=openai_messages,
            stream=True,
        )
        
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


def get_llm_service() -> LLMServiceProtocol:
    """
    获取 LLM 服务实例
    根据配置返回对应的服务
    """
    if settings.MOCK_MODE:
        return mock_llm_service
    
    if settings.LLM_PROVIDER == "openai":
        return OpenAILLMService()
    
    # 默认返回 Mock 服务
    return mock_llm_service


# 预留 LangChain 集成接口
# class LangChainLLMService:
#     """LangChain LLM 服务（后续扩展）"""
#     
#     def __init__(self, chain):
#         self.chain = chain
#     
#     async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
#         async for chunk in self.chain.astream(messages):
#             yield chunk.content
