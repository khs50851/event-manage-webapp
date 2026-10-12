# DB 스키마·권한 설계 메모 (I0)

- 작성: 2026-10-12 (I0 완료 시점). 대상 프로젝트: `ecandzpftfinazfonvcl`(`.mcp.json` 기준)
- 실제 상태는 항상 `list_tables(verbose: true)`·`list_migrations`로 다시 확인한다. 이 문서는 설계 의도와 결정 근거를 남긴다.

## 마이그레이션 이력

| 순서 | 이름 | 내용 |
|---|---|---|
| 1 | `harden_default_privileges_and_private_schema` | public 신규 객체의 anon/authenticated 자동 권한 회수, 비노출 `private` 스키마, `set_updated_at`·`generate_token` |
| 2 | `create_groups_and_group_members` | `groups`, `group_members` + RLS·권한 |
| 3 | `create_events_invite_tokens_and_rsvps` | `events`, `event_invite_tokens`, `rsvps` + 트리거·RLS·권한 |
| 4 | `create_settlements_tokens_and_shares` | `settlements`, `settlement_tokens`, `settlement_shares` + 트리거·RLS·권한 |
| 5 | `create_token_access_rpcs` | 비회원 RPC 5종, 토큰 재발급 RPC 2종 |
| 6 | `create_profiles` | `profiles` + RLS(본인 select/update), 가입 트리거 `private.handle_new_user_profile`(실패해도 가입은 통과) |
| 7 | `add_profile_avatar_and_storage` | `profiles.avatar_path`, 비공개 버킷 `avatars`(3MB, jpeg/png/webp), 본인 폴더 storage 정책 3개 |
| 8 | `avatar_host_read` | `private.can_read_avatar`, 주최자 읽기 storage 정책, RPC `get_event_respondent_avatars` |

## 테이블 요약

| 테이블 | 주요 컬럼 | 제약 |
|---|---|---|
| `profiles` | `id`(→`auth.users`, cascade), `display_name`(1~30), `avatar_path`(null 가능), `created_at`, `updated_at` | `avatar_path`는 `{id}/` 접두·≤200자. 이메일은 복제하지 않음 |
| `groups` | `owner_id`(→`auth.users`, 기본값 `auth.uid()`), `name`(1~50), `description`(≤200), `is_one_off` | 사용자 삭제 시 cascade |
| `group_members` | `group_id`, `name`(1~30), `memo`(≤100) | 모임 삭제 시 cascade |
| `events` | `group_id`, `title`(1~50), `starts_at`, `location`(1~100), `capacity`(1~9999 또는 null), `description`(≤500), `rsvp_deadline`, `status`(scheduled/cancelled/ended) | `rsvp_deadline <= starts_at`, 모임 삭제 시 cascade |
| `event_invite_tokens` | `token`(PK, 192비트 base64url 32자), `event_id`, `revoked_at` | 회차당 활성 토큰 1개(부분 unique) |
| `rsvps` | `event_id`, `member_id`(→멤버, **set null**), `name` 스냅샷(1~30), `status`, `source`(self/host), `respondent_key`(비회원 로컬 식별자), `user_id`(→`auth.users`, set null), `responded_at` | unique(`event_id`,`respondent_key`), unique(`event_id`,`user_id`), 멤버는 회차와 같은 모임 소속(트리거) |
| `settlements` | `event_id`(unique, 1:1), `total_amount`(1~1억), `host_included`, `head_count`(≥1), `per_person_amount`, `host_remainder`, `payment_guide`(1~300), `status`(in_progress/completed) | `per_person_amount = total/head_count`, `host_remainder = total - per*head` 일관성 check |
| `settlement_tokens` | `token`, `settlement_id`, `revoked_at` | 정산당 활성 토큰 1개 |
| `settlement_shares` | `settlement_id`, `rsvp_id`·`member_id`(**set null**), `name` 스냅샷, `amount`(0~1억), `status`(unpaid/self_reported/paid), `status_changed_at` | unique(`settlement_id`,`rsvp_id`), 같은 회차·모임 소속(트리거) |

- 금액은 모두 `integer`(원 단위). 소수 입력은 타입 단계에서 거부된다.
- 시각은 모두 `timestamptz`. UI의 `"YYYY-MM-DDTHH:mm"`(한국 시간) 문자열과의 변환은 I1 데이터 계층에서 `Asia/Seoul` 기준으로 한다.
- 트리거가 관리하는 값: `updated_at`, `rsvps.responded_at`(응답 내용 변경 시), `settlement_shares.status_changed_at`, `settlements.status`(항목 1건 이상이 모두 paid면 completed), 회차·정산 생성 시 토큰 자동 발급.

