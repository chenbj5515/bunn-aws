import { requireAdmin } from "@/lib/tableman/auth";
import { redirect } from "next/navigation";
import { WebhookLogsPageClient } from "./_components/webhook-logs-page-client";

export default async function WebhookLogsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/");
  }

  return <WebhookLogsPageClient />;
}
