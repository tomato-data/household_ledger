from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    description="React-based household ledger application backend",
    version=settings.app_version,
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,  # 프로덕션에서는 문서 비활성화
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,  # frontend url
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)


@app.get("/")
async def root():
    """루트 엔드포인트 - API가 정상 작동하는지 확인"""
    return {"message": "Household Ledger API is running"}


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트 - Docker container 상태 확인용"""
    return {"status": "healthy", "service": "hl-api"}
