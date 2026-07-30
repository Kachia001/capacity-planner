# 문서-구현 일치성 점검

> 점검 기준일: 2026-07-29

이 문서는 `DOCS/POLICY.md`, `DOCS/FRONTEND.md`, `DOCS/BACKEND.md`에 정의된
정책과 실제 프로젝트 구현의 차이를 기록합니다.

문서가 설명하는 목표 구조와 현재 구현 상태를 구분하고, 이후 리팩터링 및
정책 결정의 기준으로 사용합니다.

## 요약

| 중요도 | 항목                     | 현재 상태                                      | 분류                |
| ------ | ------------------------ | ---------------------------------------------- | ------------------- |
| 높음   | 백엔드 아키텍처          | `work-execution`만 모듈형 구조가 적용됨        | 문서 설명 보정 필요 |
| 높음   | Manager 작업 무효화      | 정책과 달리 Admin만 가능                       | 정책·구현 충돌      |
| 해결   | Manager 계정 관리        | 공통 계정 화면에서 Worker 계정 관리 제공       | 2026-07-30 완료     |
| 중간   | Admin 대시보드           | BAY 상태 매트릭스 위주로 구성됨                | 부분 구현           |
| 중간   | 전체 작업 상태 이력      | 대시보드 API가 최근 20건만 제공함              | 정책·구현 차이      |
| 해결   | Admin/Manager 관리 UI    | `/admin` 공통 UI와 역할별 기능 제한 적용       | 2026-07-30 완료     |
| 해결   | 프론트엔드 디자인 시스템 | 공통 Button·DataTable 및 반응형 영역 분리 적용 | 2026-07-28 완료     |
| 낮음   | Cursor pagination        | 실제로는 cursor 형태의 offset pagination임     | 용어 보정 필요      |
| 낮음   | API·환경변수 문서        | Health API 및 환경변수 예제 일부 누락          | 문서 보완 필요      |

## 1. 백엔드 아키텍처

### 문서

`BACKEND.md`는 서버 전체가 다음 구조의 모듈형 모놀리스로 구성된 것으로
설명합니다.

```text
Controller → Application Service → Domain → Repository → Adapter
```

또한 API route는 controller 또는 공통 HTTP handler를 일관되게 사용하도록
정의합니다.

### 실제 구현

현재 위 구조를 온전히 사용하는 영역은 `server/modules/work-execution`입니다.

BAY, 사용자, 대시보드, 운영 제어, Telegram 설정 등의 기존 API는
`server/api/**` route 파일에서 다음 책임을 직접 처리하는 경우가 많습니다.

- 인증과 권한 검사
- Zod 입력 검증
- 비즈니스 규칙 처리
- Drizzle 쿼리 실행
- 응답 변환

따라서 현재 백엔드는 전체 모듈형 모놀리스라기보다, `work-execution`부터
모듈형 구조로 이전 중인 혼합 구조입니다.

### 조치 방향

- `BACKEND.md`를 현재 상태와 목표 구조로 나누어 설명하거나
- 나머지 API를 bounded context 단위로 순차 이전합니다.

## 2. Manager 권한

### BAY 및 BAY 템플릿 생성

2026-07-30에 Admin과 Manager의 관리 화면을 `/admin` 아래의 공통 UI로 통합하고
Manager가 BAY와 BAY 템플릿을 생성할 수 있도록 다음 범위를 함께 반영했습니다.

- BAY 템플릿 조회·생성 API
- BAY 생성 API
- `/admin`, `/admin/bays`, `/admin/bays/new`, `/admin/bay-templates/new` 공통 경로
- Admin과 Manager를 허용하는 역할 기반 route 검증
- Manager에게 Admin 전용 Telegram 메뉴를 숨기는 권한 기반 내비게이션
- 별도 Manager 페이지와 내비게이션 제거

### Worker 계정 관리

`POLICY.md`는 Manager가 Worker 계정을 관리할 수 있다고 정의합니다.

