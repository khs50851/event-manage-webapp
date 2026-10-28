import { z } from "zod";

// 여러 폼 스키마가 함께 쓰는 규칙. 화면(폼)과 서버(Server Action)가 같은 값을 공유한다.

// 사람 이름 1~30자(멤버 명부·응답자 이름·프로필 표시 이름, DB 제약과 동일)
export const personNameSchema = z
  .string()
  .trim()
  .min(1, "名前を入力してください。")
  .max(30, "名前は30文字以内で入力してください。");

// 응답 마감 > 시작 시각일 때의 안내(회차 폼·응답 마감 폼·setRsvpDeadline 액션 공통)
export const RSVP_DEADLINE_AFTER_START_MESSAGE =
  "回答締切は開始時刻より後にできません。";
