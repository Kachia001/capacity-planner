# UI MCP 검수

> 검수일: 2026-07-29
> 환경: Chrome MCP, `localhost:3000`, Admin 로그인 세션
> Viewport: Desktop 1440×1000, Mobile 390×844

검수에 사용한 스크린샷은 임시 캡처 정책에 따라 확인 후 삭제했으며,
이 문서에는 텍스트 결과만 유지합니다.

## 범위

- 계정 목록의 desktop DataTable과 mobile card
- BAY 목록의 desktop DataTable과 mobile card
- BAY template 생성 화면의 disabled button, cursor, tooltip
- 모바일 관리자 내비게이션
- DOM semantic, 접근 가능한 이름, console error, horizontal overflow

## 결과 요약

기능을 막는 레이아웃 오류나 브라우저 console error는 발견되지 않았습니다.
반응형 목록 분리, Button disabled 동작, tooltip, 모바일 drawer는 정상입니다.

다음 두 항목은 보완이 필요합니다.

1. 모바일 조회 카드의 `ACCOUNT SEARCH`, `SEARCH FORM` 보조 라벨이 설명문과
   겹칩니다.
2. 계정 카드의 이메일 텍스트는 10px, `rgb(150, 157, 148)` on white로 계산상
   대비가 약 2.78:1입니다. 일반 텍스트의 WCAG AA 4.5:1 기준에 미달합니다.

## 단계별 증거

### 1. 계정 목록 desktop — 양호

- DataTable header, row, cell semantic이 유지됩니다.
- 검색 조건, 주요 액션, 결과 수와 표의 시각적 계층이 명확합니다.
- 표의 열 잘림이나 수평 overflow가 없습니다.

### 2. 계정 목록 mobile — 보완 필요

- table 대신 독립된 account card 영역이 표시됩니다.
- `ACCOUNT SEARCH` 라벨이 조회 설명문 위로 겹칩니다.
- 이메일 보조 텍스트의 대비가 약 2.78:1로 낮습니다.

### 3. BAY 목록 mobile — 보완 필요

- mobile card 전환과 필터의 세로 재배치는 정상입니다.
- `SEARCH FORM` 라벨이 설명문 위로 겹칩니다.
- 생성 액션 두 개는 viewport 안에서 잘리지 않습니다.

### 4. BAY 목록 desktop — 양호

- desktop DataTable 한 개가 렌더링되며 행 정보가 정렬됩니다.
- progress, 상태, 이슈 및 상세 액션의 구분이 유지됩니다.
- 긴 목록에서도 header와 column alignment 문제가 확인되지 않았습니다.

### 5. Disabled button tooltip — 양호

- `템플릿 저장`은 `aria-disabled="true"`이며 클릭되지 않습니다.
- computed cursor는 `not-allowed`, enabled button은 `pointer`로 확인했습니다.
- 400ms 후 비활성 사유 tooltip이 표시되고 버튼 위치는 바뀌지 않습니다.

### 6. Template 생성 mobile — 대체로 양호

- header와 form은 viewport 폭 안에서 재배치됩니다.
- 하단 저장 액션은 고정되어 주요 액션 접근성이 유지됩니다.
- 고정 action bar가 화면 일부를 덮기 때문에 실제 최하단까지 scroll했을 때
  마지막 입력 영역이 가려지지 않는지는 추가 확인이 필요합니다.

### 7. 모바일 내비게이션 — 양호

- drawer는 `dialog`와 제목·설명을 제공합니다.
- 열릴 때 내부 control로 focus가 이동하고, 닫은 뒤
  `내비게이션 열기` 버튼으로 focus가 복귀합니다.
- 현재 메뉴 상태와 닫기·로그아웃 control이 구분됩니다.

## 추가 확인 결과

- 브라우저 console error/warning: 0
- mobile document horizontal overflow: 없음 (`scrollWidth = clientWidth = 390`)
- 접근 가능한 이름이 없는 visible button: 0
- 계정·BAY desktop 표: semantic `table`/`rowgroup`/`row`/`columnheader`/`cell`
- 계정·BAY mobile 목록: semantic `article`

## 검수 한계

- Admin 세션 기준이므로 Manager·Worker 전용 화면은 이번 캡처에 포함하지 않았습니다.
- 화면 캡처와 DOM 확인만으로 screen reader 전체 읽기 순서나 실제 WCAG 준수를
  확정할 수 없습니다.
- template mobile 최하단 scroll 확인은 브라우저 scroll 제어가 중단되어 완료하지
  못했습니다.
