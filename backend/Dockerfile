FROM python:3.11-slim

# 메타데이터
LABEL maintainer="househole-ledger"
LABEL description="FastAPI backend for household ledger applicatoin"

# 환경변수 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# 시스템 패키지 설치 (최소한만)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 작업 디렉토리 설정
WORKDIR /app

# pip 업그레이드
RUN pip install --no-cache-dir --upgrade pip

# 의존성 파일 복사 및 설치 (캐시 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 권한 문제를 생각해서 root로 실행

# 애플리케이션 사용자 생성 (보안)
# RUN groupadd -r appuser && useradd -r -g appuser appuser

# 사용자 권한으로 실행
# USER appuser

# 포트 노출
EXPOSE 8000

# 볼륨 마운트로 코드 주입, 프로덕션에서는 COPY . . 사용

# 헬스체크
HEALTHCHECK --interval=30s --timeout=30s \
--start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# 애플리케이션 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]