"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toKoreanAuthError } from "@/lib/auth/error-message";
import { AuthDivider } from "@/components/auth-divider";
import { AuthFormError } from "@/components/auth-form-error";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("パスワードが一致しません。");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // 인증 메일 링크는 confirm 라우트를 거쳐 세션을 확정한 뒤 홈으로 이동한다
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
        },
      });
      if (error) throw error;
      // 이메일 확인을 끈 프로젝트는 가입 즉시 세션이 발급되므로 바로 홈으로 이동한다
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(toKoreanAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>新規登録</h1>
          </CardTitle>
          <CardDescription>
            新しいアカウントを作成してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <GoogleSignInButton />
          <AuthDivider />
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">メールアドレス</Label>
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
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">パスワード</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">パスワード(確認)</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <AuthFormError message={error} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "登録中..." : "新規登録"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              すでにアカウントをお持ちですか?{" "}
              <Link
                href="/auth/login"
                className="inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-4"
              >
                ログイン
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
