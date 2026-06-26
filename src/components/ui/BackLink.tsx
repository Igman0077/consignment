import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("back-link", className)}>
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
