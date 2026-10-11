import { mockMemberships, mockProfile } from "@/lib/mock/data";
import type { MyStats, Profile } from "@/lib/types/domain";

// 내 정보 더미 조회 함수. 연동 단계(I1)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// 내 프로필
export async function getMyProfile(): Promise<Profile> {
  await delay();
  return mockProfile;
}

// 내가 만든 모임 수 / 참여한 모임 수
export async function getMyStats(): Promise<MyStats> {
  await delay();
  const mine = mockMemberships.filter((item) => item.userId === mockProfile.id);
  return {
    hostedCount: mine.filter((item) => item.role === "host").length,
    joinedCount: mine.filter((item) => item.role === "member").length,
  };
}
