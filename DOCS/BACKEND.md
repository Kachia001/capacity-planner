# 백엔드 및 데이터베이스 아키텍처

## 기술 구성

- Nuxt Nitro
- TypeScript
- PostgreSQL
- Drizzle ORM / Drizzle Kit
- Argon2id 비밀번호 인증 / HttpOnly 쿠키 세션
- Zod 기반 API contract
- Nitro scheduled task

## 아키텍처

백엔드는 modular monolith입니다. 기능 경계는 controller, application service, domain,
repository port 및 infrastructure adapter로 구성합니다.

```text
Nitro route
  → Controller
    → Application Service
      → Domain Aggregate
      → Repository Port
        ← Infrastructure Adapter
```

### 의존성 방향

- Domain은 Nitro, Drizzle 및 Vue를 import하지 않습니다.
- Controller는 HTTP 입력 파싱, 인증 정보 추출 및 응답 변환을 담당합니다.
- Application service는 use case와 transaction 경계를 조정합니다.
- Aggregate는 상태 전이와 비즈니스 권한을 검증합니다.
- Repository interface는 내부 port이며 Drizzle 구현체가 이를 구현합니다.
- `server/bootstrap/backend-context.ts`가 constructor injection을 구성하는 composition root입니다.
- `WorkExecutionUnitOfWork` 내부 repository는 하나의 DB transaction을 공유합니다.

## 디렉터리 책임

```text
server/
├─ api/                     Nitro route adapter
├─ bootstrap/               composition root
├─ db/
│  ├─ schema.ts             Drizzle schema
│  └─ migrations/           SQL migration
├─ modules/
│  └─ work-execution/
│     ├─ controller/        HTTP와 application 경계
│     ├─ service/           use case
│     ├─ domain/            aggregate와 domain error
│     ├─ repository/        repository port와 unit of work
│     └─ infrastructure/    Drizzle 및 외부 시스템 adapter
├─ presentation/            공통 HTTP 처리와 오류 매핑
├─ shared/                  서버 공통 오류 등
├─ tasks/                   Nitro scheduled task
└─ utils/                   인증, DB, Telegram 및 운영 정책 유틸리티

shared/api/                 클라이언트와 서버가 공유하는 API contract
```

## 공유 API Contract

request와 response contract는 `shared/api`에 둡니다. Vue 애플리케이션과 Nitro controller가
`#shared` alias로 같은 contract를 사용합니다.

포함할 수 있는 항목:

- Zod request/response schema
- 공개 request/response type
- 안정적인 API error code

포함하지 않는 항목:

- Domain aggregate 또는 domain event
- Drizzle row type
- Repository interface
- Nitro runtime object

Persistence row, domain aggregate, application result 및 public API response는 별도 모델로
유지하고 명시적인 mapper로 연결합니다.

## Work Execution Context

`server/modules/work-execution`은 작업 실행 bounded context입니다.

- 작업 시작
- 작업 완료
- 잘못된 시작 취소
- 완료 작업 복원
- 작업 무효화
- 작업 이슈 등록과 Telegram Outbox 생성

모든 mutation은 `work_items.version`을 이용한 optimistic concurrency를 사용합니다. 작업 행
변경, 상태 감사 이벤트 및 필요한 Outbox 쓰기는 동일한 Drizzle transaction에서 commit합니다.

## API

### 인증 및 사용자

| Method | Path               | 설명                     |
| ------ | ------------------ | ------------------------ |
| POST   | `/api/auth/login`  | 로그인 및 세션 쿠키 발급 |
| POST   | `/api/auth/logout` | 세션 쿠키 제거           |
| GET    | `/api/me`          | 현재 애플리케이션 사용자 |
| GET    | `/api/users`       | 사용자 목록              |
| POST   | `/api/users`       | 사용자 생성              |

### BAY와 템플릿

