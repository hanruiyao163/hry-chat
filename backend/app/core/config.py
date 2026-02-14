"""
配置管理模块
从环境变量和 .env 文件读取配置
"""

from pydantic_settings import SettingsConfigDict
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 应用配置
    APP_NAME: str = "HRY Chat"
    DEBUG: bool = False

    # LLM 配置
    LLM_PROVIDER: str
    LLM_API_KEY: str
    LLM_BASE_URL: str
    EMBEDDING_MODEL: str
    CHAT_MODEL: str
    LLM_BASE_URL: str

    # Mock 模式（用于 UI 测试）
    MOCK_MODE: bool = True

    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # 对象存储
    BUCKET_NAME: str
    ENDPOINT_URL: str
    ACCESS_KEY_ID: str
    SECRET_ACCESS_KEY: str

    # postgres
    POSTGRES_URL: str

    # milvus
    ZILLIZ_URI: str
    ZILLIZ_TOKEN: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 全局配置实例
settings = get_settings()
