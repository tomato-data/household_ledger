from redis import asyncio as aioredis
from typing import Optional
import os


class RedisClient:
    """Redis 클라이언트 싱글톤"""

    _instance: Optional[aioredis.Redis] = None

    @classmethod
    async def get_instance(cls) -> aioredis.Redis:
        """Redis 인스턴스 가져오기 (싱글톤 패턴)"""
        if cls._instance is None:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            cls._instance = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return cls._instance

    @classmethod
    async def close(cls):
        """Redis 연결 종료"""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None


# 편의 함수
async def get_redis() -> aioredis.Redis:
    """FastAPI 의존성 주입용"""
    return await RedisClient.get_instance()
