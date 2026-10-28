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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // 세션이 생겼으므로 홈으로 이동하고, 서버 컴포넌트가 새 세션을 읽도록 새로고침한다
      router.push("/");
      router.refresh();
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
            <h1>ログイン</h1>
          </CardTitle>
          <CardDescription>
            メールアドレスとパスワードを入力してログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <GoogleSignInButton />
          <AuthDivider />
          <form onSubmit={handleLogin}>
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
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
                  >
                    パスワードをお忘れですか?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <AuthFormError message={error} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              アカウントをお持ちでないですか?{" "}
              <Link
                href="/auth/sign-up"
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                新規登録
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
