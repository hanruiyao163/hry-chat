"""
配置路由
暴露部分安全配置给前端
"""
from fastapi import APIRouter

from app.core.config import settings
from app.models.schemas import ConfigResponse

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=ConfigResponse)
async def get_config():
    """
    获取应用配置
    
    返回可以安全暴露给前端的配置信息
    注意：不要暴露 API Key 等敏感信息
    """
    return ConfigResponse(
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        mock_mode=settings.MOCK_MODE,
        app_name=settings.APP_NAME
    )
