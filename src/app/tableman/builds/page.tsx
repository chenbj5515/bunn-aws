import { requireAdmin } from "@/lib/tableman/auth";
import { redirect } from "next/navigation";
import { BuildsPageClient } from "./_components/builds-page-client";

export default async function BuildsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/");
  }

  return <BuildsPageClient />;
}
