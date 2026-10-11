const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "YYYY-MM-DDTHH:mm" 로컬 문자열을 "10월 13일 (화) 19:00"로 바꾼다.
// Date의 타임존 변환을 쓰지 않아 서버/클라이언트 출력이 항상 같다.
export function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const weekday = WEEKDAYS[new Date(+year, +month - 1, +day).getDay()];
  return `${+month}월 ${+day}일 (${weekday}) ${hour}:${minute}`;
}

// "YYYY-MM-DD"(뒤에 시각이 붙어도 무방)를 "2026년 9월 1일"로 바꾼다.
export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year}년 ${+month}월 ${+day}일`;
}

// 한국 시간(Asia/Seoul) 기준 현재 시각을 "YYYY-MM-DDTHH:mm"로 반환한다.
// 서버(UTC)와 브라우저의 타임존이 달라도 같은 값을 내므로 응답 마감 판정에 쓴다.
// 서버 컴포넌트에서는 connection() 이후에만 호출한다(요청 시점 값).
export function nowKstLocalString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// 현재 시각을 "YYYY-MM-DDTHH:mm" 로컬 문자열로 반환한다(클라이언트 이벤트 핸들러에서만 호출).
export function nowLocalString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
