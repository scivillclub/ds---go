import { NextRequest, NextResponse } from "next/server";
import { LOGGED_OUT_COOKIE } from "@/lib/session";
import { fromOriginOfPath } from "@/lib/returnOrigins";

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
  // 다른 서비스(scivill 등)에 로그인한 채로 "내 계정 설정"을 누른 경우다.
  // 이때까지 로그아웃 표시 때문에 로그인 화면으로 튕겨서 자기 설정에 못 갔다.
  // 중앙 세션이 살아 있으면 그 계정으로 조용히 이어가고, 없으면 어차피 로그인 화면이 뜬다.
  const fromService = fromOriginOfPath(req.nextUrl.searchParams.get("return_to"));
  const forceLogin = req.nextUrl.searchParams.get("prompt") === "login"
    || (!fromService && req.cookies.get(LOGGED_OUT_COOKIE)?.value === "1");
  if (forceLogin) {
    loginUrl.searchParams.set("prompt", "login");
  }
  return NextResponse.redirect(loginUrl);
}
