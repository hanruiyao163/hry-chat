"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import chat, config, conversation

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="AI 对话后端服务",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(conversation.router, prefix="/api")


@app.get("/")
async def root():
    """根路径 - 健康检查"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "status": "healthy",
        "mock_mode": settings.MOCK_MODE
    }


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
