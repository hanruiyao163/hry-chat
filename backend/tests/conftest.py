import pytest
from fastapi.testclient import TestClient
from app.core.config import get_settings

@pytest.fixture(scope="session")
def settings():
    """获取测试环境配置"""
    settings = get_settings()
    # 可以在这里强制修改某些测试参数
    settings.MOCK_MODE = True
    return settings