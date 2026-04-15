import { requireAdmin } from "@/lib/tableman/auth";
import { redirect } from "next/navigation";
import { getErrorLogs, clearErrorLogs, type ErrorLog } from "@/lib/error-logger";
import { revalidatePath } from "next/cache";

async function clearLogs() {
  "use server";
  const admin = await requireAdmin();
  if (!admin) return;
  await clearErrorLogs();
  revalidatePath("/tableman/error-logs");
}

export default async function ErrorLogsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const logs = await getErrorLogs(100);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">错误日志</h1>
        <form action={clearLogs}>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            清空日志
          </button>
        </form>
      </div>

      {logs.length === 0 ? (
        <div className="text-neutral-500 text-center py-12">暂无错误日志</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: ErrorLog, i: number) => (
            <div key={i} className="bg-neutral-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">
                  {new Date(log.timestamp).toLocaleString("zh-CN")}
                </span>
                {log.digest && (
                  <span className="text-xs bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">
                    Digest: {log.digest}
                  </span>
                )}
              </div>
              <div className="text-red-400 font-medium">{log.message}</div>
              {log.url && <div className="text-sm text-neutral-500">{log.url}</div>}
              {log.context && <div className="text-xs text-neutral-600">{log.context}</div>}
              {log.stack && (
                <pre className="text-xs text-neutral-500 overflow-x-auto whitespace-pre-wrap">
                  {log.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
