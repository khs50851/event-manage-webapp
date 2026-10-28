# 코드 리뷰 결과 (modified-code-3) — 에이전트 3

- 실행일: 2026-10-20
- 리뷰 범위: `app/protected/events/[eventId]/settlement/**`, `components/settlement/**`, `components/layout/**`, `lib/` 최상위 파일, `lib/data/**`, `lib/mock/**`, `lib/types/**`
- 검증: `npm run check-all` — lint·type-check 통과, format:check 실패(범위 밖 2개 파일, 아래 "check-all 실패 사유" 참고)

## 요약
| 구분 | 건수 |
|---|---|
| 적용한 변경 | 7 |
| 제안(미적용) | 8 |
| 수정한 파일 | 16 (신규 1 포함) |

데이터 계층의 읽기 실패 처리(`readFailed`)와 더미 지연(`mockDelay`)·클라이언트 타입을 `lib/data/source.ts` 하나로 모았고, 더미 토큰 생성기를 `lib/mock/token.ts`로 추출했다. 화면·문구 변화는 없다.

## 적용한 변경

### 1. 더미 토큰 생성기 추출 — `공통화`
- **무엇이 문제였나:** 16바이트 무작위 16진수 토큰을 만드는 코드가 3곳에 복제돼 있었다. `components/settlement/settlement-manager.tsx:497`(`createMockToken`), `components/settlement/settlement-link-card.tsx:91`(`confirmReissue` 안), 범위 밖 `components/rsvp/invite-link-card.tsx:99`(`simulateReissue`).
- **어떻게 바꿨나:** `lib/mock/token.ts`에 `createMockToken()`을 만들고, 범위 안 두 호출부를 이 함수로 바꿨다. 범위 밖 호출부는 제안 1로 넘긴다.
- **영향 파일:** `lib/mock/token.ts`(신규), `components/settlement/settlement-manager.tsx`, `components/settlement/settlement-link-card.tsx`
- **동작 변화:** 없음

### 2. 읽기 실패 처리 `readFailed` 통합 — `공통화`
- **무엇이 문제였나:** "오류 코드만 로그로 남기고 일반 메시지로 throw"하는 같은 처리가 4곳에 있었다. `lib/data/groups.ts:41`, `lib/data/invites.ts:27`에는 함수로 따로 정의돼 있었고, `lib/data/dashboard.ts:139-141`, `lib/data/me.ts:104-106`에는 인라인으로 들어 있었다.
- **어떻게 바꿨나:** `lib/data/source.ts`에 `readFailed(scope, code): never`를 export하고, 네 파일 모두 이 함수를 쓰게 바꿨다.
- **영향 파일:** `lib/data/source.ts`, `lib/data/groups.ts`, `lib/data/invites.ts`, `lib/data/dashboard.ts`, `lib/data/me.ts`
- **동작 변화:** 사용자 쪽 변화는 없다. 서버 로그에서만, groups.ts 경로에서 code가 `undefined`일 때 `undefined` 대신 `unknown`이 찍힌다(invites.ts 쪽 규칙으로 통일).

### 3. 정산 조회의 자체 지연 함수를 `mockDelay`로 교체 — `공통화`
- **무엇이 문제였나:** `lib/data/settlements.ts:19-23`이 `lib/data/source.ts:50-54`의 `mockDelay`와 똑같은 300ms 지연(`MOCK_DELAY_MS`, `delay()`)을 다시 정의하고 있었다.
- **어떻게 바꿨나:** 로컬 정의를 지우고 `mockDelay`를 import해 세 호출부에서 쓰게 했다.
- **영향 파일:** `lib/data/settlements.ts`
- **동작 변화:** 없음(같은 300ms)

### 4. `ServerSupabaseClient` 타입 중복 정의 제거 — `정합성`
- **무엇이 문제였나:** `lib/data/avatars.ts:9`가 `lib/data/source.ts:10`에서 이미 export하는 `ServerSupabaseClient`를 똑같이 다시 정의하고 있었다.
- **어떻게 바꿨나:** `import type { ServerSupabaseClient } from "@/lib/data/source"`로 바꿨다.
- **영향 파일:** `lib/data/avatars.ts`
- **동작 변화:** 없음(타입만 변경)

### 5. 두 자리 0 채움 헬퍼 `padTwo` 추출 — `공통화`
- **무엇이 문제였나:** `String(n).padStart(2, "0")` 헬퍼가 3곳에 따로 있었다. `lib/format.ts:62`(`nowLocalString` 안), `lib/dashboard.ts:27`(`addDaysToLocalString` 안), `lib/data/mappers.ts:27`(모듈 함수 `pad`).
- **어떻게 바꿨나:** `lib/format.ts`에 `padTwo()`를 export하고 세 곳에서 이 함수를 쓰게 했다.
- **영향 파일:** `lib/format.ts`, `lib/dashboard.ts`, `lib/data/mappers.ts`
- **동작 변화:** 없음

