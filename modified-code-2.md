# 코드 리뷰 결과 (modified-code-2) — 에이전트 2: 주최자·모임·RSVP·대시보드·내 정보 영역

- 실행일: 2026-10-20
- 리뷰 범위: `app/protected/(dashboard)/**`, `app/protected/groups/**`, `app/protected/joined/**`, `app/protected/me/**`, `app/protected/` 루트 파일, `app/protected/events/[eventId]/**`(`settlement/` 제외), `components/groups/**`, `components/rsvp/**`, `components/dashboard/**`, `components/me/**`
- 검증: `npm run check-all` 통과(lint, type-check, format:check). 첫 실행 때 format:check가 범위 밖 파일 `app/auth/sign-up-success/page.tsx` 1건으로 실패했다(아래 "check-all 범위 밖 사유"). 재실행에서는 전체 통과했다.
- 브라우저 확인: 대상 화면(`/protected/groups/*`, `/protected/events/*`)은 개발 서버에서도 `/auth/login`으로 리다이렉트된다. 테스트 계정이 없어 playwright로는 확인하지 못했다. 렌더 결과(문구·버튼·닫힘 조건)는 코드 대조로만 검증했다.

## 요약
| 구분 | 건수 |
|---|---|
| 적용한 변경 | 4 |
| 제안(미적용) | 9 |
| 수정한 파일 | 9 (신규 1 + 수정 8) |

처리 중에는 닫히지 않는 확인 대화상자가 5곳에 거의 같은 코드로 들어 있었다. 이를 `ConfirmActionDialog`로 추출하고 호출부를 모두 교체했다. 그 밖에 회차 목록의 라벨 삼항 중첩을 상수 맵으로 바꾸고, `GroupList`를 제네릭으로 만들어 참여한 모임 목록의 불필요한 Map을 없앴다.

## 적용한 변경

### 1. 처리 중 닫힘 방지 확인 대화상자 추출 — `공통화`
- **무엇이 문제였나:** `AlertDialog` + pending 상태에서 닫힘 차단 + 두 버튼 비활성화 + 진행 문구 전환 구조가 5곳에 복제돼 있었다.
  - `components/groups/event-list.tsx:343-365`(회차 취소)
  - `components/groups/group-detail.tsx:222-244`(모임 삭제)
  - `components/groups/member-roster.tsx:246-268`(멤버 삭제)
  - `components/rsvp/host-rsvp-status.tsx:430-451`(응답 삭제)
  - `components/rsvp/invite-link-card.tsx:193-213`(초대 링크 재발급)
- **어떻게 바꿨나:** `components/groups/confirm-action-dialog.tsx`에 `ConfirmActionDialog`를 만들었다. props는 `open`, `onOpenChange`, `pending`, `title`, `description`, `cancelLabel`(기본값 "취소"), `confirmLabel`, `pendingLabel`, `onConfirm`이다. 컴포넌트가 `pending`일 때 `onOpenChange` 호출을 막으므로, 호출부에서는 pending 조건을 뺐다. 위치는 RSVP 컴포넌트도 이미 쓰는 `components/groups/action-feedback.ts`와 같은 폴더로 정했다.
- **영향 파일:** `components/groups/confirm-action-dialog.tsx`(신규), `components/groups/event-list.tsx`, `components/groups/group-detail.tsx`, `components/groups/member-roster.tsx`, `components/rsvp/host-rsvp-status.tsx`, `components/rsvp/invite-link-card.tsx`
- **Before / After:**
  ```tsx
  // Before (member-roster.tsx)
  <AlertDialog open={deleting !== null}
    onOpenChange={(open) => !open && !deletePending && setDeleting(null)}>
    ...<AlertDialogAction disabled={deletePending} onClick={confirmDelete}>
         {deletePending ? "삭제하는 중..." : "삭제"}...
  // After
  <ConfirmActionDialog open={deleting !== null}
    onOpenChange={(open) => !open && setDeleting(null)} pending={deletePending}
    title={<>{deleting?.name} 님을 삭제할까요?</>} description="..."
    confirmLabel="삭제" pendingLabel="삭제하는 중..." onConfirm={confirmDelete} />
  ```
- **동작 변화:** 없음. 닫힘 조건, 버튼 비활성화, 문구가 모두 같다. 회차 취소의 "돌아가기" 라벨은 `cancelLabel`로 그대로 넘긴다. JSX 줄바꿈으로 공백 하나가 되던 설명문은 같은 공백을 넣은 문자열로 옮겼다. 제목에 `deleting?.name`이 들어가는 곳은 null일 때 `undefined`가 찍히지 않도록 템플릿 문자열 대신 JSX 프래그먼트로 넘겼다.