| Method | Path                              | 설명                             |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/api/bay-templates`              | Admin/Manager용 BAY 템플릿 목록  |
| POST   | `/api/bay-templates`              | Admin/Manager용 BAY 템플릿 생성  |
| GET    | `/api/bays`                       | BAY 목록                         |
| POST   | `/api/bays`                       | Admin/Manager의 BAY 생성         |
| GET    | `/api/packing-list-templates`     | Admin/Manager용 패킹 템플릿 목록 |
| POST   | `/api/packing-list-templates`     | Admin/Manager용 패킹 템플릿 생성 |
| PUT    | `/api/packing-list-templates/:id` | Admin/Manager용 패킹 템플릿 수정 |
| DELETE | `/api/packing-list-templates/:id` | 패킹 템플릿 보관 처리            |
| GET    | `/api/bays/:id/packing-list`      | BAY 패킹리스트 조회              |
| POST   | `/api/bays/:id/packing-list`      | 기존 BAY에 패킹리스트 할당       |
| PUT    | `/api/bays/:id/packing-list`      | Admin/Manager 패킹리스트 저장    |
| GET    | `/api/bays/:id/work-items`        | BAY의 작업 검색과 필터           |
| GET    | `/api/dashboard/bays`             | Manager/Admin용 BAY 집계         |

### 작업 실행

| Method | Path                                         | 설명             |
| ------ | -------------------------------------------- | ---------------- |
| GET    | `/api/work-items`                            | 작업 검색        |
| POST   | `/api/work-items/:id/start`                  | 작업 시작        |
| POST   | `/api/work-items/:id/complete`               | 작업 완료        |
| POST   | `/api/work-items/:id/cancel-start`           | 잘못된 시작 취소 |
| POST   | `/api/work-items/:id/restore-completed`      | 완료 작업 복원   |
| POST   | `/api/work-items/:id/void`                   | 작업 무효화      |
| POST   | `/api/work-items/:id/issue`                  | 이슈 등록        |
| PATCH  | `/api/work-items/:id/issues/:issueId`        | 이슈 내용 수정   |
| PATCH  | `/api/work-items/:id/issues/:issueId/status` | 이슈 상태 변경   |

### 운영 제어

| Method | Path                     | 설명                          |
| ------ | ------------------------ | ----------------------------- |
| GET    | `/api/operations/status` | 현재 운영 가능 상태           |
| POST   | `/api/operations/open`   | 운영 시간 연장 또는 수동 오픈 |
| POST   | `/api/operations/close`  | 운영 수동 종료                |

`POST /api/operations/open`은 `extensionMinutes` 또는 ISO 8601 형식의
`extensionUntil` 중 하나를 받습니다. 두 필드는 함께 전송할 수 없으며, 정규 운영 시간
외에는 하나가 필수입니다. 종료 시각은 현재보다 미래이고 요청 시점에서 최대 24시간
이내여야 합니다.

### Telegram

| Method | Path                                       | 설명               |
| ------ | ------------------------------------------ | ------------------ |
| GET    | `/api/admin/telegram-settings`             | 마스킹된 설정 조회 |
| PUT    | `/api/admin/telegram-settings`             | 설정 저장          |
| DELETE | `/api/admin/telegram-settings`             | 설정 제거          |
| POST   | `/api/admin/telegram-settings/test`        | 테스트 메시지 전송 |
| GET    | `/api/admin/telegram-deliveries`           | 전송 이력 조회     |
| POST   | `/api/admin/telegram-deliveries/:id/retry` | 실패 건 재시도     |
| POST   | `/api/admin/telegram-deliveries/process`   | 대기 건 수동 처리  |

### 서버 로그

| Method | Path                                | 설명                                    |
| ------ | ----------------------------------- | --------------------------------------- |
| GET    | `/api/admin/application-logs`       | 필터와 커서를 사용하는 서버 로그 조회   |
| POST   | `/api/admin/application-logs/purge` | 특정 시각 이전 또는 전체 서버 로그 삭제 |

서버 로그 API는 Admin만 사용할 수 있습니다. 전체 삭제는 `DELETE_ALL_LOGS` 확인 문자열을
요구하며, 삭제 완료 후 삭제 행위 자체를 새 로그로 남깁니다.

모든 route는 controller 또는 공통 HTTP handler로 입력 검증, 인증, 오류 매핑을 일관되게
처리해야 합니다.

## 인증과 권한

- 서버는 Argon2id로 `app_users.password_hash`를 검증합니다.
- 로그인 성공 시 12시간 유효한 서명 세션을 HttpOnly, SameSite 쿠키로 발급합니다.
- API는 세션의 사용자 UUID와 `auth_version`을 DB에서 다시 확인합니다.
- 비밀번호 변경 또는 계정 비활성화 시 `auth_version`을 증가시켜 기존 세션을 무효화합니다.
- 애플리케이션은 역할별 계정 잠금을 적용하지 않으며, 로그인 요청 제한은 CloudFront에서 처리합니다.
- UI의 역할 제어와 관계없이 API에서 역할을 다시 검증합니다.
- 권한 부족은 인증 실패와 구분되는 안정적인 HTTP 상태 및 error code로 반환합니다.

## 데이터베이스

스키마의 단일 기준은 `server/db/schema.ts`입니다. migration은
`server/db/migrations`에서 순서대로 관리합니다.

### Enum

| Enum                       | 값                                                          |
| -------------------------- | ----------------------------------------------------------- |
| `app_role`                 | `admin`, `manager`, `worker`                                |
| `work_status`              | `not_started`, `in_progress`, `completed`                   |
| `work_item_event_action`   | `start`, `complete`, `cancel_start`, `void`, `restore`      |
| `work_item_issue_category` | `material_shortage`, `work_delay`, `quality_issue`, `other` |
| `work_item_issue_status`   | `unconfirmed`, `in_review`, `resolved`                      |
| `telegram_delivery_status` | `pending`, `processing`, `sent`, `failed`, `skipped`        |

### 테이블

#### `app_users`

인증 정보와 애플리케이션 역할을 하나의 테이블에서 관리합니다.

- PK: `auth_user_id`
- 주요 필드: `email`, `password_hash`, `display_name`, `role`, `is_active`
- 세션 무효화: `auth_version`
- 로그인 기록: `last_login_at` (`failed_login_count`, `locked_until`은 기존 데이터 호환을 위해 유지하며 로그인 시 초기화합니다.)
- `created_by`는 `app_users.auth_user_id` 자기 참조 FK입니다.

#### `bay_templates`

재사용 가능한 BAY 템플릿의 메타데이터입니다.

- 주요 필드: `name`, `description`, `revision`, `is_archived`

#### `bay_template_rows`

템플릿에 포함되는 초기 작업 행입니다.

- FK: `template_id → bay_templates.id`
- 주요 필드: 정렬 순서, 작업명과 상세, 업체, 품번, 품명, bolt, 고소작업, 안전 메모
- 템플릿 삭제 시 행은 cascade 삭제합니다.
- `(template_id, sort_order)`는 unique입니다.

#### `bays`

실제 운영 BAY입니다.

- 주요 필드: `code`, `description`, `status`
- `code`는 unique입니다.

#### 패킹리스트 템플릿

- `packing_list_templates`, `packing_list_template_sections`, `packing_list_template_rows`로
  템플릿의 섹션과 기본 행을 관리합니다.
- 템플릿의 하위 데이터는 cascade 삭제하며 템플릿 내 순서는 unique로 보장합니다.
- Admin과 Manager는 전용 패킹 리스트 관리 화면에서 템플릿을 생성, 복제, 수정 및 보관할
  수 있습니다.
- 템플릿 수정은 `revision`을 비교해 동시에 수정된 내용을 덮어쓰지 않으며, 삭제는
  `is_archived`를 변경하는 보관 방식으로 처리합니다.

#### BAY 패킹리스트

- `bay_packing_lists`, `bay_packing_list_sections`, `bay_packing_list_rows`로 실제 운영
  패킹리스트를 관리합니다.
- `bay_packing_lists.bay_id`는 unique이므로 BAY당 패킹리스트는 최대 1개입니다.
- 체크 상태와 행·섹션·전체 메모는 템플릿이 아니라 BAY 패킹리스트에만 저장합니다.

#### `operation_control`

운영 시간의 수동 종료와 연장을 관리하는 singleton입니다.

- PK는 항상 `1`입니다.
- 주요 필드: `manual_closed_until`, `extension_until`, `updated_by`

#### `operation_sessions`

Open부터 Close까지의 운영 구간을 한 행으로 기록합니다.

- `id`는 한국 날짜와 UUID를 결합한 `YYYYMMDD-{UUID}` 형식입니다.
- 주요 필드: `operation_date`, `opened_at`, `closed_at`, `opened_by`, `closed_by`
- 같은 날짜에 Close 후 다시 Open하면 별도의 세션 행을 생성합니다.
- 연장 시간을 추가하거나 변경해도 현재 열린 세션은 유지합니다.
- 정규 운영과 연장 운영의 자동 종료는 다음 상태 조회 시 실제 종료 예정 시각으로 동기화합니다.
- 자동 Open/Close의 처리자는 `NULL`, 관리자 조작은 해당 사용자를 기록합니다.

#### `work_items`

BAY에서 실행되는 독립 작업 행입니다.

- FK: `bay_id → bays.id`
- 작업 정보: 정렬 순서, 원본 행, 작업 번호와 이름, 상세, 업체, 품번, 품명, bolt
- 실행 정보: `status`, 시작/완료 사용자와 시각
- 안전 정보: `is_high_altitude`, `safety_note`
- 감사 정보: version, 무효화 사용자/시각/사유
- legacy 호환 필드: `worker`, `work_date`, `is_completed`
- BAY 삭제 시 작업은 restrict합니다.

주요 제약 및 index:

- `(bay_id, sort_order)` unique
- `(bay_id, source_row)` unique
- `(bay_id, status)` index
- `(bay_id, is_high_altitude)` index
- `(started_by, status)` index

#### `work_item_issues`

작업별 이슈를 독립된 행으로 저장하며 하나의 작업에 여러 이슈를 등록할 수 있습니다.

- FK: `work_item_id → work_items.id`
- 카테고리: 자재부족, 작업지연, 품질이슈, 기타
- 상태: 미확인, 확인 중, 처리완료
- 주요 필드: 내용, 등록 사용자와 시각, 상태 변경 사용자와 시각
- 새 이슈는 `unconfirmed` 상태로 생성합니다.
- 이슈 생성은 Admin, Manager, Worker에게 허용합니다.
- 이슈 내용과 상태 변경은 Admin과 Manager에게만 허용합니다.
- `(work_item_id, status)` index로 작업별 미처리 이슈를 조회합니다.
- 작업 삭제 시 이슈는 restrict합니다.

#### `work_item_status_events`

작업 상태 변경의 append-only 감사 이벤트입니다.

- FK: `work_item_id → work_items.id`
- 주요 필드: 이전/다음 상태, action, actor, 역할 snapshot, 사유, 생성 시각
- 작업 삭제 시 이벤트는 restrict합니다.

#### `telegram_settings`

Telegram 설정 singleton입니다.

- PK는 항상 `1`입니다.
- Bot Token 암호문과 마지막 네 자리, Chat ID, 활성화 여부를 저장합니다.

#### `telegram_delivery_outbox`

Telegram 알림의 전달 상태와 재시도 정보를 저장합니다.

- FK: `work_item_id → work_items.id`, `issue_id → work_item_issues.id`
- 새 알림은 `issue_id`별로 하나만 생성합니다.
- 기존 알림의 이슈 버전은 nullable `issue_version`에 보존합니다.
- 상태, 재시도 횟수, 다음 시도 시각, lock, 오류 및 Telegram message ID를 기록합니다.
- `(status, next_attempt_at)` index로 발송 대상을 조회합니다.

#### `application_logs`

서버에서 발생한 사용자 행위와 시스템 오류를 저장합니다. 분석 화면의 업무 집계 데이터와는
별개의 운영 로그입니다.

- 로그 수준: `debug`, `info`, `warn`, `error`
- 주요 필드: `category`, `event`, 한국어 `message`, `actor_user_id`, `metadata`, `error_stack`
- 사용자와 무관한 시스템 로그의 `actor_user_id`는 `NULL`입니다.
- 사용자 삭제 시 FK는 `SET NULL`로 처리하여 로그를 유지합니다.
- `metadata`와 오류 스택은 공통 필터로 비밀번호, 토큰, 쿠키 등 민감정보를 제거합니다.
- 성공한 상태 변경과 행위 로그는 같은 transaction에서 commit합니다.
- 전역 요청 오류 로그는 원래 오류를 덮지 않도록 best-effort로 저장합니다.
- 전역 오류 훅은 예상된 4xx를 중복 저장하지 않고 처리되지 않은 5xx만 기록합니다.
- Telegram 외부 전송 결과 로그는 전달 상태 확정 후 best-effort로 저장하여 중복 전송을 방지합니다.
- API 응답의 `BIGSERIAL` 로그 ID와 커서는 정밀도 손실을 막기 위해 문자열로 직렬화합니다.
- 초기 index는 `created_at` 단일 index만 사용합니다.

## 데이터 정합성

- 템플릿으로 BAY를 만들 때 템플릿 행을 `work_items`로 복사합니다.
- 생성된 BAY와 템플릿은 이후 독립적으로 변경합니다.
- BAY와 작업 복사는 하나의 transaction으로 처리합니다.
- 패킹 템플릿을 선택하면 섹션과 행을 BAY 소유 데이터로 복사하며 이후 원본과 동기화하지
  않습니다.
- BAY 생성 시 패킹리스트를 사용하는 경우 BAY, 작업 행, 패킹 섹션과 행을 하나의
  transaction으로 저장합니다.
- 상태 변경은 version 조건을 포함해 lost update를 방지합니다.
- 상태 변경과 `work_item_status_events` 기록은 같은 transaction에서 수행합니다.
- 이슈 저장과 Telegram Outbox 생성도 같은 transaction에서 수행합니다.
- PostgreSQL timestamp는 timezone을 포함하고 화면 표시는 `Asia/Seoul` 기준으로 변환합니다.

## Telegram 전달

- Bot Token은 `NUXT_TELEGRAM_ENCRYPTION_KEY`를 사용해 AES-GCM으로 암호화합니다.
- 조회 API는 원문 대신 마지막 네 자리만 반환합니다.
- 이슈 저장은 Telegram 전송 성공 여부에 의존하지 않습니다.
- Nitro task `telegram:deliver`가 매분 Outbox를 처리합니다.
- 네트워크 오류, `429`, `5xx`는 최대 5회까지 재시도합니다.
- 영구 실패 또는 비활성 설정은 `failed`, `skipped` 상태로 원인을 보존합니다.
- Admin은 전송 이력에서 실패 원인을 확인하고 재시도할 수 있습니다.

로컬 mock 서버:

```bash
pnpm test:telegram:mock
```

Mock을 사용할 때만 API base URL을 `http://127.0.0.1:3123`으로 설정합니다.

