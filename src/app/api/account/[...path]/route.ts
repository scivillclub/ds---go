import { NextRequest, NextResponse } from "next/server";
import { createAccountProxyAssertion } from "@/lib/accountProxy";
import { getSession } from "@/lib/session";

const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

const ALLOWED_ROUTES = new Set([
  "GET /api/account/profile",
  "PATCH /api/account/profile",
  "DELETE /api/account/profile",
  "POST /api/account/email/send-code",
  "POST /api/account/email/verify",
  "POST /api/account/local-credentials",
  "POST /api/account/bytenode/unlink",
  "POST /api/account/orya/unlink",
  "POST /api/account/reports",
  "GET /api/account/reports",
  "GET /api/account/inbox",
  "GET /api/account/oauth/apps",
  "POST /api/account/oauth/apps",
]);

function isAllowed(method: string, path: string) {
  return ALLOWED_ROUTES.has(`${method} ${path}`)
    || (method === "PATCH" && /^\/api\/account\/inbox\/[^/]+\/read$/.test(path))
    || (["PATCH", "DELETE"].includes(method) && /^\/api\/account\/oauth\/apps\/dsg_[A-Za-z0-9_-]+$/.test(path))
    || (method === "POST" && /^\/api\/account\/oauth\/apps\/dsg_[A-Za-z0-9_-]+\/secret$/.test(path));
}

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await context.params;

  const method = req.method.toUpperCase();
  const path = `/api/account/${pathSegments.join("/")}`;
  if (!isAllowed(method, path)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const assertion = await createAccountProxyAssertion(session, path, method);
    const origin = process.env.NODE_ENV === "production"
      ? new URL(process.env.DSGO_PUBLIC_URL || "https://dsgo.vercel.app").origin
      : req.nextUrl.origin;
    const headers: HeadersInit = {
      Authorization: `Bearer ${assertion}`,
      Origin: origin,
      Accept: "application/json",
    };
    const body = method === "GET" ? undefined : await req.text();
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const upstream = await fetch(new URL(path, ACCOUNT_URL), {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
    const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
    response.headers.set("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[account-proxy]", error);
    return NextResponse.json({ ok: false, error: "account_service_unavailable" }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
