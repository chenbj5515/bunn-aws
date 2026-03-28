import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { rateLimitedProcedure } from "../../procedures";
import { textToSqlInput, textToSqlOutput } from "./type";
import { trackUsage } from "@/lib/auth/billing";
import { getPublicSchemaContext } from "@/lib/tableman/schema-context";
import { ERROR_CODES } from "@/server/constants";

interface TextToSqlPayload {
  sql?: unknown;
  explanation?: unknown;
}

function extractJson(text: string): string {
  let normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  if (!normalized.startsWith("{")) {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      normalized = normalized.slice(start, end + 1);
    }
  }

  return normalized;
}

export const textToSql = rateLimitedProcedure
  .input(textToSqlInput)
  .output(textToSqlOutput)
  .mutation(async ({ input, ctx }) => {
    if (ctx.rateLimited) {
      return { errorCode: ERROR_CODES.TOKEN_LIMIT_EXCEEDED };
    }

    const role = (ctx.user as { role?: string }).role;
    if (role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    const schemaContext = await getPublicSchemaContext();
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0,
      maxOutputTokens: 1200,
      messages: [
        {
          role: "system",
          content: `你是 PostgreSQL 专家，负责把管理员的中文需求转换成可执行 SQL。

规则：
1. 只能基于给定 schema 生成 SQL，不要臆造不存在的表、列或关系。
2. 输出必须是单条 PostgreSQL SQL。
3. 返回严格 JSON，不要使用 Markdown 代码块，不要附加多余说明。
4. explanation 用中文，简短说明 SQL 的意图。
5. 如果需求存在歧义，请给出你认为最合理的 SQL，不要反问。

返回格式：
{
  "sql": "...",
  "explanation": "..."
}`,
        },
        {
          role: "user",
          content: `当前数据库 public schema 如下：
${schemaContext}

用户需求：
${input.prompt}`,
        },
      ],
    });

    after(() =>
      trackUsage({
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        model: "gpt-4o-mini",
      })
    );

    let parsed: TextToSqlPayload;
    try {
      parsed = JSON.parse(extractJson(result.text));
    } catch {
      return { errorCode: ERROR_CODES.TEXT_TO_SQL_PARSE_FAILED };
    }

    const sql = typeof parsed.sql === "string" ? parsed.sql.trim() : "";
    if (!sql) {
      return { errorCode: ERROR_CODES.TEXT_TO_SQL_SQL_MISSING };
    }

    const explanation =
      typeof parsed.explanation === "string" && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : "根据当前 schema 生成 SQL。";

    return {
      errorCode: null,
      sql,
      explanation,
    };
  });
