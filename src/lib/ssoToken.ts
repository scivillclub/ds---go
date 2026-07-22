/** Verify SSO tokens at the account service so SP secrets never need to match. */
const ACCOUNT_URL =
  process.env.DSGO_ACCOUNT_URL ||
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ||
  "https://dsgoaccount.vercel.app";

interface VerifyResponse {
  ok?: boolean;
  userId?: string;
  role?: string;
}

export async function verifySSOToken(
  token: string,
  audience: string
): Promise<{ userId: string; role: string } | null> {
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
    };
  } catch {
    return null;
  }
}
