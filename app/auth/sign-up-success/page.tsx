import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-4">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                가입해 주셔서 감사해요!
              </CardTitle>
              <CardDescription>이메일을 확인해 주세요</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                회원가입이 완료되었어요. 로그인하기 전에 메일함에서 인증 링크를
                눌러 계정을 확인해 주세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
