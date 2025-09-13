from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정 클래스"""

    # 앱 기본 설정
    app_name: str = "Household Ledger API"
    app_version: str = "1.0.0"
    debug: bool = False

    # 데이터베이스 설정
    database_url: str

    # CORS 설정
    allowed_origins: List[str] = ["http://localhost:5173"]

    # Clerk 인증 설정
    clerk_publishable_key: str = ""
    clerk_secret_key: str = ""

    # 환경 구분
    environment: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
