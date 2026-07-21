import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "dsgo_session";
const SESSION_TTL = 7 * 24 * 60 * 60; // 7일 — dsgo는 자체 refresh 저장소가 없어 단일 장기 쿠키로 처리

export interface SessionPayload {
  userId: string;
  role: string;
}

function getSecret() {
  const s = process.env.SESSION_SECRET ?? "dev-secret-fallback-32-chars-ok!";
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId, role: typeof payload.role === "string" ? payload.role : "member" };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL,
    path: "/",
  };
}
