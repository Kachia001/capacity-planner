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
- 최고 관리자용 사이트 로고 업로드, 최적화 및 변경

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
- PostgreSQL
- Argon2id 비밀번호 인증 / HttpOnly 쿠키 세션
- Drizzle ORM
- Zod
- Nitro scheduled task

### Quality

- Vitest
- Vue TypeScript
- ESLint
- Prettier

## 로컬 실행

현재 로컬 개발 환경은 기존 Supabase Docker 스택의 PostgreSQL 컨테이너만 DB로 사용합니다.
애플리케이션은 Supabase Auth, REST, Storage 등에 연결하지 않으며 Supabase 패키지도
사용하지 않습니다. 일반 PostgreSQL을 직접 설치한 환경에서도 연결 문자열만 변경하면
동일하게 실행할 수 있습니다.

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm auth:seed-test-users
pnpm dev
```

로컬 테스트 계정은 `admin`, `manager`, `worker`이며 비밀번호는 모두 `123123`입니다.
테스트 계정 시드는 로컬 호스트 DB에서만 실행됩니다.

별도 초기 관리자가 필요하면 `auth:create-admin`을 사용합니다. 기본 로그인 ID `admin`의
비밀번호를 터미널에서 안전하게 입력받습니다.
다른 ID와 이름을 사용하려면 `pnpm auth:create-admin admin01 "관리자"`처럼 실행합니다.
환경 변수와 DB 설정은 [백엔드 문서](./DOCS/BACKEND.md)를 참고합니다.

### 로고 파일 저장 경로

업로드된 로고는 기본적으로 애플리케이션 실행 디렉터리의 `data/logos`에 저장됩니다.
일반 서버에서는 재배포 후에도 유지되고 애플리케이션 프로세스가 쓸 수 있는 경로를
`NUXT_LOGO_STORAGE_DIR`에 지정하세요. 디렉터리는 최초 업로드 시 자동 생성됩니다.

```dotenv
NUXT_LOGO_STORAGE_DIR=D:\capacity-planner-data\logos
```

데이터베이스와 함께 이 디렉터리도 정기 백업해야 합니다.

## 주요 명령

```bash
pnpm dev
pnpm db:migrate
pnpm auth:create-admin
pnpm auth:seed-test-users
pnpm typecheck
pnpm test:run
pnpm build
```

## 문서

- [문서 안내](./DOCS/README.md)
- [프로젝트 정책](./DOCS/POLICY.md)
- [프론트엔드 및 디자인 시스템](./DOCS/FRONTEND.md)
- [백엔드 및 데이터베이스](./DOCS/BACKEND.md)
