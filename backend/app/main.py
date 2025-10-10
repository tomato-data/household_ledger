from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import test_db_connection, engine, Base
from app.models import user, category, transaction, recurring_transaction

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


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    print("Starting up...")
    if test_db_connection():
        print("✅Database connection successful")
        # 테이블 생성
        if settings.debug:
            Base.metadata.create_all(bind=engine)
            print("✅Tables created successfully")
        else:
            print("✅Production mode: Tables not created")
    else:
        print("❌Database connection failed")


@app.get("/")
async def root():
    """루트 엔드포인트 - API가 정상 작동하는지 확인"""
    return {"message": "Household Ledger API is running"}


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트 - Docker container 상태 확인용"""
    return {"status": "healthy", "service": "hl-api"}