### 6. 정산 대상 라벨을 한 번만 계산 — `품질`
- **무엇이 문제였나:** `SettlementManager`가 `labelCandidates(candidates)`로 라벨을 만들고(`settlement-manager.tsx:102`, 주석에는 "대상 선택기와 입금 현황이 함께 쓴다"고 적혀 있음), `SettlementTargetPicker`도 렌더할 때마다 같은 계산을 또 했다(`settlement-target-picker.tsx:39`).
- **어떻게 바꿨나:** 대상 선택기에 `labels` prop을 추가하고, 부모가 만든 Map을 넘기게 했다. 이 컴포넌트를 쓰는 곳은 `SettlementManager` 하나뿐이다.
- **영향 파일:** `components/settlement/settlement-target-picker.tsx`, `components/settlement/settlement-manager.tsx`
- **Before / After:**
  ```tsx
  // Before (picker 내부)
  const labels = labelCandidates(candidates);
  // After (manager)
  <SettlementTargetPicker candidates={candidates} labels={labels} ... />
  ```
- **동작 변화:** 없음(입력이 같아 결과 Map도 같다)

### 7. 실제 코드와 맞지 않는 주석 수정 — `정합성`
- **무엇이 문제였나:** `lib/types/domain.ts:237-238`의 `JoinedGroup` 설명이 `JoinedEventDetail` 위에 붙어 있었다. `lib/mock/data.ts:16`은 "로그인 상태면 이메일만 덮어쓴다"고 설명했지만, 실제 `getMyProfile`은 세션이 없을 때만 `mockProfile`을 반환한다(`lib/data/me.ts:42-45`).
- **어떻게 바꿨나:** 주석을 올바른 타입 위로 옮기고, mock 주석을 실제 동작에 맞게 고쳤다.
- **영향 파일:** `lib/types/domain.ts`, `lib/mock/data.ts`
- **동작 변화:** 없음(주석만 변경, 타입 이름·시그니처는 그대로)

## 제안 (미적용)
| # | 제안 | 이유 | 적용 시 영향 | 우선순위 |
|---|---|---|---|---|
| 1 | `components/rsvp/invite-link-card.tsx:98-103` `simulateReissue`에서 `createMockToken()`(`lib/mock/token.ts`) 사용 | 범위 밖 파일(`components/rsvp/`)이라 직접 고치지 않음 | 복제 3곳이 모두 정리됨. 동작 변화 없음 | 중 |
| 2 | `useOrigin`(`settlement-link-card.tsx:38-49`, `invite-link-card.tsx`)을 공통 훅으로 추출 | 아직 2곳뿐이고 한 곳이 범위 밖 | 하이드레이션 안전 패턴을 한 곳에서 관리 | 낮 |
| 3 | 클립보드 복사 + "복사했어요" 표시 타이머를 공통 훅으로 추출(`settlement-link-card.tsx:70-87`, `public-settlement-view.tsx:89-93,149-157`, `invite-link-card.tsx:71-78`) | 실패 문구가 화면마다 달라 통일하면 사용자에게 보이는 문구가 바뀜. 한 곳은 범위 밖. `public-settlement-view.tsx:91`은 `COPIED_FEEDBACK_MS` 대신 리터럴 `2000`을 씀 | 복사 UX·문구 일관화 | 중 |
| 4 | 인라인 오류 표시(`TriangleAlertIcon` + `text-destructive`)를 공통 컴포넌트로 추출(`settlement-manager.tsx:344-355,466-472`, `settlement-form.tsx:171-179`, `components/groups/event-form.tsx:112`, `components/groups/member-roster.tsx:211`, `components/rsvp/host-rsvp-status.tsx:268`, `components/rsvp/invite-rsvp-panel.tsx:194,232`) | 여러 범위에 걸쳐 있고, 테두리 유무·`aria-hidden` 유무처럼 스타일이 조금씩 달라 통일하면 화면이 바뀜 | 오류 표시 일관화, 접근성 속성 누락 방지 | 중 |
| 5 | `mockGroupsByRole`과 참여 모임 `{...group, nextEvent: null}` 매핑(`lib/data/groups.ts:41-46,107-111`, `lib/data/dashboard.ts:69-88`)을 groups.ts export 하나로 통합 | 아직 2곳뿐(3번째 반복부터 추출하는 기준). 어차피 I5-3 더미 제거 때 함께 사라질 코드 | 더미 경로 중복 제거 | 낮 |
| 6 | `lib/avatar-image.ts`(sharp 사용, 서버 전용)에 `import "server-only"` 추가 | `server-only` 패키지가 `package.json`에 없어 의존성을 추가해야 함 | 클라이언트 번들에 실수로 import되면 빌드 단계에서 막힘 | 낮 |
| 7 | `lib/types/domain.ts:1`, `:13`의 "연동 단계(I1)에서 생성 타입으로 교체한다" 주석 정리 | I1은 완료됐고 도메인 타입을 유지하기로 했음(`mappers.ts:17-19`). 공통 파일이라 문서 방침 확인 후 수정 권장 | 주석만 변경 | 낮 |
| 8 | `lib/utils.ts:8` 영어 튜토리얼 주석("This check can be removed...")을 한국어로 바꾸고 실제 용도(EnvVarWarning·proxy 세션 체크 스킵)를 적기 | 공통 파일이라 시그니처 외 수정도 보수적으로 둠. ISSUES 후보로도 기록 | 주석만 변경 | 낮 |