### 2. 회차 다이얼로그 제목·저장 토스트를 상수 맵으로 통합 — `품질`
- **무엇이 문제였나:** `components/groups/event-list.tsx`에서 같은 `create/edit/duplicate` 분기 문구가 삼항 중첩으로 세 번 반복됐다(`:112-127` 시뮬레이션 토스트, `:138-144` 저장 토스트, `:198-203` 다이얼로그 제목). 취소 토스트 문구도 두 번 하드코딩돼 있었다(`:167`, `:181`).
- **어떻게 바꿨나:** `FORM_DIALOG_TITLE`, `SAVED_MESSAGE`(`Record<FormKind, string>`)와 `CANCELLED_MESSAGE` 상수로 모았다. 시뮬레이션 경로의 토스트는 if/else 뒤 한 곳에서 호출한다.
- **영향 파일:** `components/groups/event-list.tsx`
- **동작 변화:** 없음. `formState`가 null일 때 쓰는 기본값("회차 추가", "회차를 추가했어요.")도 기존 삼항의 else와 같다.

### 3. `GroupList` 제네릭화로 참여한 모임 Map 제거 — `품질`
- **무엇이 문제였나:** `GroupList`의 `getHref`가 `Group`만 받았다. 그래서 `JoinedGroupsView`는 `nextEvent`를 쓰려고 렌더마다 `id → nextEvent` Map을 따로 만들었다(`components/groups/home-groups.tsx:95-106`).
- **어떻게 바꿨나:** `GroupList<T extends Group>`와 `getHref?: (group: T) => ...`로 바꿨다. `JoinedGroupsView`는 `group.nextEvent`를 직접 읽는다. 기본값 `hostedGroupHref(group: Group)`는 그대로 쓸 수 있다.
- **영향 파일:** `components/groups/group-list.tsx`, `components/groups/home-groups.tsx`
- **동작 변화:** 없음. 링크 경로와 null 조건이 같다.

### 4. 미사용 export 제거 — `품질`
- **무엇이 문제였나:** `components/rsvp/rsvp-form.tsx:43`의 `EMPTY_RSVP_VALUES`가 export돼 있었지만 저장소 어디에서도 import하지 않았다(grep 확인).
- **어떻게 바꿨나:** 파일 내부 상수로 바꿨다.
- **영향 파일:** `components/rsvp/rsvp-form.tsx`
- **동작 변화:** 없음

## 제안 (미적용)
| # | 제안 | 이유 | 적용 시 영향 | 우선순위 |
|---|---|---|---|---|
| 1 | 정원 표기 헬퍼 `formatCapacity(capacity)`("제한 없음"/"N명")를 `lib/format.ts`에 추가하고 4곳을 교체: `app/protected/events/[eventId]/page.tsx:71`, `app/protected/joined/[eventId]/page.tsx:49`, `components/groups/event-list.tsx:268-269`, `app/i/[token]/page.tsx:34` | `lib/format.ts`는 에이전트 3, `app/i`는 에이전트 1 범위라 직접 추가할 수 없음 | 4개 파일, 동작 불변 | 중 |
| 2 | 빈 상태 컨테이너 `EmptyState` 공통 컴포넌트 추출. `flex flex-col items-center gap-3 rounded-md border border-dashed p-6 text-center`가 5곳에 반복된다: `components/groups/event-list.tsx:230`, `components/groups/group-list.tsx:114`, `components/rsvp/host-rsvp-status.tsx:275`, `components/dashboard/dashboard-cards.tsx:213`, `components/settlement/settlement-manager.tsx:236` | 여러 도메인이 함께 쓰므로 `components/layout/`(에이전트 3 범위)에 두는 게 맞음. 대시보드는 `section`+heading이라 `as` 처리 설계도 필요 | 5개 파일, 동작 불변 | 중 |
| 3 | 정산 화면의 같은 확인 대화상자 패턴도 `ConfirmActionDialog`로 교체: `components/settlement/settlement-manager.tsx`, `components/settlement/settlement-link-card.tsx`, `components/settlement/public-settlement-view.tsx` | 에이전트 3 범위. 이번에 만든 컴포넌트를 그대로 쓸 수 있는지 각 파일의 닫힘 조건을 확인해야 함 | 3개 파일 | 중 |
| 4 | `ConfirmActionDialog`와 `action-feedback.ts`를 도메인 중립 위치(예: `components/layout/` 또는 `components/shared/`)로 이동 | RSVP·정산이 `components/groups/`의 헬퍼를 import하는 구조라 위치가 어색함. 다만 대규모 파일 이동이고 범위 밖 폴더가 필요함 | import 경로 다수 변경 | 하 |
| 5 | 회차 헤더(뒤로 가기 링크, 제목+상태 배지, 일시, 장소, 정원, 설명)를 `EventSummaryHeader` 같은 컴포넌트로 추출 | 범위 안에서는 `app/protected/events/[eventId]/page.tsx:52-76`과 `app/protected/joined/[eventId]/page.tsx:31-60` 2곳뿐이고 마감 표시 등이 달라 3회 규칙에 못 미침. 뒤로 가기 링크 클래스는 `settlement/page.tsx:43`까지 3곳이지만 정산 페이지는 에이전트 3 범위 | 2~3개 파일 | 하 |
| 6 | 세션 확인 `getClaims()`와 "개발 환경 목업 미리보기면 리다이렉트 생략" 정책을 `lib/data/session.ts` 같은 헬퍼로 통합: `app/protected/(dashboard)/page.tsx:22-27,47-49`, `app/protected/me/page.tsx:12-16,29-31` | 범위 안에서는 2곳이고 `lib/data`는 에이전트 3 범위. me 페이지만 `hasEnvVars` 확인이 없어 env가 없으면 `createClient()`에서 실패할 수 있다(대시보드와 다름). 이 차이를 맞추는 것은 동작 변경 | 2개 파일, env 미설정 시 동작 변화 | 중 |
| 7 | `EventStatusBadge` 취소 상태의 `text-white dark:text-black`(`components/groups/event-status-badge.tsx:14`)를 `text-warning-foreground` 토큰으로 교체 | 하드코딩 색상. `app/globals.css`에 `--warning-foreground`가 없어 토큰 추가가 먼저 필요함(범위 밖) | globals.css + 1개 파일 | 하 |
| 8 | "마감" 회색 배지 스타일 `bg-muted text-muted-foreground` 통일: `components/groups/event-status-badge.tsx:11-12`, `components/rsvp/rsvp-deadline-card.tsx:129-131` | 2곳뿐이라 3회 규칙에 못 미침. Badge에 `muted` variant를 추가하려면 `components/ui/badge.tsx`(어느 에이전트 범위도 아님)를 수정해야 함 | 2개 파일 + ui | 하 |
| 9 | 회차 폼의 "과거 시각" 경고가 브라우저 로컬 시각(`nowLocalString`, `components/groups/event-form.tsx:72`)으로 판정함. 나머지는 KST(`nowKstLocalString`)로 판정하므로 맞추기 | 한국 외 시간대 사용자에게 경고 여부가 달라지는 동작 변경임 | 1개 파일, 표시 조건 변화 | 하 |

