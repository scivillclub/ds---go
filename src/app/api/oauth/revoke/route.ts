import { NextRequest, NextResponse } from "next/server";
import { accountOAuthUrl } from "@/lib/oauthAccount";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  if (body.byteLength > 32 * 1024) return new NextResponse(null, { status: 413 });
  try {
    const upstream = await fetch(accountOAuthUrl("/api/oauth/revoke"), {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/x-www-form-urlencoded",
        ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
      },
      body,
      cache: "no-store",
    });
    const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
    const auth = upstream.headers.get("www-authenticate");
    if (auth) response.headers.set("WWW-Authenticate", auth);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
  }
}
