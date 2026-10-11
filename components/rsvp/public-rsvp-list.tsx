import { cn } from "@/lib/utils";
import {
  RSVP_STATUS_LABEL,
  RSVP_STATUS_ORDER,
  summarizeRsvps,
} from "@/lib/rsvp";
import type { Rsvp } from "@/lib/types/domain";

// 비회원에게 공개하는 응답 목록(Q6: 참석/불참/미정 이름과 인원수 전부 공개).
// 이름 스냅샷과 상태만 렌더링하며 연락처 메모는 데이터로도 받지 않는다.
// 훅이 없어 서버·클라이언트 어디서든 렌더링할 수 있다.
export function PublicRsvpList({
  rsvps,
  capacity,
  myRsvpId,
  className,
}: {
  rsvps: Rsvp[];
  capacity: number | null;
  // 이 기기에서 제출한 응답(강조 표시용)
  myRsvpId?: string | null;
  className?: string;
}) {
  const summary = summarizeRsvps(rsvps, capacity);

  return (
    <section
      aria-labelledby="public-rsvp-heading"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="public-rsvp-heading" className="text-lg font-semibold">
          응답 현황
        </h2>
        <p className="text-sm text-muted-foreground">
          참석 {summary.attending.length}
          {capacity !== null && `/${capacity}`}명
          {summary.overflow > 0 && (
            <span className="font-semibold text-destructive">
              {" "}
              (정원 초과 +{summary.overflow})
            </span>
          )}
        </p>
      </div>

      {rsvps.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          아직 응답이 없습니다. 첫 번째로 응답해 보세요.
        </p>
      ) : (
        <dl className="flex flex-col gap-3">
          {RSVP_STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-md border p-3">
              <dt className="text-sm font-semibold">
                {RSVP_STATUS_LABEL[status]} {summary[status].length}명
              </dt>
              <dd className="mt-1 text-sm">
                {summary[status].length === 0 ? (
                  <span className="text-muted-foreground">없음</span>
                ) : (
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {summary[status].map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          item.id === myRsvpId && "font-semibold text-primary",
                        )}
                      >
                        {item.name}
                        {item.id === myRsvpId && " (내 응답)"}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
