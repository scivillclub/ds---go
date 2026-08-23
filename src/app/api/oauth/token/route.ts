import { NextRequest, NextResponse } from "next/server";
import { accountOAuthUrl } from "@/lib/oauthAccount";

const MAX_BODY_BYTES = 32 * 1024;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  }
  const body = await req.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  }

  try {
    const upstream = await fetch(accountOAuthUrl("/api/oauth/token"), {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
      },
      body,
      cache: "no-store",
    });
    const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
    for (const name of ["content-type", "cache-control", "pragma", "www-authenticate"]) {
      const value = upstream.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[oauth-token-proxy]", error);
    return NextResponse.json(
      { error: "temporarily_unavailable", error_description: "The authorization server is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
