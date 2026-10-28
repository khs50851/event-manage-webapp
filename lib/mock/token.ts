// 더미 토큰 발급 흉내(화면 상태 시뮬레이션 전용). 실제 토큰은 서버가 발급하는 128비트 이상 무작위 값이며,
// 여기서는 같은 길이(16바이트 → 32자 16진수)로 흉내만 낸다. 연동 단계(I4·I5-3)에서 호출부와 함께 제거한다.
export function createMockToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
