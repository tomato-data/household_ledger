# 개발 명령어

## Rails 서버

```bash
bin/dev                  # 개발 서버 (Procfile.dev — Rails + Tailwind watch)
bin/rails server         # Rails 서버만
bin/rails console        # 콘솔
bin/rails db:migrate     # 마이그레이션
bin/rails db:reset       # DB 초기화
bin/rails routes         # 라우트 확인
bin/rails test           # 테스트
```

## 코드 생성

```bash
bin/rails generate model ModelName field:type
bin/rails generate controller ControllerName action1 action2
bin/rails generate migration AddFieldToTable field:type
```

## Rails Convention 참고

- **Convention over Configuration** — 모델 `Transaction`(단수·CamelCase) → 테이블 `transactions`(복수·snake_case) · 컨트롤러 `TransactionsController` → `transactions_controller.rb`
- **RESTful 7 actions** — index · show · new · create · edit · update · destroy
- **Strong Parameters** — 허용 필드를 명시해 매스 어사인먼트를 막는다
- **Callbacks** — `before_action` · `after_create` 로 공통 로직
- **Scopes** — 자주 쓰는 쿼리는 모델에 scope 로
