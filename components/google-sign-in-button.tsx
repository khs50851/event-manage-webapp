"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Google OAuth(PKCE) 로그인. 인증 후 /auth/callback 에서 세션으로 교환한다.
export function GoogleSignInButton({
  className,
  ...props
}: Omit<
  React.ComponentPropsWithoutRef<typeof Button>,
  "children" | "onClick" | "type"
>) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // 성공하면 Google 화면으로 이동하므로 실패한 경우에만 에러 화면으로 보낸다
    if (error) router.push("/auth/error?error=oauth_start_failed");
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full", className)}
      disabled={isLoading}
      onClick={handleClick}
      {...props}
    >
      <GoogleIcon />
      Google で続ける
    </Button>
  );
}
