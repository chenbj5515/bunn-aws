"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Database, Users, Rocket, Webhook, Terminal } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  {
    href: "/tableman",
    icon: Database,
    label: "数据库一览",
  },
  {
    href: "/tableman/users",
    icon: Users,
    label: "用户管理",
  },
  {
    href: "/tableman/builds",
    icon: Rocket,
    label: "构建记录",
  },
  {
    href: "/tableman/webhook-logs",
    icon: Webhook,
    label: "Webhook 日志",
  },
  {
    href: "/tableman/sql",
    icon: Terminal,
    label: "SQL 执行器",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: sessionData } = useSession();
  const userImage = sessionData?.user?.image;

  const isActive = (href: string) => {
    if (href === "/tableman") {
      return pathname === "/tableman" || pathname?.startsWith("/tableman/tables");
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <div className="w-16 bg-neutral-900 flex flex-col h-dvh shrink-0">
      <div className="p-3 flex justify-center border-b border-neutral-800">
        <Link href="/" title="返回首页" aria-label="返回首页">
          <Avatar className="size-10 cursor-pointer rounded-xl">
            <AvatarImage src={userImage || undefined} alt="profile" />
            <AvatarFallback className="rounded-xl bg-neutral-700 text-sm font-medium text-white">
              U
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col items-center gap-2 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "size-10 rounded-xl flex items-center justify-center transition-colors",
                active
                  ? "bg-white text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              )}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
