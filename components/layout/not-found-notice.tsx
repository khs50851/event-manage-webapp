import Link from "next/link";

// 라우트 not-found.tsx의 공통 화면
export function NotFoundNotice({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center text-sm underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
