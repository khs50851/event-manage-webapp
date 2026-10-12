import type { EventFormValues } from "@/lib/schemas/event";
import type { Tables } from "@/lib/supabase/database.types";
import type {
  EventStatus,
  Group,
  GroupEvent,
  GroupMember,
  Rsvp,
  RsvpSource,
  RsvpStatus,
  Settlement,
  SettlementShare,
  SettlementStatus,
  ShareStatus,
} from "@/lib/types/domain";

// DB 행(snake_case, timestamptz) ↔ 도메인 타입(camelCase, 한국 시간 로컬 문자열) 매핑.
// 도메인 타입(lib/types/domain.ts)은 UI 단계 형태를 유지하고, 차이는 이 모듈에서만 흡수한다.
// 매퍼 입력은 생성 타입의 Pick이라 필요한 컬럼만 select한 결과도 그대로 넘길 수 있다.

// ─── 시각 변환 ───────────────────────────────────────────────
// 한국 시간(Asia/Seoul)은 UTC+9 고정이며 일광 절약 시간이 없으므로 고정 오프셋 산술로 변환한다.
// (Intl 포맷의 자정 "24:00" 표기 같은 런타임 차이를 피하고 서버·브라우저 결과를 같게 한다.)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// timestamptz(ISO 8601) → "YYYY-MM-DDTHH:mm"(한국 시간). 해석할 수 없으면 null.
export function toKstLocal(value: string): string | null {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const kst = new Date(time + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// "YYYY-MM-DDTHH:mm"(초가 붙어도 허용, 초는 버림) 한국 시간 → timestamptz로 보낼 ISO 문자열("...:00+09:00").
// 형식이 다르거나 존재하지 않는 날짜·시각(2월 30일, 24시 등)이면 null.
export function fromKstLocal(value: string): string | null {
  const match = LOCAL_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute
  ) {
    return null;
  }
  return `${year}-${month}-${day}T${hour}:${minute}:00+09:00`;
}

// 필수 시각 컬럼 변환. DB 값은 항상 유효하므로 실패 시 원문을 그대로 둔다(화면이 깨지지 않게).
function toKstLocalOrRaw(value: string): string {
  return toKstLocal(value) ?? value;
}

function toKstLocalNullable(value: string | null): string | null {
  return value === null ? null : toKstLocalOrRaw(value);
}

// ─── 상태 값 좁히기 ─────────────────────────────────────────────
// 생성 타입은 text check 제약을 string으로만 표현하므로 도메인 유니온으로 좁힌다.
// check 제약상 다른 값은 들어올 수 없지만, 만약을 위해 안전한 기본값으로 떨어뜨린다.
function narrow<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const EVENT_STATUSES = ["scheduled", "cancelled", "ended"] as const;
const RSVP_STATUSES = ["attending", "declined", "undecided"] as const;
const RSVP_SOURCES = ["self", "host"] as const;
const SETTLEMENT_STATUSES = ["in_progress", "completed"] as const;
const SHARE_STATUSES = ["unpaid", "self_reported", "paid"] as const;

// ─── 행 → 도메인 ──────────────────────────────────────────────
export const GROUP_COLUMNS = "id, name, description, is_one_off";
export type GroupRow = Pick<
  Tables<"groups">,
  "id" | "name" | "description" | "is_one_off"
>;

export function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isOneOff: row.is_one_off,
  };
}

export const MEMBER_COLUMNS = "id, group_id, name, memo";
export type MemberRow = Pick<
  Tables<"group_members">,
  "id" | "group_id" | "name" | "memo"
>;

export function toGroupMember(row: MemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    memo: row.memo,
  };
}

export const EVENT_COLUMNS =
  "id, group_id, title, starts_at, location, capacity, description, rsvp_deadline, status";
export type EventRow = Pick<
  Tables<"events">,
  | "id"
  | "group_id"
  | "title"
  | "starts_at"
  | "location"
  | "capacity"
  | "description"
  | "rsvp_deadline"
  | "status"
>;

export function toGroupEvent(row: EventRow): GroupEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    startsAt: toKstLocalOrRaw(row.starts_at),
    location: row.location,
    capacity: row.capacity,
    description: row.description,
    rsvpDeadline: toKstLocalNullable(row.rsvp_deadline),
    status: narrow<EventStatus>(row.status, EVENT_STATUSES, "scheduled"),
  };
}

