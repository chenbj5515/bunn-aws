const GITHUB_API_BASE = "https://api.github.com";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

function getConfig(): GitHubConfig {
  const token = process.env.DEPLOY_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const owner = process.env.DEPLOY_GITHUB_OWNER || process.env.GITHUB_OWNER || "chenbj5515";
  const repo = process.env.DEPLOY_GITHUB_REPO || "bunn-aws";

  if (!token) {
    throw new Error("GITHUB_TOKEN or DEPLOY_GITHUB_TOKEN is not configured");
  }

  return { token, owner, repo };
}

async function githubFetch<T>(path: string): Promise<T> {
  const { token } = getConfig();
  
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
  workflow_id: number;
  html_url: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  run_attempt: number;
  actor: {
    login: string;
    avatar_url: string;
  };
  triggering_actor: {
    login: string;
    avatar_url: string;
  };
  repository: {
    full_name: string;
  };
}

export interface WorkflowRunsResponse {
  total_count: number;
  workflow_runs: WorkflowRun[];
}

export interface PackageVersion {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: {
    container?: {
      tags: string[];
    };
  };
}

export interface PackageVersionsResponse {
  versions: PackageVersion[];
  total: number;
}

export async function getWorkflowRuns(
  page = 1,
  perPage = 20,
  status?: string,
  branch?: string
): Promise<WorkflowRunsResponse> {
  const { owner, repo } = getConfig();
  
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  
  if (status) {
    params.set("status", status);
  }
  
  if (branch) {
    params.set("branch", branch);
  }

  return githubFetch<WorkflowRunsResponse>(
    `/repos/${owner}/${repo}/actions/runs?${params.toString()}`
  );
}

export async function getWorkflowRun(runId: number): Promise<WorkflowRun> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowRun>(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

export async function getPackageVersions(
  page = 1,
  perPage = 20
): Promise<PackageVersionsResponse> {
  const { owner, repo } = getConfig();
  const packageName = repo.toLowerCase();
  
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    package_type: "container",
  });

  try {
    const versions = await githubFetch<PackageVersion[]>(
      `/users/${owner}/packages/container/${packageName}/versions?${params.toString()}`
    );
    
    return {
      versions,
      total: versions.length,
    };
  } catch {
    return { versions: [], total: 0 };
  }
}

export function calculateDuration(startedAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  
  return Math.round((end - start) / 1000);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}
