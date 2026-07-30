# 프론트엔드 아키텍처

## 기술 구성

- Nuxt 4 SPA
- Vue 3 Composition API
- TypeScript strict mode
- Pinia
- shadcn-vue / Reka UI
- Tailwind CSS 4
- Lucide Vue

## 디렉터리 책임

```text
app/
├─ pages/          라우트 단위 컨테이너
├─ layouts/        역할별 공통 레이아웃
├─ components/
│  ├─ ui/          디자인 시스템과 shadcn 기반 primitive
│  ├─ global/      애플리케이션 전역 UI
│  ├─ operations/  작업 운영 기능 UI
│  ├─ admin/       관리자 기능 UI
│  └─ layout/      공통 레이아웃 구성 요소
├─ composables/    데이터 조회 및 재사용 가능한 화면 로직
├─ stores/         인증과 전역 상태
├─ middleware/     인증, 역할, 레이아웃 라우팅
└─ types/          프론트엔드 전용 타입
```

`app/pages/**/components`는 해당 페이지 전용 컴포넌트입니다. Nuxt route 생성 시 이 경로는
페이지 후보에서 제외합니다.

## 컴포넌트 경계

- 페이지는 데이터 조회, 화면 상태 조합 및 이벤트 연결을 담당하는 컨테이너입니다.
- 헤더, 목록, 상세, 폼처럼 독립적인 UI 영역은 별도 컴포넌트로 분리합니다.
- 하위 UI 컴포넌트에는 필요한 데이터를 props로 전달합니다.
- 하위 표현 컴포넌트가 페이지 store를 직접 참조하지 않도록 합니다.
- props는 `const props = defineProps<...>()`로 선언하고 script와 template 모두
  `props.<name>`으로 접근합니다.
- 이벤트는 `const emit = defineEmits<...>()`로 선언하고 명시적인 handler에서 호출합니다.

### 작업 운영 상태

`OperationControlPanel`은 정규 운영 시간 외의 연장 옵션을 30분, 60분, 직접 입력으로
제공합니다. 직접 입력을 선택하면 한국시간 기준 종료 날짜, 시, 분을 구분해 입력하며,
현재보다 미래이고 24시간 이내인 값만 서버에 요청합니다.

### BAY 생성 흐름

BAY 생성 화면은 BAY 정보 입력 후 생성 옵션을 선택합니다. 기존 생성 옵션은 그대로 BAY를
생성할 수 있으며, 작업 변경이 필요한 경우에만 생성 옵션 카드 안의
`작업 내용 변경 후 생성`을 선택해 작업 추가·수정 단계로 진입합니다. 기본 선택인
`직접 작성`은 작업 편집기를 바로 표시합니다.

## Import

- 기능·페이지·공통 컴포넌트 사이의 import는 `@/` alias를 사용합니다.
- shadcn 기반 `components/ui/**` 내부에서 같은 컴포넌트 묶음의 primitive, variant,
  type을 가져오는 경우에는 같은 디렉터리의 상대경로 import를 허용합니다.
- 위 예외 외의 애플리케이션 코드에서는 `./`, `../` 상대경로 import를 사용하지 않습니다.
- 외부 패키지는 패키지 이름으로 import합니다.

```ts
import { Button } from '@/components/ui/button'
import BaySelector from '@/pages/index/components/BaySelector.vue'
import { storeToRefs } from 'pinia'
```

## 디자인 시스템

### 기본 원칙

- `app/components/ui`의 컴포넌트를 화면 구현의 기본 단위로 사용합니다.
- 색상, 높이, radius, hover 및 disabled 표현은 토큰과 컴포넌트 props로 관리합니다.
- 화면에서 전달하는 `class`는 폭, 정렬, 여백 등 배치 조정에 제한합니다.
- 같은 형태와 의미를 가진 UI 스타일을 페이지마다 복사하지 않습니다.
- shadcn primitive를 확장하되 접근성 속성과 slot 구조를 유지합니다.

