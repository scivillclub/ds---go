import type { SessionPayload } from "@/lib/session";
import { createAccountProxyAssertion } from "@/lib/accountProxy";

const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

export async function oauthAccountRequest(
  session: SessionPayload,
  pathname: string,
  method: "GET" | "POST",
  options: { search?: URLSearchParams; body?: unknown; requestOrigin?: string } = {},
) {
  const assertion = await createAccountProxyAssertion(session, pathname, method);
  const url = new URL(pathname, ACCOUNT_URL);
  if (options.search) url.search = options.search.toString();
  const origin = process.env.NODE_ENV === "production"
    ? new URL(process.env.DSGO_PUBLIC_URL || "https://dsgo.vercel.app").origin
    : options.requestOrigin || "http://localhost:3000";

  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${assertion}`,
      Origin: origin,
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    redirect: "manual",
  });
}

export function accountOAuthUrl(pathname: string) {
  return new URL(pathname, ACCOUNT_URL);
}
