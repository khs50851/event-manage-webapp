import { z } from "zod";

import { toGroupEvent, toRsvp } from "@/lib/data/mappers";
import type { InviteLookup, Rsvp } from "@/lib/types/domain";

// 초대 RPC(get_invite / submit_rsvp) jsonb 반환값 파싱. 생성 타입은 jsonb를 Json으로만 표현하므로
// Zod로 형태를 확인한 뒤 도메인 타입으로 바꾼다(형태가 다르면 null → 호출자가 조회 실패로 처리).
// 공개 응답 목록에는 respondent_key·user_id가 애초에 없다(RPC가 고른 필드만 반환).

const eventJsonSchema = z.object({
  id: z.string(),
  title: z.string(),
  starts_at: z.string(),
  location: z.string(),
  capacity: z.number().int().nullable(),
  description: z.string(),
  rsvp_deadline: z.string().nullable(),
  status: z.string(),
});

const rsvpJsonSchema = z.object({
  id: z.string(),
  member_id: z.string().nullable(),
  name: z.string(),
  status: z.string(),
  source: z.string(),
  responded_at: z.string(),
});

const memberJsonSchema = z.object({ id: z.string(), name: z.string() });

const getInviteSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("invalid") }),
  z.object({ status: z.literal("expired") }),
  z.object({
    status: z.literal("cancelled"),
    event: eventJsonSchema,
    group_name: z.string().nullable(),
  }),
  z.object({
    status: z.literal("closed"),
    reason: z.enum(["deadline", "ended"]),
    event: eventJsonSchema,
    group_name: z.string().nullable(),
    rsvps: z.array(rsvpJsonSchema),
    my_rsvp: rsvpJsonSchema.nullable(),
  }),
  z.object({
    status: z.literal("open"),
    event: eventJsonSchema,
    group_name: z.string().nullable(),
    members: z.array(memberJsonSchema),
    rsvps: z.array(rsvpJsonSchema),
    my_rsvp: rsvpJsonSchema.nullable(),
  }),
]);

type EventJson = z.infer<typeof eventJsonSchema>;
type RsvpJson = z.infer<typeof rsvpJsonSchema>;

// 공개 조회에는 모임 id가 없으므로 groupId는 빈 문자열로 둔다.
function toPublicEvent(event: EventJson) {
  return toGroupEvent({ ...event, group_id: "" });
}

function toPublicRsvp(eventId: string, row: RsvpJson): Rsvp {
  return toRsvp({ ...row, event_id: eventId });
}

// get_invite 결과 → InviteLookup. 형태가 맞지 않으면 null.
export function parseInviteLookup(data: unknown): InviteLookup | null {
  const parsed = getInviteSchema.safeParse(data);
  if (!parsed.success) return null;
  const value = parsed.data;

  switch (value.status) {
    case "invalid":
    case "expired":
      return { status: value.status };
    case "cancelled":
      return {
        status: "cancelled",
        event: toPublicEvent(value.event),
        groupName: value.group_name ?? "",
      };
    case "closed": {
      const eventId = value.event.id;
      return {
        status: "closed",
        reason: value.reason,
        event: toPublicEvent(value.event),
        groupName: value.group_name ?? "",
        rsvps: value.rsvps.map((row) => toPublicRsvp(eventId, row)),
        myRsvp: value.my_rsvp ? toPublicRsvp(eventId, value.my_rsvp) : null,
      };
    }
    case "open": {
      const eventId = value.event.id;
      return {
        status: "open",
        event: toPublicEvent(value.event),
        groupName: value.group_name ?? "",
        members: value.members,
        rsvps: value.rsvps.map((row) => toPublicRsvp(eventId, row)),
        myRsvp: value.my_rsvp ? toPublicRsvp(eventId, value.my_rsvp) : null,
      };
    }
  }
}

// submit_rsvp가 돌려주는 거부 사유(DB 함수와 같은 목록)
export const SUBMIT_RSVP_DB_REASONS = [
  "invalid",
  "expired",
  "cancelled",
  "ended",
  "deadline",
  "rate_limited",
  "conflict",
  "validation",
] as const;

export type SubmitRsvpDbReason = (typeof SUBMIT_RSVP_DB_REASONS)[number];

const submitRsvpSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    rsvp: rsvpJsonSchema.extend({ event_id: z.string() }),
    over_capacity: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(SUBMIT_RSVP_DB_REASONS),
  }),
]);

export type SubmitRsvpOutcome =
  | { ok: true; rsvp: Rsvp; overCapacity: boolean }
  | { ok: false; reason: SubmitRsvpDbReason };

// submit_rsvp 결과 → 도메인. 형태가 맞지 않으면 null.
export function parseSubmitRsvpOutcome(
  data: unknown,
): SubmitRsvpOutcome | null {
  const parsed = submitRsvpSchema.safeParse(data);
  if (!parsed.success) return null;
  const value = parsed.data;
  if (!value.ok) return { ok: false, reason: value.reason };
  return {
    ok: true,
    rsvp: toRsvp(value.rsvp),
    overCapacity: value.over_capacity,
  };
}
