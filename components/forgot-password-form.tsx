"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toKoreanAuthError } from "@/lib/auth/error-message";
import { AuthFormError } from "@/components/auth-form-error";
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
              <h1>メールをご確認ください</h1>
            </CardTitle>
            <CardDescription>
              パスワード再設定のご案内メールを送信しました。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              メールアドレスとパスワードで登録したアカウントであれば、再設定メールが届きます。メールが見当たらない場合は迷惑メールフォルダもご確認ください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              <h1>パスワードの再設定</h1>
            </CardTitle>
            <CardDescription>
              登録したメールアドレスを入力すると、パスワードを再設定できるリンクをお送りします。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
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
                <AuthFormError message={error} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "送信中..." : "再設定メールを送信"}
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
      )}
    </div>
  );
}
