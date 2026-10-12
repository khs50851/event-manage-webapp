import {
  EVENT_COLUMNS,
  GROUP_COLUMNS,
  MEMBER_COLUMNS,
  toGroup,
  toGroupEvent,
  toGroupMember,
} from "@/lib/data/mappers";
import { isUuid, mockDelay, resolveDataSource } from "@/lib/data/source";
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
} from "@/lib/types/domain";

// 모임·멤버·회차 조회 함수. 화면은 이 함수만 호출한다(시그니처는 UI 단계와 동일).
// 세션이 있으면 Supabase(RLS: 본인이 소유한 모임과 그 하위 데이터만)를 조회하고,
// 세션이 없으면 개발 환경에서만 더미를 돌려준다(lib/data/source.ts).
// 소유자가 아니거나 없는 id는 RLS로 0행이 되어 null/빈 배열이 된다(존재 여부 비노출).
// DB 오류는 내부 정보 없이 던져 라우트의 error.tsx(재시도)로 보낸다.

// 읽기 실패 공통 처리: 서버 로그에는 오류 코드만 남기고 화면에는 일반 메시지만 전달한다.
function readFailed(scope: string, code: string | undefined): never {
  console.error(`[${scope}] 조회 실패:`, code);
  throw new Error("데이터를 불러오지 못했어요.");
}

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

// 내가 참여한(다른 사람이 만든) 모임 목록.
// 실데이터는 I3-6a(로그인 응답 연결 + 읽기 전용 RPC) 전까지 빈 목록이다(Q12).
export async function listJoinedGroups(): Promise<Group[]> {
  const source = await resolveDataSource();
  if (source.kind === "mock") {
    await mockDelay();
    return mockGroupsByRole("member");
  }
  return [];
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
