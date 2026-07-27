---
적용: 백엔드(server/**), 공용 API 계약(shared/api/**), 프론트 API 클라이언트
---

# 백엔드 DDD 아키텍처 규칙

## 1. 기본 원칙

- 백엔드는 **모듈러 모놀리스**로 유지한다.
- 최상위 구조는 기술 계층이 아니라 **Bounded Context(업무 도메인)** 기준으로 나눈다.
- 각 Bounded Context 내부에서 Controller, Service, Domain, Repository, Infrastructure 계층을 나눈다.
- DDD는 명령과 상태 변경에 엄격하게 적용한다.
- 대시보드, 검색, 집계 같은 읽기 기능은 별도 Query Service를 사용하는 경량 CQRS 방식을 허용한다.
- 마이크로서비스 분리는 독립 배포, 확장, 장애 격리 요구가 명확해질 때만 검토한다.

## 2. Bounded Context

현재 백엔드는 다음 컨텍스트를 기준으로 구성한다.

| 컨텍스트            | 책임                                                                |
| ------------------- | ------------------------------------------------------------------- |
| `work-execution`    | 작업 시작, 완료, 시작 취소, 완료 복구, 무효화, 이슈 등록, 감사 이력 |
| `bay-configuration` | BAY, 템플릿, 템플릿으로부터 작업 생성                               |
| `operations`        | 정규 운영시간, 수동 Close, 연장 Open                                |
| `identity-access`   | 사용자 프로필, 역할, Supabase 인증 연결                             |
| `notifications`     | Telegram 설정, Outbox, 전송 및 재시도                               |
| `reporting`         | 대시보드, 검색, 집계용 Read Model                                   |

하나의 컨텍스트가 다른 컨텍스트의 Infrastructure 구현을 직접 참조하지 않는다. 필요한 기능은 Port를 통해 요청한다.

## 3. 표준 디렉터리 구조

```text
server/
├─ api/                              # Nitro 파일 기반 라우트
├─ bootstrap/
│  └─ backend-context.ts             # DI Composition Root
├─ infrastructure/
│  └─ database/                      # 여러 컨텍스트가 사용하는 DB 기반 기술
├─ presentation/
│  ├─ errors/                        # Domain/Application Error → HTTP Error
│  └─ http/
├─ shared/                           # 백엔드 내부 최소 공통 요소
└─ modules/
   └─ <bounded-context>/
      ├─ controller/
      ├─ service/
      │  ├─ dto/
      │  ├─ errors/
      │  └─ ports/
      ├─ domain/
      │  ├─ aggregates/
      │  ├─ events/
      │  ├─ errors/
      │  └─ services/
      ├─ repository/                 # Repository 및 Unit of Work 인터페이스
      ├─ infrastructure/             # Drizzle, 외부 API 등 Port 구현체
      └─ <context>.module.ts          # 컨텍스트 내부 객체 조립

shared/
└─ api/                              # 프론트와 백엔드가 공유하는 API 계약
   ├─ common/
   └─ <resource>/
```

규모가 작은 컨텍스트는 불필요한 빈 디렉터리를 만들지 않는다. 파일 수가 늘어날 때 `aggregates`, `events`, `errors` 등의 하위 디렉터리로 분리한다.

## 4. 의존성 방향

```text
Nitro Route
  → Controller
    → Application Service
      → Domain Aggregate / Domain Service
      → Repository Port / External Port
        ← Infrastructure Adapter
```

의존성은 항상 바깥 계층에서 안쪽 계층으로 향한다.

### 허용

- Controller → Service
- Service → Domain
- Service → Repository/External Port
- Infrastructure → Repository/External Port
- Composition Root → 모든 구현체

### 금지

- Domain → Controller, Service, Infrastructure
- Domain → Nitro, H3, Drizzle, Supabase, Vue, Zod
- Service → Nitro의 `H3Event`, `createError`
- Controller → Drizzle Schema 또는 Repository 구현체
- 프론트엔드 → `server/**`
- 다른 컨텍스트 → 대상 컨텍스트의 Drizzle Repository 직접 호출

서버 내부의 컨텍스트 간 또는 공통 인프라 참조에는 `#server` 별칭을 사용한다. 프론트와 서버가 공유하는 계약에는 `#shared` 별칭을 사용한다. 동일 Bounded Context 내부의 가까운 파일은 상대 경로 import를 허용한다.

## 5. Nitro Route와 Controller

`server/api` 파일은 URL과 HTTP Method를 등록하는 진입점이다. 비즈니스 로직을 작성하지 않는다.

```ts
import { useBackendContext } from '#server/bootstrap/backend-context'

export default defineEventHandler(event =>
  useBackendContext().workExecution.startWorkItemController.handle(event),
)
```

Controller의 책임은 다음으로 제한한다.

- Path, Query, Body 파싱
- Zod를 이용한 HTTP 입력 형식 검증
- 인증 사용자 조회
- 인증 프로필을 Domain Actor 또는 Command로 변환
- Application Service 호출
- Application Result를 공개 API Response로 변환
- 계층별 오류를 공통 HTTP Error Mapper로 전달

Controller에서 SQL, 트랜잭션, 상태 전이 규칙을 작성하지 않는다.

## 6. Application Service

Service는 하나의 유스케이스를 표현한다.

권장 이름:

```text
StartWorkItemService
CompleteWorkItemService
CancelWorkItemStartService
ReportWorkItemIssueService
```

Service의 책임:

- 유스케이스 실행 순서 조율
- Clock, OperationGate 같은 Port 호출
- Unit of Work를 통한 트랜잭션 경계 설정
- Repository에서 Aggregate 조회
- Aggregate 메서드 호출
- 변경된 Aggregate, Domain Event, Outbox 저장
- Application Result 반환

Service가 직접 상태를 변경하거나 업무 규칙을 중복 구현하지 않는다.

```ts
// 금지
if (row.status !== 'not_started') {
  throw new Error()
}
row.status = 'in_progress'

// 권장
workItem.start(command.actor, now, workDate)
```

Service는 HTTP 상태 코드, `H3Event`, Drizzle Transaction 타입을 알지 못해야 한다.

## 7. Domain

Domain 계층은 비즈니스 규칙의 단일 원천이다.

Domain에 포함할 대상:

- Aggregate와 Entity
- Value Object
- 상태 전이 규칙
- 역할과 소유권에 따른 업무 권한
- Domain Event
- Domain Error
- 하나의 Aggregate에 넣기 어려운 순수 Domain Service

Aggregate는 외부에서 속성을 임의로 변경하지 못하게 하고 의미가 있는 메서드를 제공한다.

```ts
workItem.start(actor, now, workDate)
workItem.complete(actor, now)
workItem.cancelStart(actor, reason, now)
workItem.restoreCompleted(actor, targetStatus, reason, now)
workItem.void(actor, reason, now)
workItem.reportIssue(actor, severity, note, now)
```

Drizzle Row를 Domain Entity로 사용하지 않는다. Persistence Mapper를 통해 변환한다.

```text
Database Row
  → Persistence Mapper
  → Domain Aggregate
  → Application Result
  → API Response
```

## 8. Repository와 Unit of Work

Repository 인터페이스는 내부 Port이며 Domain 객체를 기준으로 정의한다.

```ts
export interface WorkItemRepository {
  findById(id: number): Promise<WorkItem | null>
  save(workItem: WorkItem): Promise<void>
}
```

Drizzle 구현체는 `infrastructure`에 둔다.

하나의 유스케이스에서 여러 저장소가 같은 트랜잭션을 사용해야 하면 Unit of Work를 사용한다.

```ts
export interface WorkExecutionUnitOfWork {
  execute<T>(operation: (repositories: WorkExecutionRepositories) => Promise<T>): Promise<T>
}
```

다음 데이터는 반드시 하나의 트랜잭션으로 저장한다.

- Work Item 상태 변경과 감사 이벤트
- 이슈 등록과 Telegram Notification Outbox
- BAY 생성과 BAY의 초기 Work Item 목록

Repository 밖으로 Drizzle Transaction 객체를 노출하지 않는다.

## 9. 동시성 제어

Work Item 변경은 `version` 컬럼을 사용한 낙관적 동시성 제어를 적용한다.

```text
UPDATE work_items
WHERE id = :id
  AND version = :originalVersion
```

- 성공한 변경은 `version`을 1 증가시킨다.
- 조건에 맞는 Row가 없으면 동시성 충돌로 처리한다.
- 동시성 충돌은 안정적인 Application Error Code를 반환한다.
- 상태 조회 후 무조건 UPDATE하는 방식으로 동시성 검증을 우회하지 않는다.

## 10. DI 규칙

기본 DI 방식은 **생성자 주입 + 수동 Composition Root**다.

```ts
export class StartWorkItemService {
  constructor(
    private readonly unitOfWork: WorkExecutionUnitOfWork,
    private readonly operationGate: OperationGate,
    private readonly clock: Clock,
  ) {}
}
```

`server/bootstrap/backend-context.ts`는 Spring의 `@Configuration`과 같은 역할을 한다.

- 구현체 생성
- Interface/Port와 구현체 연결
- Service 생성
- Controller 생성
- Bounded Context Module 조립

객체 범위:

| 범위                  | 대상                                         |
| --------------------- | -------------------------------------------- |
| Application Singleton | DB Client, Clock, 외부 API Client            |
| Stateless Singleton   | Service, Controller, Mapper                  |
| Request               | 인증 사용자, Actor, Command, Request ID      |
| Transaction           | Drizzle Transaction과 이에 연결된 Repository |

사용자나 요청 데이터를 Singleton Service의 속성에 저장하지 않는다.

현재 규모에서는 Decorator 기반 DI Container를 도입하지 않는다. Composition Root가 관리하기 어려울 정도로 커질 때 `tsyringe` 등의 도입을 별도로 검토한다.

## 11. 에러 계층

에러는 발생 계층과 HTTP 표현을 분리한다.

```text
Domain/Application Error
  → HTTP Error Mapper
  → H3 Error Response
```

### Domain Error

업무 규칙 위반을 표현한다.

```text
InvalidWorkItemTransitionError
WorkItemCompletionForbiddenError
WorkItemIssueAlreadyOpenError
```

### Application Error

유스케이스 실행 실패를 표현한다.

```text
WorkItemNotFoundError
ConcurrentWorkItemUpdateError
OperationClosedError
IssueRateLimitExceededError
```

### Infrastructure Error

DB, Supabase, Telegram 등 기술적 실패를 표현한다. PostgreSQL 오류 코드나 외부 API의 원본 오류를 Controller로 노출하지 않는다.

### Presentation Error

잘못된 Path, Query, Body 등 HTTP 입력 오류를 표현한다.

Domain과 Service에서는 `createError()`를 호출하거나 HTTP 상태 코드를 지정하지 않는다. HTTP 상태 변환은 `server/presentation/errors/http-error.mapper.ts` 한 곳에서 처리한다.

API 에러에는 사람이 읽는 메시지와 프론트가 분기할 안정적인 `code`를 함께 제공한다.

```json
{
  "statusCode": 409,
  "statusMessage": "다른 사용자가 먼저 작업 상태를 변경했습니다.",
  "data": {
    "code": "WORK_ITEM_CONCURRENT_UPDATE"
  }
}
```

프론트는 `statusMessage` 문자열 비교가 아니라 `code`로 분기한다.

예상하지 못한 내부 오류의 SQL, Token, Stack Trace는 응답에 포함하지 않는다.

## 12. 공유 API 계약

프론트와 백엔드가 함께 사용하는 요청, 응답, 에러 계약은 `shared/api`에 둔다.

계약 파일은 API 단위로 나눈다.

```text
shared/api/work-items/
├─ work-item.contract.ts
├─ start-work-item.contract.ts
├─ complete-work-item.contract.ts
├─ cancel-work-item-start.contract.ts
└─ report-work-item-issue.contract.ts
```

Zod Schema를 계약의 원본으로 두고 TypeScript 타입을 추론한다.

```ts
export const CancelWorkItemStartRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export type CancelWorkItemStartRequest = z.infer<typeof CancelWorkItemStartRequestSchema>
```

백엔드 Controller는 Schema로 요청을 검증하고, 프론트 API Client는 추론된 타입을 사용한다.

공유 가능한 대상:

- Path, Query, Body Schema
- API Request/Response 타입
- 공개 Enum
- Pagination 타입
- 안정적인 API Error Code

공유 금지 대상:

- Domain Aggregate와 Domain Event
- Repository와 Unit of Work
- Drizzle Row 및 Schema 타입
- Supabase User
- Application Service와 내부 Command
- Telegram 내부 전송 모델

`shared` 코드는 Vue 또는 Nitro 전용 런타임에 의존하지 않는다.

## 13. Query와 Reporting

상태를 변경하지 않는 복잡한 조회는 Aggregate를 억지로 통과시키지 않는다.

- 대시보드, 검색, 집계는 Reporting Context의 Query Service가 담당한다.
- Query Service는 읽기 전용 Drizzle 쿼리를 사용할 수 있다.
- DB Row를 그대로 반환하지 않고 명시적인 Read Model 또는 API Response로 매핑한다.
- Query Controller에서도 인증, 입력 검증, 응답 변환 규칙을 유지한다.
- Command Repository와 Query Service를 하나의 범용 Repository로 합치지 않는다.

## 14. 테스트 규칙

각 계층은 다음 수준으로 검증한다.

### Domain Test

- 상태 전이
- 역할 및 소유권 권한
- 필드 초기화
- Domain Event 기록
- 무효화된 Aggregate 접근
- 중복 이슈 차단

Domain Test는 DB, Nuxt, Supabase 없이 실행할 수 있어야 한다.

### Application Service Test

- Port 호출 순서
- OperationGate 적용
- Unit of Work 실행
- Aggregate 저장
- 감사 이벤트 및 Outbox 저장
- 오류 전달과 동시성 충돌 처리

Fake Repository, Fixed Clock, Stub Gate를 생성자 DI로 주입한다.

### Infrastructure Integration Test

- Persistence Mapper
- 실제 Drizzle Query
- `version` 조건부 UPDATE
- 트랜잭션 Rollback
- 감사 이벤트 및 Outbox 원자성

### 완료 기준

백엔드 구조 변경은 최소한 다음 명령이 모두 통과해야 한다.

```bash
pnpm test:run
pnpm typecheck
pnpm build
```

## 15. 마이그레이션 규칙

- 전면 재작성하지 않고 Bounded Context 또는 유스케이스 단위의 세로 슬라이스로 이전한다.
- 이전 중에도 기존 API URL, Request, Response, HTTP Status를 유지한다.
- DB Schema 변경은 DDD 구조 이동과 분리하여 별도 Migration으로 처리한다.
- 새 Controller 연결 후 기존 API 핸들러의 SQL과 비즈니스 로직을 제거한다.
- 사용되지 않는 Policy Utility, 중복 DTO, 중복 Request Type은 테스트와 함께 제거한다.
- 각 단계에서 기존 테스트, 타입체크, 프로덕션 빌드를 실행한다.

권장 이전 순서:

```text
Work Execution
→ Operations
→ Bay Configuration
→ Notifications
→ Identity & Access
→ Reporting
```

## 16. 금지 패턴

- 전역 `services/`, `repositories/`에 모든 도메인을 혼합
- `WorkItemService` 하나에 모든 Work Item 유스케이스 집중
- Controller에서 Repository 또는 Drizzle 직접 호출
- Service에서 HTTP Error 생성
- Domain에서 DB Schema 타입 사용
- Drizzle Row를 API Response로 직접 반환
- Repository가 Domain 규칙 판단
- 프론트와 Domain Entity 공유
- 외부 알림을 DB Transaction 성공 전에 직접 전송
- 상태 변경과 감사 이벤트를 서로 다른 트랜잭션으로 저장
- 사용자 표시 메시지를 기준으로 프론트 오류 분기
- 테스트 편의를 위해 Production 코드에 전역 Mutable Dependency 추가