## ISSUES 후보

```
- [ ] (문구) 복사 실패 안내 문구가 화면마다 다름 — 초대 링크는 "링크를 직접 선택해 복사해 주세요."(components/rsvp/invite-link-card.tsx:76), 정산 화면은 "내용을 길게 눌러 직접 복사해 주세요."(components/settlement/settlement-link-card.tsx:85, components/settlement/public-settlement-view.tsx:155). 공통 처리 후보(클립보드 복사 훅)
- [ ] (코드 정리) 인라인 오류 표시 마크업이 화면마다 조금씩 다름 — TriangleAlertIcon + text-destructive 조합의 테두리·aria-hidden 유무가 다름(settlement-manager, settlement-form, event-form, member-roster, host-rsvp-status, invite-rsvp-panel). 공통 처리 후보(InlineError 컴포넌트)
- [ ] (코드 정리) lib/utils.ts의 hasEnvVars에 영어 튜토리얼 주석이 남아 있음 — "This check can be removed"라고 되어 있지만 실제로는 EnvVarWarning·proxy 세션 체크 스킵에 쓰인다. 공통 처리 후보 아님
```

## check-all 실패 사유 (범위 밖)

`format:check`가 아래 2개 파일에서 실패한다. 둘 다 내 범위 밖이며 내 diff에 포함되지 않는다(`git diff --stat`의 담당 경로 목록에 없음).

- `app/auth/sign-up-success/page.tsx` — 작업 트리에서 수정됨(` M`), 다른 에이전트의 작업 중 변경으로 보임
- `components/groups/confirm-action-dialog.tsx` — 미추적 신규 파일(`??`), 다른 에이전트가 만든 파일로 보임

내 변경 파일은 모두 Prettier 검사를 통과했고(`lib/data/me.ts`는 `prettier --write`로 정리), lint·type-check도 통과했다. 화면 변화가 없는 리팩터링이라 playwright 확인은 하지 않았다.

## 변경 파일 목록
| 파일 | 변경 요약 |
|---|---|
| `lib/mock/token.ts` | 신규: `createMockToken()` |
| `components/settlement/settlement-manager.tsx` | 로컬 `createMockToken` 제거·공통 함수 import, 대상 선택기에 `labels` 전달 |
| `components/settlement/settlement-link-card.tsx` | 재발급 토큰 생성을 `createMockToken()`으로 교체 |
| `components/settlement/settlement-target-picker.tsx` | `labels` prop 추가, 내부 `labelCandidates` 재계산 제거 |
| `lib/data/source.ts` | `readFailed` export 추가 |
| `lib/data/groups.ts` | 로컬 `readFailed` 제거, source에서 import |
| `lib/data/invites.ts` | 로컬 `readFailed` 제거, source에서 import |
| `lib/data/dashboard.ts` | 인라인 실패 처리를 `readFailed`로 교체 |
| `lib/data/me.ts` | 인라인 실패 처리를 `readFailed`로 교체 |
| `lib/data/settlements.ts` | 로컬 `delay`/`MOCK_DELAY_MS` 제거, `mockDelay` 사용 |
| `lib/data/avatars.ts` | `ServerSupabaseClient` 중복 정의 제거, source의 타입 import |
| `lib/format.ts` | `padTwo` export 추가, `nowLocalString`에서 사용 |
| `lib/dashboard.ts` | `addDaysToLocalString`에서 `padTwo` 사용 |
| `lib/data/mappers.ts` | 로컬 `pad` 제거, `padTwo` 사용 |
| `lib/types/domain.ts` | `JoinedGroup` 주석 위치 수정 |
| `lib/mock/data.ts` | `mockProfile` 주석을 실제 동작에 맞게 수정 |
