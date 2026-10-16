"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { ko } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateTime, nowLocalString } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULT_TIME = "19:00";
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" 문자열을 로컬 Date로 바꾼다(타임존 변환 없음).
function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  return new Date(+match[1], +match[2] - 1, +match[3]);
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 값에서 날짜("YYYY-MM-DD")와 시각("HH:mm")을 분리한다. 비어 있으면 둘 다 빈 문자열.
function splitValue(value: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return match ? { date: match[1], time: match[2] } : { date: "", time: "" };
}

// "YYYY-MM-DDTHH:mm" 문자열을 입력·출력으로 쓰는 날짜+시간 선택기.
// 값 포맷이 datetime-local과 같아 기존 스키마·서버 액션을 그대로 쓴다.
export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "날짜·시간 선택",
  clearable = false,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (value: string) => void;
  // 선택 가능한 날짜 범위("YYYY-MM-DDTHH:mm", 날짜 부분만 비교한다)
  min?: string;
  max?: string;
  placeholder?: string;
  // 선택 입력 필드에서 값을 비울 수 있게 한다
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
}) {
  const [open, setOpen] = useState(false);
  const { date, time } = splitValue(value);
  const [hour24, minute] = (time || DEFAULT_TIME).split(":").map(Number);
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const minDate = min ? splitValue(min).date : "";
  const maxDate = max ? splitValue(max).date : "";

  function emit(nextDate: string, nextTime: string) {
    onChange(`${nextDate}T${nextTime}`);
  }

  function selectDay(day: Date | undefined) {
    if (!day) return;
    emit(toDateString(day), time || DEFAULT_TIME);
  }

  // 날짜를 고르기 전에 시간을 먼저 누르면 오늘 날짜로 채운다.
  function setTime(nextHour24: number, nextMinute: number) {
    const baseDate = date || nowLocalString().slice(0, 10);
    emit(baseDate, `${pad(nextHour24)}:${pad(nextMinute)}`);
  }

  function pickHour(h12: number) {
    setTime((h12 % 12) + (isPm ? 12 : 0), minute);
  }

  function pickMinute(m: number) {
    setTime(hour24, m);
  }

  function pickPeriod(pm: boolean) {
    setTime((hour24 % 12) + (pm ? 12 : 0), minute);
  }

  const optionClass = "min-h-11 px-0";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          className={cn(
            "min-h-11 w-full justify-start font-normal",
            value === "" && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon aria-hidden className="size-4" />
          {value === "" ? placeholder : formatDateTime(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-(--radix-popover-content-available-height) w-auto max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto p-0"
      >
        <Calendar
          mode="single"
          locale={ko}
          selected={parseDate(date)}
          defaultMonth={parseDate(date)}
          onSelect={selectDay}
          disabled={(day) => {
            const key = toDateString(day);
            return (
              (minDate !== "" && key < minDate) ||
              (maxDate !== "" && key > maxDate)
            );
          }}
          className="[--cell-size:--spacing(10)]"
        />
        <div className="flex flex-col gap-3 border-t p-3">
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="오전/오후"
          >
            {[
              { label: "오전", pm: false },
              { label: "오후", pm: true },
            ].map(({ label, pm }) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={isPm === pm ? "default" : "outline"}
                aria-pressed={isPm === pm}
                onClick={() => pickPeriod(pm)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div role="group" aria-label="시" className="grid grid-cols-6 gap-1">
            {HOURS_12.map((h) => (
              <Button
                key={h}
                type="button"
                size="sm"
                variant={hour12 === h ? "default" : "outline"}
                aria-pressed={hour12 === h}
                className={optionClass}
                onClick={() => pickHour(h)}
              >
                {h}시
              </Button>
            ))}
          </div>
          <div role="group" aria-label="분" className="grid grid-cols-6 gap-1">
            {MINUTES.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={minute === m ? "default" : "outline"}
                aria-pressed={minute === m}
                className={optionClass}
                onClick={() => pickMinute(m)}
              >
                {pad(m)}분
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {clearable && value !== "" && (
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                지우기
              </Button>
            )}
            <Button
              type="button"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
