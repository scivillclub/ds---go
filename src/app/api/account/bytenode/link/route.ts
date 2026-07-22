import { NextRequest, NextResponse } from "next/server";
import { createAccountProxyAssertion } from "@/lib/accountProxy";
import { getSession } from "@/lib/session";

const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/api/auth/login?return_to=%2Fsettings", req.url));
  }
  try {
    const path = "/api/account/bytenode/link";
    const assertion = await createAccountProxyAssertion(session, path, "GET");
    const url = new URL(path, ACCOUNT_URL);
    url.searchParams.set("proxy_token", assertion);
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    console.error("[bytenode-link]", error);
    return NextResponse.redirect(new URL("/settings?bytenode=config_error", req.url));
  }
}