실제 사용자 API와 `/admin/accounts` 화면은 Admin과 Manager를 허용합니다.
Manager에게는 조회 가능한 계정만 표시하고 신규 계정 역할을 Worker로 제한하며,
서버에서도 Worker 외 역할 생성을 거부합니다.

현재 상태는 다음과 같습니다.

- 백엔드 권한: 구현됨
- 공통 관리 UI 및 진입 경로: 구현됨
- 역할별 생성 옵션 제한: 구현됨

### 작업 무효화

`POLICY.md`는 Manager의 작업 무효화를 허용된 범위에서 가능하다고 설명합니다.

그러나 실제 `void-work-item` controller와 domain 규칙은 Admin만 허용합니다.
이 항목은 단순 UI 누락이 아니라 정책과 백엔드 규칙이 직접 충돌합니다.

다음 중 하나를 결정해야 합니다.

- 무효화를 Admin 전용으로 확정하고 `POLICY.md`를 수정
- Manager 허용 범위를 정의한 뒤 domain, API, UI를 함께 수정

## 3. 대시보드와 작업 이력

`POLICY.md`는 Admin과 Manager가 KPI, 이슈, 최근 작업 상태를 확인할 수 있도록
정의합니다.

Admin과 Manager는 동일한 `/admin` 대시보드에서 `BayStatusMatrix`를 사용합니다.
다만 서버가 제공하는 KPI, 이슈, 최근 이벤트를 화면에 모두 표시하지는 않습니다.

또한 `/api/dashboard/bays`의 작업 이벤트 조회는 최근 20건으로 제한됩니다.
따라서 문서에 있는 “전체 작업 상태 이력”이라는 표현과 실제 제공 범위가
일치하지 않습니다.

필요한 결정은 다음과 같습니다.

- 대시보드에는 최근 이벤트만 표시하고 별도 이력 화면을 제공할지
- 대시보드 자체에서 페이지네이션된 전체 이력을 제공할지
- 공통 대시보드에 어떤 지표를 추가할지

## 4. 프론트엔드 디자인 시스템 적용 상태

2026-07-28에 기존 페이지의 공통 컴포넌트 이전을 완료했습니다.

재점검 결과는 다음과 같습니다.

- 화면 코드의 raw `<button>`: 0개
- 화면 코드의 raw `<table>`: 0개
- template의 직접 `$emit(...)` 호출: 0개
- 동일 태그의 `size-*`, `sm:size-*` 조합: 0개
- Button의 `h-10`, `h-11`, `h-12` class 크기 재정의: 0개
- Button·DataTable UI 회귀 테스트: 6개

`<table>` 태그는 공통 shadcn table primitive인
`app/components/ui/table/Table.vue` 내부에만 존재합니다.

다음 목록 화면은 공통 `DataTable`을 사용합니다.

- `app/pages/admin/accounts.vue`
- `app/pages/admin/bays/index.vue`

각 화면은 모바일 카드와 데스크톱 DataTable을 독립 영역으로 렌더링하며,
컬럼은 props, 커스텀 셀은 `cell-{key}` slot으로 구성합니다.

Button 테스트는 네이티브 disabled, disabledReason tooltip, loading 및
`as-child` 링크의 동작 차단을 검증합니다. DataTable 테스트는 열별 custom cell
slot과 loading·empty slot을 검증합니다.

### 상대 경로 import 규칙

shadcn 기반 `components/ui/**` 내부의 같은 컴포넌트 묶음은 생성 코드의
구조를 유지하기 위해 상대 경로를 허용하는 것으로 `FRONTEND.md` 정책을
명확히 했습니다.

- 앱 기능 코드에서는 `@/` alias 사용
- 같은 UI 컴포넌트 디렉터리 내부 import는 상대 경로 허용

## 5. 반응형 UI

`FRONTEND.md`는 하나의 태그에 breakpoint별 크기 조건을 누적하지 않고,
모바일과 데스크톱 영역을 별도로 관리하도록 정의합니다.

