import { NextRequest, NextResponse } from "next/server";
import { accountOAuthUrl } from "@/lib/oauthAccount";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(accountOAuthUrl("/api/oauth/userinfo"), {
      headers: {
        Accept: "application/json",
        ...(req.headers.get("authorization") ? { Authorization: req.headers.get("authorization")! } : {}),
      },
      cache: "no-store",
    });
    const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
    for (const name of ["content-type", "cache-control", "www-authenticate"]) {
      const value = upstream.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[oauth-userinfo-proxy]", error);
    return NextResponse.json(
      { error: "temporarily_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
