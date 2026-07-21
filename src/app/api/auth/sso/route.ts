import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/ssoToken";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

function safeReturnTo(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("return_to"));

  if (!token) return NextResponse.redirect(`${origin}?login_error=sso_missing`);

  const payload = await verifySSOToken(token);
  if (!payload) return NextResponse.redirect(`${origin}?login_error=sso_invalid`);

  const sessionToken = await createSessionToken(payload);
  const res = NextResponse.redirect(`${origin}${returnTo}`);
  res.cookies.set(sessionCookieOptions(sessionToken));
  return res;
}
