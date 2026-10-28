import { z } from "zod";

import {
  EVENT_COLUMNS,
  GROUP_COLUMNS,
  MEMBER_COLUMNS,
  toGroup,
  toGroupEvent,
  toGroupMember,
  toKstLocal,
} from "@/lib/data/mappers";
import {
  isUuid,
  mockDelay,
  readFailed,
  resolveDataSource,
  type ServerSupabaseClient,
} from "@/lib/data/source";
import {
  mockEvents,
  mockGroups,
  mockMembers,
  mockMemberships,
  mockProfile,
} from "@/lib/mock/data";
import type {
  Group,
  GroupEvent,
  GroupMember,
  GroupRole,
  JoinedEventDetail,
  JoinedGroup,
} from "@/lib/types/domain";

// 모임·멤버·회차 조회 함수. 화면은 이 함수만 호출한다(시그니처는 UI 단계와 동일).
// 세션이 있으면 Supabase(RLS: 본인이 소유한 모임과 그 하위 데이터만)를 조회하고,
// 세션이 없으면 개발 환경에서만 더미를 돌려준다(lib/data/source.ts).
// 소유자가 아니거나 없는 id는 RLS로 0행이 되어 null/빈 배열이 된다(존재 여부 비노출).
// DB 오류는 내부 정보 없이 던져 라우트의 error.tsx(재시도)로 보낸다.

// 더미: 현재 사용자가 해당 역할로 속한 모임 목록(mockMemberships 순서 유지)
function mockGroupsByRole(role: GroupRole): Group[] {
  return mockMemberships
    .filter((item) => item.userId === mockProfile.id && item.role === role)
    .map((item) => mockGroups.find((group) => group.id === item.groupId))
    .filter((group): group is Group => group !== undefined);
}

// 내가 만든 모임 목록(만든 순서)
export async function listGroups(): Promise<Group[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockGroupsByRole("host");
  }
  if (source.kind === "none") return [];

  const { data, error } = await source.supabase
    .from("groups")
    .select(GROUP_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) readFailed("listGroups", error.code);
  return data.map(toGroup);
}

// list_joined_groups 반환 행. 생성 타입은 left join 컬럼(next_event_*)도 non-null로 표시하므로 Zod로 다시 좁힌다.
const joinedGroupRowSchema = z.object({
  group_id: z.string(),
  group_name: z.string(),
  is_one_off: z.boolean(),
  next_event_id: z.string().nullable(),
  next_event_title: z.string().nullable(),
  next_event_starts_at: z.string().nullable(),
});

// 참여한 모임 조회(실데이터 공통, 대시보드·내 정보 통계에서도 쓴다).
// RPC가 로그인 상태로 응답한, 본인 소유가 아닌 모임만 돌려준다(Q12, 명부·타인 응답·정산 미포함).
export async function fetchJoinedGroups(
  supabase: ServerSupabaseClient,
): Promise<JoinedGroup[]> {
  const { data, error } = await supabase.rpc("list_joined_groups");
  if (error) readFailed("listJoinedGroups", error.code);
  const parsed = z.array(joinedGroupRowSchema).safeParse(data);
  if (!parsed.success) readFailed("listJoinedGroups", "parse");

  return parsed.data.map((row) => ({
    id: row.group_id,
    name: row.group_name,
    // 모임 설명은 참여자에게 공개하지 않는다.
    description: "",
    isOneOff: row.is_one_off,
    nextEvent:
      row.next_event_id && row.next_event_title && row.next_event_starts_at
        ? {
            id: row.next_event_id,
            title: row.next_event_title,
            startsAt: toKstLocal(row.next_event_starts_at) ?? "",
          }
        : null,
  }));
}

// 내가 참여한(다른 사람이 만든) 모임 목록(다음 회차 시각 순)
export async function listJoinedGroups(): Promise<JoinedGroup[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockGroupsByRole("member").map((group) => ({
      ...group,
      nextEvent: null,
    }));
  }
  if (source.kind === "none") return [];
  return fetchJoinedGroups(source.supabase);
}

const joinedEventRowSchema = z.object({
  group_id: z.string(),
  group_name: z.string(),
  event_id: z.string(),
  event_title: z.string(),
  event_starts_at: z.string(),
  event_location: z.string(),
  event_description: z.string(),
  event_capacity: z.number().nullable(),
  event_rsvp_deadline: z.string().nullable(),
  event_status: z.enum(["scheduled", "cancelled", "ended"]),
  my_name: z.string(),
  my_status: z.enum(["attending", "declined", "undecided"]),
  my_responded_at: z.string(),
});

// 참여한 모임의 내 응답 회차 상세(읽기 전용). 응답한 적 없거나 본인 소유 모임이면 null(존재 여부 비노출).
// 더미 데이터에는 참여자 응답이 없으므로 mock/none은 null이다.
export async function getJoinedEvent(
  eventId: string,
): Promise<JoinedEventDetail | null> {
  const source = await resolveDataSource();
  if (source.kind !== "supabase" || !isUuid(eventId)) return null;

  const { data, error } = await source.supabase.rpc("get_joined_event", {
    p_event_id: eventId,
  });
  if (error) readFailed("getJoinedEvent", error.code);
  const parsed = z.array(joinedEventRowSchema).safeParse(data);
  if (!parsed.success) readFailed("getJoinedEvent", "parse");
  const row = parsed.data[0];
  if (!row) return null;

  return {
    groupId: row.group_id,
    groupName: row.group_name,
    event: {
      id: row.event_id,
      title: row.event_title,
      startsAt: toKstLocal(row.event_starts_at) ?? "",
      location: row.event_location,
      description: row.event_description,
      capacity: row.event_capacity,
      rsvpDeadline: row.event_rsvp_deadline
        ? toKstLocal(row.event_rsvp_deadline)
        : null,
      status: row.event_status,
    },
    myRsvp: {
      name: row.my_name,
      status: row.my_status,
      respondedAt: row.my_responded_at,
    },
  };
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockGroups.find((group) => group.id === groupId) ?? null;
  }
  if (source.kind === "none" || !isUuid(groupId)) return null;

  const { data, error } = await source.supabase
    .from("groups")
    .select(GROUP_COLUMNS)
    .eq("id", groupId)
    .maybeSingle();
  if (error) readFailed("getGroup", error.code);
  return data ? toGroup(data) : null;
}

// 모임 멤버 명부(등록 순서)
export async function listMembers(groupId: string): Promise<GroupMember[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockMembers.filter((member) => member.groupId === groupId);
  }
  if (source.kind === "none" || !isUuid(groupId)) return [];

  const { data, error } = await source.supabase
    .from("group_members")
    .select(MEMBER_COLUMNS)
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) readFailed("listMembers", error.code);
  return data.map(toGroupMember);
}

// 모임의 회차 목록(시작 시각 순)
export async function listEvents(groupId: string): Promise<GroupEvent[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockEvents.filter((event) => event.groupId === groupId);
  }
  if (source.kind === "none" || !isUuid(groupId)) return [];

  const { data, error } = await source.supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("group_id", groupId)
    .order("starts_at", { ascending: true });
  if (error) readFailed("listEvents", error.code);
  return data.map(toGroupEvent);
}

export async function getEvent(eventId: string): Promise<GroupEvent | null> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockEvents.find((event) => event.id === eventId) ?? null;
  }
  if (source.kind === "none" || !isUuid(eventId)) return null;

  const { data, error } = await source.supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (error) readFailed("getEvent", error.code);
  return data ? toGroupEvent(data) : null;
}
