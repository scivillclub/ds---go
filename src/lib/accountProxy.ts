import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import type { SessionPayload } from "@/lib/session";

function getProxySecret() {
  const secret = process.env.ACCOUNT_PROXY_SECRET;
  if (!secret) throw new Error("ACCOUNT_PROXY_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function createAccountProxyAssertion(
  session: SessionPayload,
  path: string,
  method: string,
) {
  return new SignJWT({
    userId: session.userId,
    role: session.role,
    sessionVersion: session.sessionVersion,
    authVersion: session.authVersion,
    path,
    method: method.toUpperCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("dsgo")
    .setAudience("dsgoaccount")
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(getProxySecret());
}
