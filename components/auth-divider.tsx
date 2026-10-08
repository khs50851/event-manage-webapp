import { cn } from "@/lib/utils";

export function AuthDivider({
  className,
  children = "또는",
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      role="separator"
      className={cn("flex items-center gap-3", className)}
      {...props}
    >
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