## 환경 변수

```env
# 기존 로컬 Supabase PostgreSQL 컨테이너의 DB 포트
NUXT_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres
NUXT_AUTH_SESSION_SECRET=replace-with-at-least-32-random-characters
NUXT_TELEGRAM_ENCRYPTION_KEY=
NUXT_TELEGRAM_API_BASE_URL=https://api.telegram.org
```

- 로컬에서는 Supabase Docker의 PostgreSQL 컨테이너만 사용하며 Auth, REST, Storage API에는
  연결하지 않습니다.
- 일반 PostgreSQL에서는 `NUXT_DATABASE_URL`만 해당 서버의 연결 문자열로 변경합니다.
- `NUXT_AUTH_SESSION_SECRET`은 32자 이상의 서버 전용 랜덤 값입니다.
- `NUXT_TELEGRAM_ENCRYPTION_KEY`는 Bot Token이 아닌 32자 이상의 서버 비밀키입니다.
- 암호화된 기존 Token을 계속 사용하려면 환경별로 encryption key를 유지해야 합니다.
- 세션 비밀키, encryption key 및 실제 DB 인증 정보는 클라이언트에 전달하지 않습니다.

## 최초 관리자

마이그레이션 후 다음 명령으로 최초 관리자 계정을 생성합니다.

