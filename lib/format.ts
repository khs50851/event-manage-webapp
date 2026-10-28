const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 날짜·시각 조립용 두 자리 0 채움(7 → "07")
export function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

// "YYYY-MM-DDTHH:mm" 로컬 문자열을 "10월 13일 (화) 19:00"로 바꾼다.
// Date의 타임존 변환을 쓰지 않아 서버/클라이언트 출력이 항상 같다.
export function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const weekday = WEEKDAYS[new Date(+year, +month - 1, +day).getDay()];
  return `${+month}月${+day}日(${weekday}) ${hour}:${minute}`;
}

// "YYYY-MM-DD"(뒤에 시각이 붙어도 무방)를 "2026년 9월 1일"로 바꾼다.
export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year}年${+month}月${+day}日`;
}

const YEN_FORMATTER = new Intl.NumberFormat("ja-JP");

// 원 단위 정수를 "12,000원"으로 바꾼다.
export function formatYen(amount: number): string {
  return `${YEN_FORMATTER.format(amount)}円`;
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

// timestamptz 문자열(ISO 8601)을 한국 시간(Asia/Seoul) 기준 "YYYY-MM-DD"로 바꾼다.
// 해석할 수 없는 값이면 null을 반환한다.
export function toKstDateString(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // en-CA 형식은 "YYYY-MM-DD"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// 현재 시각을 "YYYY-MM-DDTHH:mm" 로컬 문자열로 반환한다(클라이언트 이벤트 핸들러에서만 호출).
export function nowLocalString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}T${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`;
}
