"use client";

import { Sidebar } from "./sidebar";

export function TablemanLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
