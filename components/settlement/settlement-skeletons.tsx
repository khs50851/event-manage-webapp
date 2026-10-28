import { Skeleton } from "@/components/ui/skeleton";

// 요약 카드 자리(1인 금액·총액·완납률 막대)
function SummaryCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

// 주최자 정산 관리 로딩 상태(PRD 7장: 표 스켈레톤). 실제 화면 배치와 같은 순서로 자리를 잡는다.
export function HostSettlementSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-6"
      aria-busy="true"
      aria-label="精算情報を読み込み中"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex flex-col gap-2">
        <SummaryCardSkeleton />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-20" />
        {/* 입금 현황 표: 이름·상태 줄 + 오른쪽 버튼 */}
        <div className="divide-y rounded-md border">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-11 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 비회원 정산 조회 로딩 상태
export function PublicSettlementSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="精算情報を読み込み中"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-36" />
      </div>
      <SummaryCardSkeleton />
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
