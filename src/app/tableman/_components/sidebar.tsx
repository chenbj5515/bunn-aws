"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Database, Users, Table2 } from "lucide-react";

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
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/tableman") {
      return pathname === "/tableman" || pathname?.startsWith("/tableman/tables");
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <div className="w-16 bg-neutral-900 flex flex-col h-dvh shrink-0">
      <div className="p-3 flex justify-center border-b border-neutral-800">
        <div className="size-10 rounded-xl bg-neutral-800 flex items-center justify-center">
          <Table2 className="size-5 text-white" />
        </div>
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

      <div className="p-3 flex justify-center border-t border-neutral-800">
        <div className="size-10 rounded-full bg-neutral-700 flex items-center justify-center text-white text-sm font-medium">
          T
        </div>
      </div>
    </div>
  );
}
