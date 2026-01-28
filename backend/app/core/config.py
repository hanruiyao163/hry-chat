"""
配置管理模块
从环境变量和 .env 文件读取配置
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用配置
    APP_NAME: str = "HRY Chat"
    DEBUG: bool = False
    
    # LLM 配置
    LLM_PROVIDER: str = "openai"  # openai / azure / anthropic / mock
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    
    # Mock 模式（用于 UI 测试）
    MOCK_MODE: bool = True
    
    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 全局配置实例
settings = get_settings()
