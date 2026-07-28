# Capacity Planner

Manufacturing Daily List를 기반으로 BAY별 작업, 진행률, 작업자, 고소작업 및 이슈를 관리하는
웹 애플리케이션입니다.

Admin, Manager, Worker 역할에 따라 BAY와 템플릿 관리, 작업 시작과 완료, 관리자 교정,
운영 현황 조회 및 Telegram 이슈 알림 기능을 제공합니다.

## 주요 기능

- BAY 템플릿 및 운영 BAY 생성
- 작업 검색, 시작, 완료 및 상태 이력 관리
- 관리자용 BAY 진행률과 이슈 현황
- 고소작업 식별과 안전 정보 표시
- 역할 기반 사용자 및 권한 관리
- 운영 시간 제어
- Telegram 이슈 알림과 재시도 Outbox

## 기술 스택

### Frontend

- Nuxt 4
- Vue 3 Composition API
- TypeScript
- Pinia
- shadcn-vue / Reka UI
- Tailwind CSS 4
- Lucide Vue

### Backend

- Nuxt Nitro
- PostgreSQL / Supabase
- Supabase Auth
- Drizzle ORM
- Zod
- Nitro scheduled task

### Quality

- Vitest
- Vue TypeScript
- ESLint
- Prettier

## 로컬 실행

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

기본 개발 서버는 Nuxt 설정에 따라 실행됩니다. Supabase와 Telegram을 포함한 환경 변수 및
DB 설정은 [백엔드 문서](./DOCS/BACKEND.md)를 참고합니다.

## 주요 명령

```bash
pnpm dev
pnpm typecheck
pnpm test:run
pnpm build
```

## 문서

- [문서 안내](./DOCS/README.md)
- [프로젝트 정책](./DOCS/POLICY.md)
- [프론트엔드 및 디자인 시스템](./DOCS/FRONTEND.md)
- [백엔드 및 데이터베이스](./DOCS/BACKEND.md)
