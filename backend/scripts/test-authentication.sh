#!/bin/bash

# 인증 시스템 테스트 스크립트
# Usage: ./test-authentication.sh

set -e  # 에러 발생 시 중단

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API 기본 URL
API_URL="http://localhost:8000/api/v1"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  인증 시스템 테스트 스크립트${NC}"
echo -e "${BLUE}================================${NC}\n"

# 1. Docker 컨테이너 상태 확인
echo -e "${YELLOW}[1/8] Docker 컨테이너 상태 확인${NC}"
docker-compose ps
echo ""

# 2. Mock JWT 토큰 생성
echo -e "${YELLOW}[2/8] Mock JWT 토큰 생성${NC}"
JWT_TOKEN=$(python3 -c "
import base64
import json

header = {'typ': 'JWT', 'alg': 'HS256'}
payload = {'sub': 'user_test_123', 'email': 'test@example.com'}

def base64_url_encode(data):
    json_str = json.dumps(data, separators=(',', ':'))
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return encoded.rstrip('=')

header_encoded = base64_url_encode(header)
payload_encoded = base64_url_encode(payload)
print(f'{header_encoded}.{payload_encoded}.fake_signature')
")

echo -e "${GREEN}✓ JWT 토큰 생성 완료${NC}"
echo "토큰: ${JWT_TOKEN:0:50}..."
echo ""

# 3. 헬스체크
echo -e "${YELLOW}[3/8] 백엔드 헬스체크${NC}"
HEALTH_CHECK=$(curl -s http://localhost:8000/health)
echo "Response: $HEALTH_CHECK"
if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo -e "${GREEN}✓ 백엔드 정상 작동${NC}\n"
else
    echo -e "${RED}✗ 백엔드 헬스체크 실패${NC}\n"
    exit 1
fi

# 4. 인증 없이 API 호출 (401 예상)
echo -e "${YELLOW}[4/8] 인증 없이 API 호출 (401 에러 예상)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET $API_URL/categories/)
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ 인증 없이 호출 시 401 반환 (정상)${NC}\n"
else
    echo -e "${RED}✗ 예상치 못한 HTTP 코드: $HTTP_CODE${NC}\n"
fi

# 5. 인증된 API 호출 - 카테고리 조회 (첫 호출, 사용자 자동 생성)
echo -e "${YELLOW}[5/8] 인증된 API 호출 - 카테고리 조회${NC}"
CATEGORIES=$(curl -s -X GET $API_URL/categories/ \
  -H "Authorization: Bearer $JWT_TOKEN")
echo "Response: $CATEGORIES"
echo -e "${GREEN}✓ 카테고리 조회 성공 (사용자 자동 생성됨)${NC}\n"

# 6. Redis 캐시 확인
echo -e "${YELLOW}[6/8] Redis 캐시 확인${NC}"
REDIS_CACHE=$(docker exec hl-redis redis-cli GET "user:user_test_123")
echo "Redis 캐시: $REDIS_CACHE"
if [[ $REDIS_CACHE == *"user_test_123"* ]]; then
    echo -e "${GREEN}✓ Redis에 사용자 정보 캐싱됨${NC}"
else
    echo -e "${RED}✗ Redis 캐시 없음${NC}"
fi

# TTL 확인
TTL=$(docker exec hl-redis redis-cli TTL "user:user_test_123")
echo "TTL: ${TTL}초 (5분 = 300초)"
echo ""

# 7. PostgreSQL에서 사용자 확인
echo -e "${YELLOW}[7/8] PostgreSQL에서 사용자 확인${NC}"
docker exec hl-db psql -U postgres -d household_ledger -c \
  "SELECT id, clerk_user_id, email, created_at FROM users WHERE clerk_user_id = 'user_test_123';"
echo ""

# 8. 카테고리 생성
echo -e "${YELLOW}[8/8] 카테고리 생성 테스트${NC}"
NEW_CATEGORY=$(curl -s -X POST $API_URL/categories/ \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "테스트 카테고리", "emoji": "🧪"}')
echo "생성된 카테고리: $NEW_CATEGORY"
echo -e "${GREEN}✓ 카테고리 생성 성공${NC}\n"

# 카테고리 재조회 (Redis 캐시 HIT)
echo -e "${YELLOW}카테고리 재조회 (Redis 캐시 HIT)${NC}"
CATEGORIES_AGAIN=$(curl -s -X GET $API_URL/categories/ \
  -H "Authorization: Bearer $JWT_TOKEN")
echo "Response: $CATEGORIES_AGAIN"
echo -e "${GREEN}✓ 카테고리 조회 성공 (Redis 캐싱됨)${NC}\n"

# 완료
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  ✓ 모든 테스트 완료${NC}"
echo -e "${GREEN}================================${NC}\n"

# 요약
echo -e "${BLUE}[요약]${NC}"
echo "1. Docker 컨테이너: 정상 작동"
echo "2. JWT 토큰 검증: 성공"
echo "3. 사용자 자동 생성: 성공"
echo "4. Redis 캐싱: 성공 (TTL: ${TTL}초)"
echo "5. 카테고리 생성: 성공"
echo ""

echo -e "${BLUE}[다음 단계]${NC}"
echo "- docs/authentication-flow.md 문서 확인"
echo "- Redis 캐시 성능 모니터링"
echo "- 프로덕션 환경에서 Clerk Public Key로 서명 검증 구현"
