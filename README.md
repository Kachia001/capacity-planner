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

## Development Policies

### Component boundaries

- 페이지 컴포넌트는 데이터 조회, 화면 상태 조합, 이벤트 연결을 담당하는 최상위 컨테이너로 사용합니다.
- 랜딩, 헤더, 상세 등 독립적인 UI 섹션은 각각 별도 컴포넌트로 추상화합니다.
- 하위 UI 컴포넌트가 필요한 데이터는 최상위 템플릿에서 props로 전달합니다. 하위 컴포넌트가 페이지 store에 직접 의존하지 않도록 합니다.
- Vue props는 `const props = defineProps<...>()`로 선언하고 script와 template에서 모두 `props.<name>`으로 접근합니다.
- Vue 이벤트는 `const emit = defineEmits<...>()`로 선언하고, template에서 `$emit`을 직접 호출하지 않고 명시적인 handler 함수에서 `emit(...)`을 호출합니다.

### Imports

- 애플리케이션 내부 파일은 상대경로 대신 `@/` alias를 사용하는 절대경로로 import합니다.
- `./`와 `../`를 이용한 애플리케이션 import는 사용하지 않습니다.
- 외부 패키지는 패키지 이름으로 import합니다.

```ts
import { Button } from '@/components/ui/button'
import BaySelector from '@/pages/index/components/BaySelector.vue'
import { storeToRefs } from 'pinia'
```

### Bay board logic

- Bay 정렬, 상태 집계, 작업 필터링처럼 입력 데이터에서 파생되는 로직은 `useBayBoard` composable에서 관리합니다.
- 페이지에는 인증 초기화, Bay 선택 및 해제, 상세 영역 스크롤처럼 화면 흐름을 제어하는 로직만 둡니다.
- Bay 이름 정렬은 숫자를 고려하는 자연 정렬을 사용합니다.
- 선택된 Bay의 미완료 수, 이슈 수, 표시 상태 및 상세 필터 결과는 composable의 computed 값으로 제공합니다.

### Global confirmation alert

- 사용자 확인이 필요한 동작은 브라우저 기본 `alert`나 개별 페이지 modal 대신 `useGlobalAlertStore`를 사용합니다.
- 전역 `GlobalAlert` 컴포넌트는 app root에서 한 번만 렌더링하고 store 상태를 직접 구독합니다.
- 표현 컴포넌트에는 `variant`와 `message`를 props로 전달합니다.
- `confirm`은 `Promise<boolean>`을 반환합니다. 확인은 `true`, 취소·ESC·배경 클릭·닫기는 `false`입니다.
- 지원 variant는 `default`, `destructive`, `success`, `warning`입니다.

```ts
const globalAlert = useGlobalAlertStore()

const accepted = await globalAlert.confirm({
  variant: 'destructive',
  message: '선택한 BAY를 삭제하시겠습니까?',
})

if (accepted) {
  // 승인된 작업 실행
}
```

### Authorization UI

- `새 BAY` 작업은 상단 header에서 제공합니다.
- 관리자는 활성화된 버튼을 통해 BAY 생성 화면으로 이동합니다.
- 비관리자에게는 관리자 전용 BAY 생성 버튼을 표시하지 않습니다.
- 서버와 route middleware에서도 권한을 다시 검증하며 UI 표시 제어만을 보안 수단으로 사용하지 않습니다.

### Formatting and linting

- Prettier와 ESLint는 개발 의존성으로 관리합니다.
- Prettier 설정은 `.prettierrc.json`을 기준으로 합니다.
- 세미콜론은 사용하지 않고 작은따옴표, 공백 2칸, 최대 100자, LF 줄바꿈을 사용합니다.
- 여러 줄 구조에는 가능한 범위에서 trailing comma를 사용합니다.
- 변경 파일은 반영 전에 Prettier와 `git diff --check`로 확인합니다.

```bash
pnpm exec prettier --write <files>
pnpm exec eslint <files>
git diff --check
```

### Commit policy

- 서로 다른 작업 영역은 별도 commit으로 분리합니다.
- commit message는 `<type>(<scope>): <description>` 형식을 사용합니다.
- 기능 브랜치는 `main`에 non-fast-forward 방식으로 병합하여 작업 단위와 merge 이력을 보존합니다.

