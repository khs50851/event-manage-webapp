"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toKoreanAuthError } from "@/lib/auth/error-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // 메일에 포함될 URL. Supabase 대시보드의 Redirect URLs에 등록되어 있어야 한다
      // (https://supabase.com/dashboard/project/_/auth/url-configuration)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(toKoreanAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              <h1>이메일을 확인해 주세요</h1>
            </CardTitle>
            <CardDescription>
              비밀번호 재설정 안내 메일을 보냈어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              이메일과 비밀번호로 가입한 계정이라면 비밀번호 재설정 메일을 받을
              수 있어요. 메일이 보이지 않으면 스팸함도 확인해 주세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              <h1>비밀번호 재설정</h1>
            </CardTitle>
            <CardDescription>
              가입한 이메일을 입력하면 비밀번호를 재설정할 수 있는 링크를
              보내드려요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "보내는 중..." : "재설정 메일 보내기"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                이미 계정이 있으신가요?{" "}
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4"
                >
                  로그인
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
