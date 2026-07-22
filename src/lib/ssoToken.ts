/** Verify SSO tokens at the account service so SP secrets never need to match. */
const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

interface VerifyResponse {
  ok?: boolean;
  userId?: string;
  role?: string;
  remember?: boolean;
  sessionVersion?: number;
  authVersion?: number;
}

export async function verifySSOToken(
  token: string,
  audience: string
): Promise<{ userId: string; role: string; remember: boolean; sessionVersion: number; authVersion: number } | null> {
  try {
    const url = new URL("/api/auth/sso/verify", ACCOUNT_URL);
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, audience }),
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 405) {
      url.searchParams.set("token", token);
      url.searchParams.set("audience", audience);
      response = await fetch(url, { cache: "no-store" });
    }
    if (!response.ok) return null;

    const data = (await response.json()) as VerifyResponse;
    if (!data.ok || typeof data.userId !== "string" || !data.userId) return null;
    return {
      userId: data.userId,
      role: typeof data.role === "string" ? data.role : "member",
      remember: data.remember === true,
      sessionVersion: Number.isInteger(data.sessionVersion) ? Number(data.sessionVersion) : -1,
      authVersion: Number.isInteger(data.authVersion) ? Number(data.authVersion) : -1,
    };
  } catch {
    return null;
  }
}
