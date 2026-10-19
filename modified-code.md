# 코드 리뷰 결과 (modified-code)

- 실행일: 2026-10-19
- 리뷰 범위: 전체 (`app/`, `components/`, `lib/`)
- 검증: `npm run check-all` 통과 (`npm run build`와 화면 확인은 하지 않음)

## 요약
| 구분 | 건수 |
|---|---|
| 적용한 변경 | 2 |
| 제안(미적용) | 4 |
| 수정한 파일 | 13 (수정 11 + 신규 2) |

라우트의 `error.tsx` 7개와 `not-found.tsx` 4개가 문구·링크만 다른 같은 구조여서 공통 컴포넌트 2개로 추출했다. 화면에 보이는 문구와 동작은 그대로다.

## 적용한 변경
### 1. 라우트 오류 경계 공통화 — `공통화`
- **무엇이 문제였나:** `error.tsx` 7개가 `useEffect` 로그, `role="alert"` 박스, 안내 문구, "다시 시도" 버튼까지 동일하고 제목·부가 문장만 달랐다(`app/protected/groups/[groupId]/error.tsx` 등 7곳).
- **어떻게 바꿨나:** `RouteErrorFallback`(`title`, 선택 `hint`)을 만들고 각 `error.tsx`는 `"use client"`와 함수 시그니처만 남겨 위임한다. 오류 경계는 클라이언트 컴포넌트여야 하므로 각 파일의 `"use client"`는 유지했다. 비회원 화면(`/i`, `/s`)의 "문제가 계속되면 주최자에게 알려 주세요."는 `hint`로 보존했다.
- **영향 파일:** `components/layout/route-error-fallback.tsx`(신규), `app/i/[token]/error.tsx`, `app/s/[token]/error.tsx`, `app/protected/(dashboard)/error.tsx`, `app/protected/groups/[groupId]/error.tsx`, `app/protected/events/[eventId]/error.tsx`, `app/protected/events/[eventId]/settlement/error.tsx`, `app/protected/joined/[eventId]/error.tsx`
- **동작 변화:** 없음 (제목·안내 문구·버튼 동일)

### 2. not-found 화면 공통화 — `공통화`
- **무엇이 문제였나:** `not-found.tsx` 4개가 제목·설명·돌아가기 링크 외에는 같은 마크업이었다(그중 2개는 문구까지 동일).
- **어떻게 바꿨나:** 서버 컴포넌트 `NotFoundNotice`(`title`, `description`, `href`, `linkLabel`)로 추출하고 4곳을 교체했다. 각 파일의 설명 주석은 유지했다.
- **영향 파일:** `components/layout/not-found-notice.tsx`(신규), `app/protected/groups/[groupId]/not-found.tsx`, `app/protected/events/[eventId]/not-found.tsx`, `app/protected/events/[eventId]/settlement/not-found.tsx`, `app/protected/joined/[eventId]/not-found.tsx`
- **동작 변화:** 없음

## 제안 (미적용)
| # | 제안 | 이유 | 적용 시 영향 | 우선순위 |
|---|---|---|---|---|
| 1 | 확인 대화상자(`AlertDialog`) 공통화 | 9곳(`event-list`, `member-roster`, `group-detail`, `host-rsvp-status`, `invite-link-card`, `settlement-manager`, `settlement-link-card`, `public-settlement-view`, `avatar-uploader`)에서 같은 틀을 쓰지만 처리 중 상태·닫힘 방지 로직이 화면마다 달라, 동작 보존 여부를 화면별로 확인해야 해서 보류 | 중복 약 100줄 감소, 확인 흐름 일관화 | 중 |
| 2 | Server Action 호출 패턴(`try/catch` + `isDevPreviewFallback` + 실패 보고) 훅/헬퍼화 | 8개 파일의 약 12곳에서 반복된다. 다만 화면마다 성공 후 처리가 달라 추상화 모양을 먼저 정해야 한다 | 폼·삭제 핸들러 단순화 | 중 |
| 3 | 디자인 토큰 `--warning-foreground` 추가 | `components/groups/event-status-badge.tsx:14`의 `text-white dark:text-black`가 색 하드코딩이다. `app/globals.css`에 토큰을 두면 규칙을 지킬 수 있다 | 라이트/다크 대비 재확인 필요 | 낮음 |
| 4 | 상태 배지 컴포넌트 통합(`EventStatusBadge`, `ShareStatusBadge`, 응답 마감 카드의 인라인 배지) | 같은 "상태 배지" 개념이 3곳에 따로 있지만 각각 아이콘·variant 규칙이 달라 지금 합치면 오히려 복잡해진다. 4번째 사용처가 생기면 재검토 | 낮음 | 낮음 |

## 변경 파일 목록
| 파일 | 변경 요약 |
|---|---|
| `components/layout/route-error-fallback.tsx` | 신규: 오류 경계 공통 화면 |
| `components/layout/not-found-notice.tsx` | 신규: not-found 공통 화면 |
| `app/**/error.tsx` (7개) | `RouteErrorFallback`으로 위임 |
| `app/**/not-found.tsx` (4개) | `NotFoundNotice`로 교체 |
