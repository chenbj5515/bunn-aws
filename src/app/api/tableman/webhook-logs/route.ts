import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";
import { getWebhookLogs, type WebhookLogEntry, type WebhookProcessingBranch } from "@/lib/webhook-log";

export const dynamic = "force-dynamic";

export interface WebhookLogsResponse {
  logs: WebhookLogEntry[];
  total: number;
  page: number;
  perPage: number;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return unauthorizedResponse(admin);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "20", 10);
    const userId = searchParams.get("userId") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
    const branch = searchParams.get("branch") as WebhookProcessingBranch | undefined;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? parseInt(startDateStr, 10) : undefined;
    const endDate = endDateStr ? parseInt(endDateStr, 10) : undefined;

    const result = await getWebhookLogs({
      page,
      perPage,
      userId,
      eventType,
      branch,
      startDate,
      endDate,
    });

    const response: WebhookLogsResponse = {
      logs: result.logs,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch webhook logs" },
      { status: 500 }
    );
  }
}
