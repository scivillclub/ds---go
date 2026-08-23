import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { oauthAccountRequest } from "@/lib/oauthAccount";

const OAUTH_FIELDS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
] as const;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const body: Record<string, string> = {};
  for (const field of OAUTH_FIELDS) body[field] = String(form.get(field) || "");
  body.decision = form.get("decision") === "allow" ? "allow" : "deny";

  const session = await getSession();
  if (!session) {
    const returnUrl = new URL("/oauth/authorize", req.nextUrl.origin);
    for (const field of OAUTH_FIELDS) {
      if (body[field]) returnUrl.searchParams.set(field, body[field]);
    }
    const login = new URL("/api/auth/login", req.nextUrl.origin);
    login.searchParams.set("return_to", `${returnUrl.pathname}${returnUrl.search}`);
    return NextResponse.redirect(login, 303);
  }

  try {
    const upstream = await oauthAccountRequest(session, "/api/oauth/authorize", "POST", {
      body,
      requestOrigin: req.nextUrl.origin,
    });
    const data = await upstream.json().catch(() => null);
    if (typeof data?.redirectUrl === "string") {
      return NextResponse.redirect(data.redirectUrl, 303);
    }
    return NextResponse.json(
      { ok: false, error: data?.error || "authorization_failed" },
      { status: upstream.status >= 400 ? upstream.status : 502, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[oauth-authorize]", error);
    return NextResponse.json(
      { ok: false, error: "account_service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
