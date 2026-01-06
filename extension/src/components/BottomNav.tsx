"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "添加" },
  { href: "/tasks", label: "任务" },
  { href: "/settings", label: "设置" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="h-12 border-t bg-card text-card-foreground flex items-stretch">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={[
              "flex-1 flex items-center justify-center text-sm",
              active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