// 응답 행. 비회원 식별자(respondent_key)·계정(user_id)은 도메인으로 옮기지 않는다.
export const RSVP_COLUMNS =
  "id, event_id, member_id, name, status, source, responded_at";
export type RsvpRow = Pick<
  Tables<"rsvps">,
  | "id"
  | "event_id"
  | "member_id"
  | "name"
  | "status"
  | "source"
  | "responded_at"
>;

export function toRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    memberId: row.member_id,
    name: row.name,
    status: narrow<RsvpStatus>(row.status, RSVP_STATUSES, "undecided"),
    source: narrow<RsvpSource>(row.source, RSVP_SOURCES, "self"),
    respondedAt: toKstLocalOrRaw(row.responded_at),
  };
}

export const SETTLEMENT_COLUMNS =
  "id, event_id, total_amount, host_included, head_count, per_person_amount, host_remainder, payment_guide, status, created_at, updated_at";
export type SettlementRow = Pick<
  Tables<"settlements">,
  | "id"
  | "event_id"
  | "total_amount"
  | "host_included"
  | "head_count"
  | "per_person_amount"
  | "host_remainder"
  | "payment_guide"
  | "status"
  | "created_at"
  | "updated_at"
>;

export function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    eventId: row.event_id,
    totalAmount: row.total_amount,
    hostIncluded: row.host_included,
    headCount: row.head_count,
    perPersonAmount: row.per_person_amount,
    hostRemainder: row.host_remainder,
    paymentGuide: row.payment_guide,
    status: narrow<SettlementStatus>(
      row.status,
      SETTLEMENT_STATUSES,
      "in_progress",
    ),
    createdAt: toKstLocalOrRaw(row.created_at),
    updatedAt: toKstLocalOrRaw(row.updated_at),
  };
}

export const SHARE_COLUMNS =
  "id, settlement_id, rsvp_id, member_id, name, amount, status, status_changed_at";
export type ShareRow = Pick<
  Tables<"settlement_shares">,
  | "id"
  | "settlement_id"
  | "rsvp_id"
  | "member_id"
  | "name"
  | "amount"
  | "status"
  | "status_changed_at"
>;

export function toSettlementShare(row: ShareRow): SettlementShare {
  return {
    id: row.id,
    settlementId: row.settlement_id,
    rsvpId: row.rsvp_id,
    memberId: row.member_id,
    name: row.name,
    amount: row.amount,
    status: narrow<ShareStatus>(row.status, SHARE_STATUSES, "unpaid"),
    statusChangedAt: toKstLocalNullable(row.status_changed_at),
  };
}

// ─── 폼 값 → 쓰기 값 ────────────────────────────────────────────
// eventSchema 검증을 통과한 값을 events 컬럼 값으로 바꾼다.
// 시각 형식이 잘못됐으면 필드별 오류를 돌려준다(스키마는 UI 폼과 공유하므로 형식 검사는 여기서 보강).
export type EventWriteFields = {
  title: string;
  starts_at: string;
  location: string;
  capacity: number | null;
  description: string;
  rsvp_deadline: string | null;
};

export const INVALID_DATETIME_MESSAGE = "일시 형식이 올바르지 않아요.";

export function toEventWriteFields(
  values: EventFormValues,
):
  | { ok: true; fields: EventWriteFields }
  | { ok: false; fieldErrors: Record<string, string> } {
  const startsAt = fromKstLocal(values.startsAt);
  const rsvpDeadline =
    values.rsvpDeadline === "" ? null : fromKstLocal(values.rsvpDeadline);

  const fieldErrors: Record<string, string> = {};
  if (startsAt === null) fieldErrors.startsAt = INVALID_DATETIME_MESSAGE;
  if (values.rsvpDeadline !== "" && rsvpDeadline === null) {
    fieldErrors.rsvpDeadline = INVALID_DATETIME_MESSAGE;
  }
  if (startsAt === null || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fields: {
      title: values.title.trim(),
      starts_at: startsAt,
      location: values.location.trim(),
      capacity: values.capacity === "" ? null : Number(values.capacity),
      description: values.description.trim(),
      rsvp_deadline: rsvpDeadline,
    },
  };
}