## 권한 모델

- **anon**: 테이블 권한 0. `public`의 RPC 래퍼 5종만 실행 가능.
- **authenticated**: 모든 테이블에 RLS(`for all to authenticated`, `(select auth.uid())` + `in (select ...)` 형태). 소유자(모임 `owner_id`)만 자기 모임 하위 데이터에 접근.
- 컬럼 단위 권한으로 클라이언트가 못 쓰는 값: 토큰 테이블 전체(조회만), `rsvps.respondent_key`·`user_id`, `settlements.status`, `settlement_shares.status_changed_at`.
- 기본 권한 회수: 이후 public에 만드는 테이블·함수는 자동 노출되지 않는다. **새 객체는 마이그레이션에서 필요한 GRANT를 반드시 명시한다.**

## I0-7 결정: 비회원 접근

**방식**: 토큰을 인자로 받는 RPC. 실제 로직은 Data API에 노출되지 않는 `private` 스키마의 `SECURITY DEFINER` 함수(`search_path = ''`)에 두고, `public`에는 호출만 하는 `SECURITY INVOKER` 래퍼를 둔다. `service_role`/secret 키는 쓰지 않는다.

| RPC (public) | 실행 롤 | 동작 |
|---|---|---|
| `get_invite(p_token, p_respondent_key?)` | anon, authenticated | `invalid`/`expired`/`cancelled`/`closed(deadline\|ended)`/`open`. 회차·모임 이름·명부(id·이름)·공개 응답 목록(메모·식별자·계정 제외)·본인 응답(`my_rsvp`) |
| `submit_rsvp(p_token, p_respondent_key, p_name, p_status, p_member_id?)` | anon, authenticated | 토큰 검증 → 취소·종료·마감 거부 → 입력 재검증 → 본인 응답 upsert. 정원 초과는 접수하고 `over_capacity` 반환 |
| `get_settlement(p_token)` | anon, authenticated | `invalid`/`expired`/`active`. 정산 요약, 회차 제목·시각만, 항목은 id·이름만, 진행률은 집계만 |
| `get_settlement_share(p_token, p_share_id)` | anon, authenticated | 본인 항목 금액·상태. 실패 사유 비구분(null) |
| `report_settlement_payment(p_token, p_share_id)` | anon, authenticated | `unpaid → self_reported`만. paid로는 바꾸지 않음 |
| `rotate_event_invite_token(p_event_id)` / `rotate_settlement_token(p_settlement_id)` | authenticated | 소유자 확인 후 이전 토큰 `revoked_at` 기록 + 새 토큰 반환. 비소유자·없음은 같은 오류(P0002) |

근거
- 테이블 SELECT를 anon에 주는 RLS 방식은 토큰을 정책 조건으로 넘길 표준 경로가 없고, 열거 차단을 보장하기 어렵다. 함수는 "토큰 1개 → 1건"만 반환하므로 열거가 원천적으로 불가능하다.
- `public`에 직접 `SECURITY DEFINER`를 두면 공개 RPC 경고(lint 0028/0029)가 나고 내부 헬퍼까지 노출될 위험이 있다. 정의자 함수를 비노출 스키마에 두고 진입점을 명시적으로 고른다. `private` 스키마는 anon/authenticated에 USAGE만 주며, 함수 EXECUTE는 위 7종의 구현 함수에만 개별 부여한다(내부 트리거·헬퍼는 실행 불가).
- 초대 토큰과 정산 토큰은 별도 테이블·별도 함수로 조회하므로 서로의 권한을 대신하지 못한다(검증 완료).

**토큰 이력**: 토큰을 `events`/`settlements` 컬럼이 아닌 이력 테이블(`event_invite_tokens`, `settlement_tokens`)에 둔다. 행 없음 = 무효, `revoked_at` 있음 = 만료(재발급된 이전 링크), 활성은 부모당 1개(부분 unique). 토큰 값은 DB 내부 함수만 생성하며(192비트), 클라이언트는 값을 지정할 수 없다.

## I0-8 결정: 사용자 프로필 (2026-10-12 개정)

