import { connection } from "next/server";

import {
  mockEvents,
  mockGroups,
  mockSettlements,
  mockSettlementShares,
  mockSettlementTokens,
} from "@/lib/mock/data";
import { summarizeShares } from "@/lib/settlement";
import type {
  HostSettlementData,
  PublicMySettlementShare,
  SettlementLookup,
} from "@/lib/types/domain";

// 정산 더미 조회 함수. 연동 단계(I4)에서 구현만 Supabase 호출로 교체하고 시그니처는 유지한다.
// 로딩 상태(Suspense 스켈레톤) 확인용 인위적 지연.
const MOCK_DELAY_MS = 300;

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// 주최자용: 회차의 정산, 정산 항목, 현재 유효한 정산 토큰. 정산이 없으면 settlement가 null.
export async function getHostSettlement(
  eventId: string,
): Promise<HostSettlementData> {
  await delay();
  const settlement =
    mockSettlements.find((item) => item.eventId === eventId) ?? null;
  if (!settlement) return { settlement: null, shares: [], activeToken: null };

  return {
    settlement,
    shares: mockSettlementShares.filter(
      (share) => share.settlementId === settlement.id,
    ),
    activeToken:
      mockSettlementTokens.find(
        (item) => item.settlementId === settlement.id && !item.revoked,
      )?.token ?? null,
  };
}

// 비회원용: 정산 토큰으로 정산 조회 페이지 데이터를 가져온다(FR-10).
// 무효·만료 토큰이면 정산·회차 정보를 반환하지 않고, 공개 데이터는 필요한 필드만 골라 담는다
// (응답·멤버 연결 id, 연락처 메모, 회차 장소·설명 미노출, R1).
export async function getSettlementByToken(
  token: string,
): Promise<SettlementLookup> {
  // 입금 상태는 요청 시점 값이어야 하므로 프리렌더에서 제외한다.
  await connection();
  await delay();

  const record = mockSettlementTokens.find((item) => item.token === token);
  if (!record) return { status: "invalid" };
  if (record.revoked) return { status: "expired" };

  const settlement = mockSettlements.find(
    (item) => item.id === record.settlementId,
  );
  if (!settlement) return { status: "invalid" };
  const event = mockEvents.find((item) => item.id === settlement.eventId);
  if (!event) return { status: "invalid" };
  const groupName =
    mockGroups.find((group) => group.id === event.groupId)?.name ?? "";

  const allShares = mockSettlementShares.filter(
    (share) => share.settlementId === settlement.id,
  );
  // 이름 선택 목록은 id·이름만 담는다. 타인의 금액·입금 상태는 집계(progress)로만 공개한다.
  const shares = allShares.map(({ id, name }) => ({ id, name }));
  const { targetCount, paidCount, paidPercent, isCompleted } =
    summarizeShares(allShares);

  return {
    status: "active",
    settlement: {
      id: settlement.id,
      totalAmount: settlement.totalAmount,
      hostIncluded: settlement.hostIncluded,
      headCount: settlement.headCount,
      perPersonAmount: settlement.perPersonAmount,
      hostRemainder: settlement.hostRemainder,
      paymentGuide: settlement.paymentGuide,
      status: settlement.status,
    },
    event: { title: event.title, startsAt: event.startsAt },
    groupName,
    shares,
    progress: { targetCount, paidCount, paidPercent, isCompleted },
  };
}

// 비회원용: 이름을 고른 뒤 본인 항목(금액·입금 상태)만 조회한다(FR-10).
// 유효한 토큰의 정산에 속한 항목이 아니면 null. 클라이언트에서는 app/actions/settlements.ts의
// getMySettlementShare(Server Action)로 감싸 호출한다.
export async function getPublicSettlementShare(
  token: string,
  shareId: string,
): Promise<PublicMySettlementShare | null> {
  await connection();
  await delay();

  const record = mockSettlementTokens.find((item) => item.token === token);
  if (!record || record.revoked) return null;
  const share = mockSettlementShares.find(
    (item) => item.id === shareId && item.settlementId === record.settlementId,
  );
  if (!share) return null;
  return { id: share.id, amount: share.amount, status: share.status };
}
