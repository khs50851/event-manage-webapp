import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 개발 모드 좌측 하단 Next.js 인디케이터(N 버튼) 숨김(컴파일/런타임 에러 오버레이는 유지)
  devIndicators: false,
  experimental: {
    serverActions: {
      // 프로필 사진 업로드(app/actions/profile.ts)는 최대 3MB 파일을 Server Action으로 받는다.
      // 기본 한도(1MB)로는 부족하고, 한도는 multipart 경계·헤더까지 포함한 본문 전체에 적용되므로
      // 여유를 두고 4MB로 잡는다. 실제 파일 크기 제한(3MB)은 서버 액션과 Storage 버킷이 다시 검사한다.
      // 사진 크기 제한을 바꿀 때는 버킷 설정, lib/schemas/profile.ts 상수와 함께 맞춘다.
      // 참고: 서명 URL 사진은 next/image를 unoptimized로 쓰므로 images.remotePatterns 설정은 필요 없다
      // (unoptimized면 기본 로더의 원격 호스트 검사를 거치지 않는다).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
