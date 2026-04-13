# docs — household_ledger

> Claude가 작성한 Phase 스펙·가이드·백엔드 상태 문서. 사용자 산출물(Q&A·회고·심화)은 `../learnings/`.

## 구조

- `backend-overview.md` — 현재 Rails 백엔드 상태 스냅샷 (라우팅·모델·컨트롤러·Gem·TODO)
- `phases/` — 앞으로 학습 단위로 쪼갤 Phase 스펙 (현재 비어 있음)
- `plans/` — `/tdd-plan` 등 설계 문서 (선택)

## 프로젝트 배경

React + FastAPI 로 시작한 가계부 프로젝트를 Rails 8로 재작성한 이력이 있음. 재작성 서사와 Rails 학습 과정은 [../learnings/retrospectives/rails-migration.md](../learnings/retrospectives/rails-migration.md)에 있다.

## 앞으로 할 일

- Rails 8 학습을 Phase 단위로 쪼개 `phases/phase01-*.md` 작성
- 각 Phase 완료 시 `learnings/retrospectives/phaseNN-*.md` 회고 남기기
