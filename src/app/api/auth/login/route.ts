import { NextRequest, NextResponse } from "next/server";

const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

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

export function GET(req: NextRequest) {
  const callback = new URL("/api/auth/sso", req.nextUrl.origin);
  callback.searchParams.set("return_to", safeReturnTo(req.nextUrl.searchParams.get("return_to")));

  const loginUrl = new URL("/", ACCOUNT_URL);
  loginUrl.searchParams.set("redirect_uri", callback.toString());
  return NextResponse.redirect(loginUrl);
}
