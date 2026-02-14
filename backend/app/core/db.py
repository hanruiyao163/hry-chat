"""
数据库连接池管理
"""

import asyncpg

_pool: asyncpg.Pool | None = None


async def init_db_pool(database_url: str) -> asyncpg.Pool:
    """初始化全局数据库连接池"""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=database_url,
            min_size=1,
            max_size=10,
            command_timeout=30,
        )
    return _pool


async def close_db_pool() -> None:
    """关闭全局数据库连接池"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_db_pool() -> asyncpg.Pool:
    """获取全局数据库连接池"""
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool
