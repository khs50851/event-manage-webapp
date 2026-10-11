import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 개발 모드 좌측 하단 Next.js 인디케이터(N 버튼) 숨김(컴파일/런타임 에러 오버레이는 유지)
  devIndicators: false,
};

export default nextConfig;
