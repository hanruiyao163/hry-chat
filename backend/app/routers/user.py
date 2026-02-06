from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/user",
    tags=["user"],
    responses={404: {"description": "Not found"}},
)

class UserSettings(BaseModel):
    theme: Optional[str] = "system"
    language: Optional[str] = "zh"
    notifications: Optional[bool] = True

class UserProfile(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: UserSettings

# 模拟数据库
fake_user_db = {
    "current": {
        "id": "user_001",
        "username": "User",
        "email": "user@example.com",
        "avatar_url": None,
        "settings": {
            "theme": "system",
            "language": "zh",
            "notifications": True
        }
    }
}

@router.get("/profile", response_model=UserProfile)
async def get_user_profile():
    """获取当前用户资料"""
    return fake_user_db["current"]

@router.patch("/settings", response_model=UserSettings)
async def update_user_settings(settings: UserSettings):
    """更新用户设置"""
    # 这里应该有数据库更新逻辑
    current_settings = fake_user_db["current"]["settings"]
    update_data = settings.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        current_settings[key] = value
        
    return current_settings
