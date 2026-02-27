import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

function getRequestId(req: Request) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

function safeParseJsonBody(req: Request) {
  return req
    .clone()
    .json()
    .catch(() => null);
}

function getAuthBodyPreview(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  return {
    provider: payload.provider ?? null,
    callbackURL:
      typeof payload.callbackURL === "string" ? payload.callbackURL : null,
    callbackUrl:
      typeof payload.callbackUrl === "string" ? payload.callbackUrl : null,
  };
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  const body = await safeParseJsonBody(req);

  console.info("[auth][POST][start]", {
    requestId,
    path: new URL(req.url).pathname,
    origin: req.headers.get("origin"),
    host: req.headers.get("host"),
    xForwardedProto: req.headers.get("x-forwarded-proto"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    body: getAuthBodyPreview(body),
  });

  try {
    const res = await handler.POST(req);

    if (res.status >= 500) {
      const responseText = await res
        .clone()
        .text()
        .catch(() => "[unreadable response body]");
      console.error("[auth][POST][5xx]", {
        requestId,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
        responseText: responseText.slice(0, 1500),
      });
    } else {
      console.info("[auth][POST][done]", {
        requestId,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
      });
    }

    return res;
  } catch (error) {
    console.error("[auth][POST][exception]", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  const pathname = new URL(req.url).pathname;

  try {
    const res = await handler.GET(req);

    if (pathname.includes("/callback/")) {
      console.info("[auth][GET][callback]", {
        requestId,
        pathname,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
      });
    }

    if (res.status >= 500) {
      const responseText = await res
        .clone()
        .text()
        .catch(() => "[unreadable response body]");
      console.error("[auth][GET][5xx]", {
        requestId,
        pathname,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
        responseText: responseText.slice(0, 1500),
      });
    }

    return res;
  } catch (error) {
    console.error("[auth][GET][exception]", {
      requestId,
      pathname,
      elapsedMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}
