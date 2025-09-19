from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 데이터베이스 엔진 생성
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.debug,  # 디버그 모드에서 SQL 쿼리 로깅
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성 (모든 모델의 부모 클래스)

Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성 주입 함수
    FastAPI의 Depends()와 함께 사용
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection():
    """데이터베이스 연결 테스트"""
    try:
        db = SessionLocal()
        # 간단한 쿼리로 연결 확인
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        print(f"데이터베이스 연결 실패:{e}")
        return False
