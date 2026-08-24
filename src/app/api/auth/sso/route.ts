import { NextRequest, NextResponse } from "next/server";
import { verifySSOToken } from "@/lib/ssoToken";
import { createSessionToken, LOGGED_OUT_COOKIE, sessionCookieOptions } from "@/lib/session";

function safeReturnTo(path: string | null): string {
  if (!path) return "/";
  try {
    const url = new URL(path, "http://local");
    if (url.origin !== "http://local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("return_to"));

  if (!token) return NextResponse.redirect(`${origin}?login_error=sso_missing`);

  const payload = await verifySSOToken(token, origin);
  if (!payload) return NextResponse.redirect(`${origin}?login_error=sso_invalid`);

  const sessionToken = await createSessionToken(payload);
  const res = NextResponse.redirect(`${origin}${returnTo}`);
  res.cookies.set(sessionCookieOptions(sessionToken, payload.remember));
  res.cookies.set({
    name: LOGGED_OUT_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
