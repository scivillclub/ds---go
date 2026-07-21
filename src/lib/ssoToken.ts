/**
 * ssoToken.ts — dsgoaccount(scivill IdP)이 서명한 60초짜리 단회성 SSO 토큰 검증
 */
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "scivill-default-secret-change-this-in-prod"
);

export async function verifySSOToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    if (!payload.sso || typeof payload.userId !== "string" || !payload.userId) return null;
    return {
      userId: payload.userId,
      role: typeof payload.role === "string" ? payload.role : "member",
    };
  } catch {
    return null;
  }
}
