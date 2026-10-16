# DB 스키마·권한 설계 메모 (I0)

- 작성: 2026-10-12 (I0 완료 시점), 갱신: 2026-10-14 (I3 마이그레이션 10·11). 대상 프로젝트: `ecandzpftfinazfonvcl`(`.mcp.json` 기준)
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
| 9 | `create_one_off_event_rpc` | `public.create_one_off_event(...)`: SECURITY INVOKER(RLS 적용), 모임(`is_one_off`)과 회차 1개를 한 트랜잭션에서 생성. authenticated만 실행 |
| 10 | `i3_rsvp_rate_limit_and_q11_matching` | `private.rate_limits`·`private.check_rate_limit`, `submit_rsvp`에 속도 제한(`rate_limited`)·Q11 매칭, `get_invite`의 `my_rsvp` 매칭을 Q11과 일치 |
| 11 | `i3_list_joined_groups_rpc` | `list_joined_groups()`(I3-6a, Q12): 로그인 상태로 응답한 다른 사람의 모임. authenticated만 실행 |
| 12 | `i3_get_joined_event_rpc` | `get_joined_event(p_event_id)`(I3-6b, Q12 확장): 내가 로그인 상태로 응답한 다른 사람 모임의 회차 1건과 내 응답. authenticated만 실행 |

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
| `get_invite(p_token, p_respondent_key?)` | anon, authenticated | `invalid`/`expired`/`cancelled`/`closed(deadline\|ended)`/`open`. 회차·모임 이름·명부(id·이름)·공개 응답 목록(메모·식별자·계정 제외)·본인 응답(`my_rsvp`, Q11 매칭) |
| `submit_rsvp(p_token, p_respondent_key, p_name, p_status, p_member_id?)` | anon, authenticated | 토큰 검증 → 취소·종료·마감 거부 → 속도 제한 → 입력 재검증 → 본인 응답 upsert(Q11). 정원 초과는 접수하고 `over_capacity` 반환. 거부 사유: `invalid`/`expired`/`cancelled`/`ended`/`deadline`/`rate_limited`/`validation`/`conflict` |
| `list_joined_groups()` | authenticated | 본인 소유가 아닌 모임 중 로그인 상태로 응답한 모임의 id·이름·1회성 여부와, 본인이 응답한 가장 가까운 예정 회차(id·제목·시각) |
| `get_joined_event(p_event_id)` | authenticated | 본인이 응답했고 본인 소유가 아닌 모임의 회차 정보(제목·시각·장소·설명·정원·마감·상태)와 내 응답(이름·상태·응답 시각). 조건에 맞지 않으면 0행. 명부·타인 응답·정산·모임 설명은 반환하지 않음 |
| `get_settlement(p_token)` | anon, authenticated | `invalid`/`expired`/`active`. 정산 요약, 회차 제목·시각만, 항목은 id·이름만, 진행률은 집계만 |
| `get_settlement_share(p_token, p_share_id)` | anon, authenticated | 본인 항목 금액·상태. 실패 사유 비구분(null) |
| `report_settlement_payment(p_token, p_share_id)` | anon, authenticated | `unpaid → self_reported`만. paid로는 바꾸지 않음 |
| `rotate_event_invite_token(p_event_id)` / `rotate_settlement_token(p_settlement_id)` | authenticated | 소유자 확인 후 이전 토큰 `revoked_at` 기록 + 새 토큰 반환. 비소유자·없음은 같은 오류(P0002) |

근거
- 테이블 SELECT를 anon에 주는 RLS 방식은 토큰을 정책 조건으로 넘길 표준 경로가 없고, 열거 차단을 보장하기 어렵다. 함수는 "토큰 1개 → 1건"만 반환하므로 열거가 원천적으로 불가능하다.
- `public`에 직접 `SECURITY DEFINER`를 두면 공개 RPC 경고(lint 0028/0029)가 나고 내부 헬퍼까지 노출될 위험이 있다. 정의자 함수를 비노출 스키마에 두고 진입점을 명시적으로 고른다. `private` 스키마는 anon/authenticated에 USAGE만 주며, 함수 EXECUTE는 위 7종의 구현 함수에만 개별 부여한다(내부 트리거·헬퍼는 실행 불가).
- 초대 토큰과 정산 토큰은 별도 테이블·별도 함수로 조회하므로 서로의 권한을 대신하지 못한다(검증 완료).

**토큰 이력**: 토큰을 `events`/`settlements` 컬럼이 아닌 이력 테이블(`event_invite_tokens`, `settlement_tokens`)에 둔다. 행 없음 = 무효, `revoked_at` 있음 = 만료(재발급된 이전 링크), 활성은 부모당 1개(부분 unique). 토큰 값은 DB 내부 함수만 생성하며(192비트), 클라이언트는 값을 지정할 수 없다.