### Button

일반 액션은 원시 `<button>` 대신 `@/components/ui/button`의 `Button`을 사용합니다.

#### Props

- `variant`: 표현 방식인 `solid`, `outline`, `soft`, `ghost`, `link`
- `tone`: 의미인 `neutral`, `brand`, `success`, `warning`, `danger`
- `size`: `xs`, `sm`, `md`, `lg`, `touch`, 콘텐츠 높이를 따르는 `content` 및 아이콘 전용
  크기
- `shape`: `default`, `compact`, `pill`
- `loading`, `loadingText`: 처리 중 상태
- `tooltip`: hover/focus 설명
- `disabledReason`: 비활성화 사유
- `tooltipSide`: tooltip 위치

```vue
<Button
  variant="solid"
  tone="success"
  size="md"
  :loading="pending"
  loading-text="저장 중"
  :disabled="!canSave"
>
  저장
</Button>
```

- 처리 중에는 disabled와 `aria-busy`를 함께 적용합니다.
- 아이콘 버튼은 `tooltip`과 `aria-label`을 함께 제공합니다.
- 비활성화 이유가 필요하면 `disabledReason`을 사용합니다.
- 클릭 가능한 버튼은 pointer cursor, disabled는 금지 cursor, loading은 wait cursor를 사용합니다.
- 링크형 액션은 `<Button as-child>` 내부에 `<NuxtLink>`를 둡니다.

### Tooltip

- `TooltipProvider`는 애플리케이션 root에서 한 번만 제공합니다.
- 개별 컴포넌트는 `Tooltip`, `TooltipTrigger`, `TooltipContent`를 조합합니다.
- 지연 시간처럼 애플리케이션 전체에서 동일해야 하는 설정은 Provider가 담당합니다.
- 버튼별 tooltip 표시 여부와 내용은 Button props가 담당합니다.

### DataTable

표 데이터와 옵션은 props로 전달하고 특정 영역은 slot으로 교체합니다.

#### 주요 Props

- `data`: 행 데이터
- `columns`: 열 정의
- `options`: 밀도, hover, stripe, sticky header 및 class
- `rowKey`: 행 식별자 또는 식별 함수
- `loading`, `loadingText`
- `emptyText`
- `caption`

열 정의는 `accessor`, `format`, `align`, 너비, class, attributes, 숨김 및 개별 셀 노출
여부를 지원합니다.

#### Slots

- `cell-{column.key}`: 특정 열의 셀
- `cell`: 모든 셀의 공통 fallback
- `header-{column.key}`: 특정 열 헤더
- `header-cell`: 모든 헤더의 공통 fallback
- `row`: 행 전체
- `header`, `body`, `footer`: 표 영역 전체
- `loading`, `empty`: 상태 영역
- `before-rows`, `after-rows`: 데이터 행 전후

```vue
<DataTable
  :data="users"
  :columns="[
    { key: 'name', header: '이름' },
    { key: 'status', header: '상태', align: 'center' },
  ]"
  :options="{ density: 'compact', striped: true }"
  row-key="id"
>
  <template #cell-status="{ row }">
    <Badge>{{ row.status }}</Badge>
  </template>
</DataTable>
```

### 디자인 시스템 테스트

- Button처럼 접근성과 실행 차단이 함께 필요한 컴포넌트는 상태별 DOM 속성과 이벤트를
  렌더링 테스트로 검증합니다.
- DataTable처럼 slot 확장 지점을 제공하는 컴포넌트는 기본 출력과 custom slot을 함께
  검증합니다.
- UI 테스트는 `happy-dom` 환경의 Vitest와 Vue Test Utils를 사용합니다.
- 임시 확인용 테스트나 디자인 샘플 페이지를 유지하지 않고, 실제 회귀를 방지하는
  테스트만 저장소에 둡니다.

### 브라우저 UI 캡처 정책

