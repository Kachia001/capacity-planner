# Capacity Planner

Manufacturing Daily List 데이터를 Supabase/PostgreSQL에 저장하고, Nuxt 기반 웹 화면에서 작업/진행률/이슈 현황을 관리하는 서비스입니다.

## Stack

- Nuxt 4
- Vue Composition API
- shadcn-vue
- Tailwind CSS
- Pinia
- Supabase
- Drizzle ORM

## Data Safety

원본 엑셀, CSV, TSV, DB 덤프, 로컬 SQLite, 업로드 파일은 이 저장소에 절대 커밋하지 않습니다.

데이터는 Supabase/PostgreSQL에 저장하고, 프로젝트에는 스키마와 애플리케이션 코드만 둡니다. `.gitignore`가 `data/`, `uploads/`, `*.xlsx`, `*.csv`, `*.db`, `*.dump` 등을 차단합니다.

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

Supabase Docker 기본값을 쓰는 경우:

```env
NUXT_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

`NUXT_PUBLIC_SUPABASE_ANON_KEY`와 `NUXT_SUPABASE_SERVICE_ROLE_KEY`는 로컬 Supabase 출력값에서 채웁니다.

## Database

스키마는 `server/db/schema.ts`에 있습니다.

- `bay_templates`: 재사용 가능한 BAY 템플릿 메타데이터
- `bay_template_rows`: 템플릿에 속한 초기 작업 행
- `bays`: 실제 운영 BAY 메타데이터
- `work_items`: BAY에 속한 독립 작업 행, 품번, 품명, 업체, 이슈, 완료 상태, 작업자, 작업일

템플릿으로 BAY를 생성할 때 `bay_template_rows`를 `work_items`로 복사합니다. 생성된 BAY와 템플릿은 이후 서로 독립적으로 편집합니다.

Drizzle 명령:

```bash
pnpm db:generate
pnpm db:push
pnpm db:studio
```