## ISSUES 후보

호출자가 `ISSUES.md`의 해당 절에 옮겨 주세요.

```
- [ ] (UI/UX) 정원 대비 참석 인원 표기 불일치 — 같은 값이 화면마다 "참석 3/10명"(대시보드 `components/dashboard/dashboard-cards.tsx:131-133`, 공개 목록 `components/rsvp/public-rsvp-list.tsx:36-37`)과 "3/10"(주최자 응답 현황 `components/rsvp/host-rsvp-status.tsx:212-215`)으로 다르게 보인다. 공통 처리 후보(정원 표기 헬퍼와 함께)
- [ ] (UI/UX) 목록 개수 표기 불일치 — 내 모임 "3개"(`components/groups/group-list.tsx:55`), 회차 "회차 (3)"(`components/groups/event-list.tsx:216`), 멤버 "멤버 명부 (3명)"(`components/groups/member-roster.tsx:154`)처럼 섹션마다 형식이 다르다. 공통 처리 후보
- [ ] (UI/UX) 회차 폼 과거 시각 경고가 브라우저 시간대 기준 — `components/groups/event-form.tsx:72`는 `nowLocalString()`(브라우저 로컬)을 쓰고, 마감·상태 판정은 KST 기준이라 해외 시간대에서 경고 여부가 어긋날 수 있다
```

## check-all 범위 밖 사유

- 첫 실행의 format:check에서 `app/auth/sign-up-success/page.tsx` 경고가 나왔다. 이 파일은 에이전트 1 범위이고, 실행 중 작업 트리에 새로 수정 표시(`M`)가 생긴 파일이다(대화 시작 시점 git status에는 없었다). 내 변경은 이 파일을 import하거나 수정하지 않으므로 영향이 없다. 재실행에서는 통과했다.
- 같은 실행에서 내 신규 파일 `components/groups/confirm-action-dialog.tsx`의 포맷 경고도 함께 나왔다. 이 파일은 Prettier로 정리했다.

## 변경 파일 목록
| 파일 | 변경 요약 |
|---|---|
| `components/groups/confirm-action-dialog.tsx` | 신규: 처리 중 닫힘을 막는 확인 대화상자 `ConfirmActionDialog` |
| `components/groups/event-list.tsx` | 회차 취소 대화상자 교체, 제목·토스트 문구 상수 맵 통합 |
| `components/groups/group-detail.tsx` | 모임 삭제 대화상자 교체 |
| `components/groups/member-roster.tsx` | 멤버 삭제 대화상자 교체 |
| `components/rsvp/host-rsvp-status.tsx` | 응답 삭제 대화상자 교체 |
| `components/rsvp/invite-link-card.tsx` | 초대 링크 재발급 대화상자 교체 |
| `components/groups/group-list.tsx` | `GroupList`를 `T extends Group` 제네릭으로 변경 |
| `components/groups/home-groups.tsx` | 참여한 모임 링크 계산에서 Map 제거, `group.nextEvent` 직접 사용 |
| `components/rsvp/rsvp-form.tsx` | 미사용 export `EMPTY_RSVP_VALUES`를 내부 상수로 변경 |