당초 "`profiles` 없이 `auth.users` 직접 참조"로 결정했으나, 사용자 정보(표시 이름·프로필 사진) 저장 위치가 필요해 **`profiles` 테이블을 추가**했다. `groups.owner_id`, `rsvps.user_id`는 계속 `auth.users`를 직접 참조한다(FK 변경 없음).

- 기존 `accounts`는 사용하지 않는다(Q7).
- **가입 트리거**: `private.handle_new_user_profile()`(SECURITY DEFINER, `search_path = ''`)이 `auth.users` insert 후 프로필을 만든다. 내부 오류는 경고만 남기고 가입을 통과시키므로 **프로필 행이 없을 수 있다.** 앱은 행이 없으면 Auth 메타데이터(`full_name`/`name`) → 이메일 앞부분 → "사용자" 순으로 이름을 대체한다. 트리거 함수는 외부 롤이 실행할 수 없다.
- **이름 규칙**: 가입 시 `full_name` → `name` → 이메일 앞부분 → "사용자" 순으로 채우고 30자로 자른다.
- **권한**: authenticated는 본인 행 `select`와 `update(display_name, avatar_path)`만 가능. insert/delete는 트리거와 cascade가 담당한다. anon은 권한 없음.
- 타인에게 이름·사진을 보여줄 때는 테이블을 열지 않고 소유자 확인을 거치는 RPC의 반환 필드로만 노출한다.

## 프로필 사진 (Storage)

- **버킷** `avatars`: 비공개, `file_size_limit` 3,145,728바이트(3MB), `allowed_mime_types` = image/jpeg, image/png, image/webp.
- **저장 경로**: `{userId}/{uuid}.webp`. DB에는 경로(`profiles.avatar_path`)만 저장하고 화면용 URL은 서버가 서명 URL로 만든다. 서버가 512x512 WebP로 재인코딩하므로 EXIF가 제거되고 형식이 통일된다. 파일명을 매번 새로 만들어 update 정책은 두지 않는다.
- **storage.objects 정책**(`authenticated`):
  - `avatars_select_own` / `avatars_insert_own` / `avatars_delete_own`: 본인 폴더(`(storage.foldername(name))[1] = auth.uid()`)만.
  - `avatars_select_event_owner`: `private.can_read_avatar(name)`가 true일 때 조회 허용 — 호출자가 소유한 모임의 회차에 응답한 로그인 참가자의 사진만. profiles RLS가 본인 행만 허용하므로 판별은 DEFINER 함수로 한다.
- **RPC** `get_event_respondent_avatars(p_event_id)`: 소유자만 호출 가능, `(rsvp_id, avatar_path)`만 반환. 비소유자·없는 회차는 빈 결과(존재 여부 비노출).
- **후속 과제**:
  - 계정 삭제 기능을 만들 때 `auth.users` cascade는 Storage 파일을 지우지 않으므로 Storage API로 파일을 함께 삭제해야 한다(SQL로 `storage.objects`를 직접 삭제하지 않는다).
  - 초대 페이지 공개 응답 목록과 "참여한 모임" 화면에는 사진을 노출하지 않는다(필요하면 별도 RPC 설계).
  - 파일 크기 제한 변경 시 버킷 설정, `lib/schemas/profile.ts`의 상수, `next.config.ts`의 Server Action 본문 한도를 함께 바꾼다.

## 후속 단계에서 지켜야 할 것

- I1: `generate_typescript_types` → `lib/supabase/database.types.ts`, RPC 반환값(jsonb)은 Zod로 파싱해 도메인 타입으로 변환. 1/N 저장 시 파생값을 `calculateSplit`과 같은 규칙으로 함께 보낸다(check 위반 방지).
- I3: 속도 제한은 Server Action만으로는 부족하다(publishable 키로 `/rest/v1/rpc/submit_rsvp`를 직접 호출 가능). DB 측 제한(예: `private.rate_limits` + `submit_rsvp` 안 검사, 또는 `pgrst.db_pre_request`)을 함께 둔다.
- I1: `getMyProfile`은 `profiles`가 없을 때의 대체 이름 규칙을 지킨다(위 I0-8 결정). 응답 현황 아바타는 `get_event_respondent_avatars`로 경로를 받아 서명 URL을 붙인다.
- I4-3: `get_settlement_share`는 토큰 소지자가 항목 id를 바꿔 다른 사람의 금액·상태를 볼 수 있다(이름 선택 UI가 본래 그렇게 동작). 필요하면 본인 확인 수단을 추가한다.