```bash
pnpm auth:create-admin
pnpm auth:create-admin admin01 "시스템 관리자"
```

비대화형 환경에서는 `CAPACITY_ADMIN_PASSWORD` 환경 변수로 비밀번호를 전달할 수 있습니다.
비밀번호는 Argon2id 해시로만 DB에 저장됩니다.

## 로컬 테스트 계정

다음 명령은 로컬 PostgreSQL에만 테스트 계정을 생성하거나 갱신합니다.

```bash
pnpm auth:seed-test-users
```

| 로그인 ID | 비밀번호 | 역할    |
| --------- | -------- | ------- |
| `admin`   | `123123` | admin   |
| `manager` | `123123` | manager |
| `worker`  | `123123` | worker  |

6자리 비밀번호는 로컬 테스트 계정에만 허용되는 예외입니다. 관리 화면과 최초 관리자 생성은
8자리 이상의 비밀번호를 요구합니다.

## 로컬 데이터 복구 기록

2026-07-29에 `backup/20260716-052401` 백업에서 Auth 데이터를 제외하고 다음 업무 데이터를
로컬 `postgres` DB로 복구했습니다.

- BAY 템플릿 1개
- 템플릿 행 242개
- BAY 19개
- 작업 항목 4,357개
- 작업 상태 이력 13개

백업의 `admin`, `testmanager`, `testworker` 사용자 참조는 현재 로컬 `admin`, `manager`,
`worker` 계정에 각각 매핑했습니다. Supabase Auth 사용자, 세션 및 refresh token은
복구하지 않았습니다.

## Drizzle 명령

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

- schema 변경과 migration을 같은 변경 단위로 관리합니다.
- 공유 환경에서는 migration 이력을 수정하지 않고 새 migration을 추가합니다.
- 운영 데이터에 영향을 주는 migration은 backfill과 rollback 전략을 함께 검토합니다.

## 테스트

- Domain aggregate의 상태 전이와 오류를 단위 테스트합니다.
- Application service는 권한, 소유권, 운영 시간 및 동시성 충돌을 테스트합니다.
- Telegram 암호화, client 및 Outbox 재시도 정책을 테스트합니다.
- API 변경 시 인증 실패, 권한 부족, validation 실패 및 conflict 응답을 확인합니다.