- 브라우저 또는 MCP로 프론트엔드 화면을 캡처할 때는 저장소 루트의
  `agent-test/` 디렉터리만 사용합니다.
- `agent-test/`는 `.gitignore` 대상이며 캡처 이미지와 임시 검수 산출물을
  Git에 추가하지 않습니다.
- 캡처 이미지를 `DOCS`, `app`, `public` 또는 다른 소스 디렉터리에 저장하지 않습니다.
- 저장한 이미지는 실제 파일을 열어 화면 상태를 확인한 뒤, 검수가 끝나면
  `agent-test/` 내부에서 모두 삭제합니다.
- 검수 결과를 영구 보관해야 할 때는 이미지가 아닌 문제와 조치 사항만 문서에 기록합니다.

## 반응형 UI

하나의 컴포넌트에 `size-8 md:size-10 lg:size-12`처럼 표현 조건을 누적해 동일 마크업을
변형하지 않습니다. 화면 구조나 조작 방식이 달라지는 경우 영역을 분리합니다.

```vue
<section data-layout="mobile" class="md:hidden">
  <MobileCards :items="items" />
</section>

<section data-layout="desktop" class="hidden md:block">
  <DataTable :data="items" :columns="columns" />
</section>
```

- 모바일, 태블릿, 데스크톱 UI는 필요한 breakpoint별로 독립된 영역을 둡니다.
- 각 영역은 해당 환경에 맞는 컴포넌트와 size token을 직접 사용합니다.
- `DataTable`은 표만 렌더링하며 모바일 카드 전환을 내부에서 처리하지 않습니다.
- breakpoint class는 영역의 표시 범위를 정하는 용도로 사용합니다.
- 구조가 동일하고 단순한 컨테이너 간격만 달라지는 경우에는 불필요한 마크업 복제를 피합니다.

## 전역 확인 UI

- 브라우저 기본 `alert`나 페이지별 modal 대신 `useGlobalAlertStore`를 사용합니다.
- `GlobalAlert`는 app root에서 한 번만 렌더링합니다.
- 표현 컴포넌트에는 `variant`와 `message`를 props로 전달합니다.
- `confirm`은 `Promise<boolean>`을 반환합니다.
- 취소, ESC, 배경 클릭 및 닫기는 모두 `false`입니다.
- variant는 `default`, `destructive`, `success`, `warning`을 지원합니다.

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

## 화면 로직

- 정렬, 상태 집계 및 필터링처럼 입력 데이터에서 파생되는 로직은 composable 또는 computed로
  관리합니다.
- 페이지에는 인증 초기화, 선택 및 해제, 상세 스크롤처럼 화면 흐름을 제어하는 로직을 둡니다.
- BAY 이름은 숫자를 고려한 자연 정렬을 사용합니다.
- API request/response 계약은 가능하면 `shared/api` 타입을 사용합니다.

## 권한 UI

- 권한 없는 액션은 숨기거나 비활성화하되 사유를 명확하게 전달합니다.
- Admin과 Manager는 `/admin` 아래의 동일한 관리 콘솔 UI와 경로를 사용합니다.
- BAY 및 BAY 템플릿 생성 액션은 Admin과 Manager에게 표시합니다.
- 계정 관리에서 Manager는 Worker 계정만 생성할 수 있습니다.
- Telegram 설정처럼 Admin 전용인 메뉴와 화면은 Manager에게 노출하지 않습니다.
- UI 표시 제어를 보안 수단으로 간주하지 않으며 서버와 route middleware에서 다시 검증합니다.

## 스타일과 접근성

- semantic HTML을 우선합니다.
- icon-only 액션에는 접근 가능한 이름을 제공합니다.
- 상태는 색상만으로 전달하지 않습니다.
- 모바일 액션의 터치 영역에는 `size="touch"`를 사용합니다.
- focus-visible 상태를 제거하지 않습니다.
- 폰트와 아이콘은 로컬 빌드 자산을 사용합니다.