```text
feat(component): 메인 UI 생성
feat(bay): BAY 생성 기능 구현
chore(db): DB 및 Supabase 설정 완료
chore(rule): 프로젝트 개발 지침 설정
docs(readme): 프로젝트 문서 정리
```

## 운영 요구사항 및 구현 계획

```json
{
  "document": {
    "title": "Capacity Planner 역할별 작업 운영 요구사항",
    "version": "1.0.0",
    "updatedAt": "2026-07-13",
    "status": "implemented",
    "implementedAt": "2026-07-13",
    "roles": {
      "admin": "Admin 및 시스템 최고관리자",
      "manager": "관리자 및 팀장",
      "worker": "작업자"
    }
  },
  "corePrinciples": [
    "작업 상태는 미작업, 작업 중, 작업 완료 순서로만 진행한다.",
    "작업자는 상태를 이전 단계로 되돌리거나 작업 시작을 취소할 수 없다.",
    "잘못 시작한 작업은 manager 또는 admin이 사유를 기록하고 취소한다.",
    "고소작업 여부는 모든 작업 목록, 검색 결과, 확인창 및 관리 화면에서 명확하게 식별한다.",
    "권한과 상태 전이 규칙은 UI와 서버에서 모두 검증한다.",
    "시작, 완료, 취소 및 무효화 이력은 감사 가능하게 보존한다.",
    "외부 CDN 사용을 최소화하고 정적 자산과 의존성은 애플리케이션 빌드에 포함한다."
  ],
  "authorization": {
    "admin": {
      "viewAllBays": true,
      "manageBaysAndTemplates": true,
      "searchAndProcessWorkItems": true,
      "cancelIncorrectStart": true,
      "voidWorkItem": true,
      "viewAuditHistory": "all",
      "manageWorkerAccounts": true
    },
    "manager": {
      "viewAllBays": true,
      "manageBaysAndTemplates": false,
      "searchAndProcessWorkItems": true,
      "cancelIncorrectStart": true,
      "voidWorkItem": "restricted",
      "viewAuditHistory": "all_or_assigned_scope",
      "manageWorkerAccounts": true
    },
    "worker": {
      "viewAllBays": false,
      "manageBaysAndTemplates": false,
      "searchAndProcessWorkItems": true,
      "cancelIncorrectStart": false,
      "voidWorkItem": false,
      "viewAuditHistory": "own",
      "manageWorkerAccounts": false
    },
    "initialManagerScope": "v1에서는 전체 Bay를 관리하며 담당 팀 또는 Bay 제한이 필요하면 team_members와 bay_assignments를 추가한다."
  },
  "workItemStatePolicy": {
    "statuses": ["not_started", "in_progress", "completed"],
    "labels": {
      "not_started": "미작업",
      "in_progress": "작업 중",
      "completed": "작업 완료"
    },
    "allowedWorkerTransitions": [
      {
        "from": "not_started",
        "to": "in_progress",
        "action": "start"
      },
      {
        "from": "in_progress",
        "to": "completed",
        "action": "complete",
        "condition": "현재 사용자가 시작한 작업"
      }
    ],
    "workerRollbackAllowed": false,
    "managerCorrection": {
      "action": "cancel_start",
      "allowedRoles": ["admin", "manager"],
      "from": "in_progress",
      "to": "not_started",
      "reasonRequired": true,
      "hardDelete": false,
      "auditEventRequired": true
    },
    "concurrency": {
      "strategy": "조건부 UPDATE와 상태 이력 INSERT를 하나의 데이터베이스 트랜잭션으로 처리한다.",
      "conflictStatus": 409,
      "conflictMessage": "이미 다른 작업자가 시작한 작업입니다."
    }
  },
  "startConfirmation": {
    "component": "useGlobalAlertStore 기반 전역 확인창",
    "title": "작업을 시작하면 되돌릴 수 없습니다",
    "message": "작업을 시작하면 작업자 권한으로 취소하거나 미작업 상태로 되돌릴 수 없습니다. 대상 작업과 Bay를 다시 확인해 주세요. 잘못 시작한 경우 관리자에게 취소를 요청해야 합니다.",
    "confirmLabel": "작업 시작",
    "cancelLabel": "돌아가기",
    "displayFields": ["Bay 코드", "작업명", "상세 작업", "품번", "고소작업 여부"],
    "highAltitudeAcknowledgement": "고소작업이면 안전 구분 확인 체크박스를 추가한다."
  },
  "highAltitudeWork": {
    "unit": "상세 작업",
    "fields": {
      "isHighAltitude": "boolean, default false",
      "safetyNote": "nullable text"
    },
    "storageTargets": ["bay_template_rows", "work_items"],
    "displayTargets": [
      "템플릿 편집기",
      "Bay 생성 최종 검토",
      "작업자 검색 결과",
      "작업 시작 확인창",
      "진행 중 작업",
      "manager/admin Bay 상세",
      "manager/admin 전체 집계"
    ],
    "presentation": "색상에만 의존하지 않고 아이콘과 고소작업 텍스트 배지를 함께 표시한다."
  },
  "workerExperience": {
    "entry": "Bay 선택 후 해당 Bay의 상세 작업을 검색한다.",
    "searchFields": ["Bay 코드", "작업명", "상세 작업", "품번", "품명", "업체"],
    "filters": ["미작업", "작업 중", "고소작업", "이슈 있음"],
    "defaultSort": "시작 가능한 미작업 우선",
    "searchImplementation": {
      "serverSide": true,
      "debounceMs": 300,
      "pagination": "cursor",
      "defaultLimit": 30
    },
    "resultCardFields": [
      "Bay",
      "작업명",
      "상세 작업",
      "품번 및 품명",
      "현재 상태",
      "고소작업 배지",
      "이슈 여부"
    ],
    "actions": {
      "not_started": "작업 시작",
      "in_progress_owned": "작업 완료",
      "in_progress_not_owned": "읽기 전용",
      "completed": "읽기 전용"
    }
  },
  "managementDashboard": {
    "roles": ["admin", "manager"],
    "supportedBayCount": "1..N",
    "kpis": [
      "전체 Bay",
      "전체 미작업 수",
      "전체 작업 중 수",
      "전체 완료 수",
      "열린 이슈 수",
      "이슈가 있는 Bay 수",
      "진행 중인 고소작업 수",
      "오늘 시작 및 완료 수",
      "마지막 갱신 시각"
    ],
    "bayCard": {
      "progress": "미작업, 작업 중, 완료 3구간 누적 진행 막대",
      "metrics": [
        "완료율",
        "상태별 작업 수",
        "열린 이슈 수",
        "전체 및 진행 중 고소작업 수",
        "현재 작업자 수",
        "마지막 활동 시각"
      ]
    },
    "filters": ["Bay 검색", "진행 상태", "이슈 여부", "고소작업 여부"],
    "additionalSections": [
      "심각도와 경과시간 기준 이슈 우선 목록",
      "시작, 완료, 관리자 취소 이벤트 타임라인",
      "Bay 선택 후 상세 작업 drill-down"
    ],
    "refresh": "수동 새로고침과 주기적 집계 갱신을 제공한다."
  },
  "dataModelPlan": {
    "workItems": [
      "status: work_status enum",
      "started_by: app_users foreign key",
      "started_at: timestamptz",
      "completed_by: app_users foreign key",
      "completed_at: timestamptz",
      "is_high_altitude: boolean default false",
      "safety_note: nullable text",
      "voided_by: nullable app_users foreign key",
      "voided_at: nullable timestamptz",
      "void_reason: nullable text"
    ],
    "templateRows": ["is_high_altitude: boolean default false", "safety_note: nullable text"],
    "statusEvents": [
      "work_item_id",
      "from_status",
      "to_status",
      "action",
      "actor_user_id",
      "actor_role_snapshot",
      "reason",
      "created_at"
    ],
    "issueManagement": [
      "status: open or resolved",
      "severity",
      "created_at",
      "resolved_at",
      "resolved_by"
    ],
    "legacyBackfill": {
      "completed": "is_completed가 true인 작업",
      "in_progress": "is_completed가 false이고 worker 또는 work_date가 있는 작업",
      "not_started": "그 외 작업",
      "legacyWorker": "기존 자유 텍스트 값은 보존하고 신규 작업부터 사용자 UUID를 기록한다."
    }
  },
  "apiPlan": [
    {
      "method": "GET",
      "path": "/api/dashboard/bays",
      "roles": ["admin", "manager"],
      "purpose": "전체 Bay 집계와 관리자 대시보드 데이터"
    },
    {
      "method": "GET",
      "path": "/api/bays/:id/work-items",
      "roles": ["admin", "manager", "worker"],
      "query": ["q", "status", "highAltitude", "hasIssue", "cursor", "limit"],
      "purpose": "Bay 내부 상세 작업 검색"
    },
    {
      "method": "POST",
      "path": "/api/work-items/:id/start",
      "roles": ["admin", "manager", "worker"],
      "purpose": "미작업을 작업 중으로 변경"
    },
    {
      "method": "POST",
      "path": "/api/work-items/:id/complete",
      "roles": ["admin", "manager", "worker"],
      "purpose": "작업 중을 작업 완료로 변경"
    },
    {
      "method": "POST",
      "path": "/api/work-items/:id/cancel-start",
      "roles": ["admin", "manager"],
      "purpose": "잘못 시작한 작업을 사유와 함께 미작업으로 복구"
    },
    {
      "method": "POST",
      "path": "/api/work-items/:id/void",
      "roles": ["admin"],
      "purpose": "작업 행을 물리적으로 삭제하지 않고 감사 가능한 상태로 무효화"
    }
  ],
  "bayCreationPolicyAlignment": {
    "templateIsInitialSource": true,
    "copiedWorkItemsAreEditableBeforeCreation": true,
    "createdBayIsIndependentFromTemplate": true,
    "templateChangesAreNotRetroactive": true,
    "saveBayAndWorkItemsInSingleTransaction": true,
    "serverValidationRequired": true
  },
  "cdnPolicy": {
    "externalAssetCdn": "avoid",
    "googleFontsImport": "remove",
    "fonts": "WOFF2 자체 호스팅 또는 시스템 폰트 사용",
    "iconsAndUiLibraries": "npm 패키지로 빌드에 포함",
    "charts": "초기에는 Tailwind 기반 진행 막대를 사용하고 추가 라이브러리는 CDN이 아닌 고정 버전 npm 패키지로 설치"
  },
  "implementationPlan": [
    {
      "phase": 1,
      "name": "정책 및 데이터 기반",
      "deliverables": [
        "명시적 작업 상태 추가",
        "고소작업 필드 추가",
        "기존 데이터 backfill",
        "상태 이벤트 이력 추가"
      ]
    },
    {
      "phase": 2,
      "name": "상태 변경 API",
      "deliverables": [
        "worker 단방향 상태 전이",
        "본인 작업 소유권 검사",
        "동시 시작 방지",
        "manager/admin 시작 취소와 사유 기록"
      ]
    },
    {
      "phase": 3,
      "name": "작업자 화면",
      "deliverables": [
        "Bay 내부 서버 검색과 필터",
        "고소작업 식별",
        "비가역 작업 시작 확인창",
        "내 작업 중 및 완료 처리"
      ]
    },
    {
      "phase": 4,
      "name": "관리자 화면",
      "deliverables": [
        "전체 Bay KPI와 3단계 진행 시각화",
        "이슈 우선 목록",
        "잘못 시작한 작업 취소",
        "작업 활동 이력"
      ]
    },
    {
      "phase": 5,
      "name": "안정화",
      "deliverables": [
        "역할별 401 및 403 테스트",
        "상태 전이와 동시 시작 통합 테스트",
        "검색 pagination 및 집계 정합성 테스트",
        "접근성 및 모바일 작업 환경 검증",
        "Google Fonts CDN 제거"
      ]
    }
  ],
  "acceptanceCriteria": [
    "작업자는 미작업에서 작업 중, 작업 중에서 작업 완료로만 상태를 변경할 수 있다.",
    "작업자가 시작 또는 완료 API를 직접 호출해도 역방향 변경은 거부된다.",
    "동일 작업을 동시에 시작하면 한 요청만 성공한다.",
    "manager와 admin의 작업 시작 취소에는 사유가 필요하고 이력이 남는다.",
    "고소작업은 검색 결과, 상세, 확인창 및 관리자 대시보드에서 텍스트로 식별된다.",
    "worker는 Bay 내부 작업을 여러 필드로 검색하고 pagination된 결과를 받을 수 있다.",
    "admin과 manager는 1개부터 N개의 Bay에 대한 진척률, 상태 분포, 이슈 및 고소작업을 한 화면에서 확인할 수 있다.",
    "작업 데이터는 hard delete 없이 취소 또는 무효화 이력으로 보존된다.",
    "애플리케이션 정적 자산은 외부 Google Fonts CDN 없이 로드된다."
  ]
}
```