동일 태그에서 `size-*`와 breakpoint별 `size-*`를 함께 사용하던 코드를
모바일·데스크톱 독립 영역으로 분리했습니다. 화면 구조가 달라지는 목록은
모바일 카드와 데스크톱 DataTable을 각각 관리하고, 단순 컨테이너 간격은
기존 breakpoint class를 유지합니다.

## 6. Pagination 방식

`POLICY.md`는 작업 검색을 cursor pagination으로 설명합니다.

실제 `/api/bays/:id/work-items` 구현은 다음 방식입니다.

1. `cursor` 문자열을 숫자 offset으로 변환
2. Drizzle `.offset(cursor)` 적용
3. 다음 cursor로 `cursor + limit` 반환

외부 API 형태는 cursor이지만 내부 방식은 keyset cursor가 아닌
offset pagination입니다. 문서에는 “cursor 형태의 offset pagination”으로
기록하거나, 안정적인 대용량 조회가 필요하면 정렬 키 기반 keyset cursor로
변경해야 합니다.

## 7. 문서 누락

### Health API

실제 프로젝트에는 `GET /api/health`가 있지만 `BACKEND.md`의 API 목록에는
포함되어 있지 않습니다.

### Telegram API URL

`BACKEND.md`에는 `NUXT_TELEGRAM_API_BASE_URL`이 정의되어 있지만
`.env.example`에는 해당 항목이 없습니다.

필수 환경변수가 아니라 테스트 또는 프록시 환경을 위한 선택 항목임을
명시하거나 `.env.example`에 기본값과 함께 추가하는 것이 좋습니다.

### Worker BAY 범위

정책은 Worker가 “허용된 BAY”에서 작업한다고 설명하지만, 현재 별도의
BAY 배정 모델은 없습니다. 로그인한 Worker는 활성 BAY 목록과 해당 BAY의
작업을 조회할 수 있습니다.

현재 모든 활성 BAY를 허용 범위로 볼 것인지, 사용자별 BAY 배정 기능을
추가할 것인지 명확히 해야 합니다.

## 문서와 구현이 일치하는 항목

다음 항목은 점검 시점에 문서와 구현이 대체로 일치합니다.

- 앱 루트에 하나의 `TooltipProvider` 배치
- 공통 Button의 clickable pointer와 disabled cursor 처리
- 화면 액션의 공통 Button 사용과 handler 기반 emit
- DataTable의 데이터·컬럼·상태 props
- DataTable의 header, cell, row, body, loading, empty, footer slot
- 계정·Admin BAY·Manager BAY 페이지의 모바일·데스크톱 렌더링 영역 분리
- 작업 상태 전이와 역할별 완료 권한
- 낙관적 동시성 제어와 version 증가
- 상태 이벤트와 Telegram outbox의 동일 트랜잭션 처리
- DB 테이블, 인덱스, 외래키 및 singleton 제약
- Telegram token 암호화, 재시도 및 스케줄 정책
- 작업 검색 debounce 300ms와 기본 조회 크기 30
- 전역 Alert와 Confirm 사용 정책
- README의 프로젝트 설명과 기술 스택 범위

## 권장 처리 순서

1. Manager의 작업 무효화 권한을 정책적으로 확정합니다.
2. `BACKEND.md`에서 현재 구조와 목표 구조를 분리합니다.
3. Manager 계정 관리 UI 제공 여부를 결정합니다.
4. Admin 대시보드와 전체 작업 이력의 범위를 결정합니다.
5. pagination 용어와 API·환경변수 누락을 문서에 반영합니다.

## 관리 원칙

이 문서는 일회성 보고서가 아니라 구현 차이를 추적하는 문서로 관리합니다.

- 차이가 해소되면 해당 항목에 해결 내용과 날짜를 기록하거나 제거합니다.
- 새로운 정책을 문서에 추가할 때 현재 구현 여부도 함께 확인합니다.
- 목표 아키텍처는 반드시 “현재 적용”과 “향후 적용”을 구분해 작성합니다.
