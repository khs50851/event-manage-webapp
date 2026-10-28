import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>ご登録ありがとうございます!</h1>
          </CardTitle>
          <CardDescription>メールをご確認ください</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            新規登録が完了しました。ログインする前に、受信トレイの認証リンクをタップしてアカウントを確認してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
