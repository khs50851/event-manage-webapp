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

// 더미 조회 함수. 연동 단계(I1)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// 현재 사용자가 해당 역할로 속한 모임 목록(mockMemberships 순서 유지)
function groupsByRole(role: GroupRole): Group[] {
  return mockMemberships
    .filter((item) => item.userId === mockProfile.id && item.role === role)
    .map((item) => mockGroups.find((group) => group.id === item.groupId))
    .filter((group): group is Group => group !== undefined);
}

// 내가 만든 모임 목록
export async function listGroups(): Promise<Group[]> {
  await delay();
  return groupsByRole("host");
}

// 내가 참여한(다른 사람이 만든) 모임 목록
export async function listJoinedGroups(): Promise<Group[]> {
  await delay();
  return groupsByRole("member");
}

export async function getGroup(groupId: string): Promise<Group | null> {
  await delay();
  return mockGroups.find((group) => group.id === groupId) ?? null;
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  await delay();
  return mockMembers.filter((member) => member.groupId === groupId);
}

export async function listEvents(groupId: string): Promise<GroupEvent[]> {
  await delay();
  return mockEvents.filter((event) => event.groupId === groupId);
}

export async function getEvent(eventId: string): Promise<GroupEvent | null> {
  await delay();
  return mockEvents.find((event) => event.id === eventId) ?? null;
}
