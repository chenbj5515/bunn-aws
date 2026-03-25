import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/tableman/auth";
import { getWorkflowRuns, calculateDuration, formatDuration } from "@/lib/github";

export const dynamic = "force-dynamic";

export interface BuildRecord {
  id: number;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
  commitSha: string;
  commitShort: string;
  branch: string;
  event: string;
  actor: {
    login: string;
    avatarUrl: string;
  };
  imageTag: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  durationFormatted: string;
  url: string;
}

export interface BuildsResponse {
  builds: BuildRecord[];
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
    const status = searchParams.get("status") || undefined;
    const branch = searchParams.get("branch") || undefined;

    const data = await getWorkflowRuns(page, perPage, status, branch);

    const builds: BuildRecord[] = data.workflow_runs.map((run) => {
      const duration = run.status === "completed" 
        ? calculateDuration(run.run_started_at, run.updated_at)
        : null;

      return {
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        commitSha: run.head_sha,
        commitShort: run.head_sha.slice(0, 7),
        branch: run.head_branch,
        event: run.event,
        actor: {
          login: run.triggering_actor?.login || run.actor?.login || "unknown",
          avatarUrl: run.triggering_actor?.avatar_url || run.actor?.avatar_url || "",
        },
        imageTag: `sha-${run.head_sha}`,
        startedAt: run.run_started_at,
        completedAt: run.status === "completed" ? run.updated_at : null,
        duration,
        durationFormatted: formatDuration(duration),
        url: run.html_url,
      };
    });

    const response: BuildsResponse = {
      builds,
      total: data.total_count,
      page,
      perPage,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching builds:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch builds" },
      { status: 500 }
    );
  }
}
