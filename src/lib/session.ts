import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "dsgo_session";
export const SESSION_TTL_SHORT = 24 * 60 * 60;
export const SESSION_TTL_LONG = 30 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  role: string;
  remember?: boolean;
}

function getSecret() {
  const s = process.env.SESSION_SECRET ?? "dev-secret-fallback-32-chars-ok!";
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const remember = payload.remember === true;
  const ttl = remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT;
  return new SignJWT({ userId: payload.userId, role: payload.role, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${ttl}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      role: typeof payload.role === "string" ? payload.role : "member",
      remember: payload.remember === true,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string, remember = false) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT,
    path: "/",
  };
}