## I3 결정: 응답 식별·속도 제한·참여한 모임 (2026-10-14)

**비회원 식별자**: `respondent_key`는 httpOnly 쿠키 `rsvp_respondent_key`(경로 `/i`, 1년)에 둔다. 발급은 응답 제출 Server Action(`app/actions/invites.ts`의 `submitRsvp`)만 하고, 초대 페이지 렌더링은 읽기만 한다(`lib/data/respondent-key.ts`). 클라이언트 스크립트는 값을 읽거나 정할 수 없다.

**Q11 매칭**(`submit_rsvp`, `get_invite` 공통)
- 로그인: `user_id = auth.uid()` 행만 본인 응답으로 본다. 새 행은 `respondent_key`를 NULL로 저장한다(쿠키 키를 계정 행에 붙이지 않는다).
- 비로그인: `respondent_key` 일치 **그리고** `user_id is null` 행만.
- 기존 비회원 응답은 로그인해도 계정으로 이관하지 않는다. 로그인 후 같은 회차에 다시 응답하면 별도 행이 생긴다(의도된 동작, 주최자가 정리).

**속도 제한**(`submit_rsvp` 안, 토큰·회차 상태 확인 직후·입력 검증 전)
- 저장소: `private.rate_limits(key, window_start, count)`, 고정 창. `private.check_rate_limit(key, limit, window)`가 원자적 upsert로 1 증가 후 한도 이내 여부를 돌려준다. 호출의 약 2%에서 1시간 지난 행을 지운다(`window_start` 인덱스).
- 키: 응답자 `rsvp:{event_id}:u:{user_id}` 또는 `rsvp:{event_id}:k:{respondent_key}` **1분 5회**, 회차 전체 `rsvp-event:{event_id}` **1분 60회**(키를 바꿔 가며 보내는 경우 방어). 개인 한도에 걸린 호출은 회차 카운터를 올리지 않는다. 토큰 원문은 저장하지 않으며 회차 id 기준이라 재발급 후에도 제한이 이어진다.
- 초과 시 `{ok:false, reason:'rate_limited'}`. DB에서 막으므로 publishable 키로 `/rest/v1/rpc/submit_rsvp`를 직접 호출해도 적용된다.
- 권한: 테이블·함수 모두 외부 롤 권한 없음(`submit_rsvp` 정의자 권한으로만 실행).
- 알려진 한계: 회차 전체 한도(1분 60회)를 악의적으로 소진하면 그 1분 동안 정상 응답도 `rate_limited`가 된다. 조회 RPC(`get_invite`)에는 제한이 없다(192비트 토큰이라 열거 불가, 쓰기 없음).

**참여한 모임**(`list_joined_groups`, I3-6a·Q12): `private` DEFINER + `public` INVOKER 래퍼, authenticated만 EXECUTE. 본인이 응답하지 않은 회차·모임 설명·장소·명부·타인 응답·정산은 반환하지 않는다. 비회원으로 응답한 뒤 로그인한 경우(Q11 비이관)는 목록에 나오지 않는다.

**검증(2026-10-14, 롤백 트랜잭션)**: 비회원 제출·수정, 같은 키 6번째 `rate_limited`, 로그인 사용자 키 변경해도 6번째 `rate_limited`, 키 회전 65회 중 5회 `rate_limited`, 창 경과 후 재허용, 정원 초과 접수(`over_capacity`), 빈 이름·다른 모임 멤버 `validation`, 식별자 없음 `validation`, 무효 `invalid`, 재발급 전 토큰 `expired`, 마감 `deadline`, 종료 `ended`, 취소 `cancelled`, 로그인 사용자가 같은 기기 키를 보내도 비회원 행을 보거나 덮지 않음(새 행 `respondent_key` NULL), 공개 응답에 식별자·메모 미포함, 참여자 `list_joined_groups` 1건·주최자 0건·anon 권한 없음, 참여자 `rsvps` 직접 조회 0행, anon `private.rate_limits` 접근 거부.

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
- I3: ~~속도 제한은 Server Action만으로는 부족하다~~ → `submit_rsvp` 안의 DB 측 제한으로 해결(위 "I3 결정" 참고).
- I1: `getMyProfile`은 `profiles`가 없을 때의 대체 이름 규칙을 지킨다(위 I0-8 결정). 응답 현황 아바타는 `get_event_respondent_avatars`로 경로를 받아 서명 URL을 붙인다.
- I4-3: `get_settlement_share`는 토큰 소지자가 항목 id를 바꿔 다른 사람의 금액·상태를 볼 수 있다(이름 선택 UI가 본래 그렇게 동작). 필요하면 본인 확인 수단을 추가한다.
