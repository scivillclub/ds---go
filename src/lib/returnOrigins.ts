/**
 * 다른 서비스에서 ds-go 계정 설정으로 들어올 때 쓰는 출처 목록.
 * 로그아웃 후 돌아갈 곳을 정하고, 열린 리다이렉트를 막는 데 함께 쓰인다.
 */
export const RETURN_ORIGINS = [
  "https://scivill.vercel.app",
  "https://scivill-admin.vercel.app",
  "https://scivill-deepthink.vercel.app",
  "https://scivill-nodetask.vercel.app",
  "https://scivill-sheet.vercel.app",
  "https://scivill-oryaform.vercel.app",
  "https://scivill-qrlink.vercel.app",
  ...(process.env.NEXT_PUBLIC_RETURN_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
];

/** 허용 목록에 있는 출처면 그 origin을, 아니면 null을 돌려준다. */
export function safeFromOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return RETURN_ORIGINS.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

/** "/settings?from=https://…" 같은 경로에서 from 출처만 뽑아낸다. */
export function fromOriginOfPath(path: string | null): string | null {
  if (!path) return null;
  try {
    return safeFromOrigin(new URL(path, "http://local").searchParams.get("from"));
  } catch {
    return null;
  }
}
