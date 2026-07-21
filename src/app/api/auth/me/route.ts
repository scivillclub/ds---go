import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { ok: true, user: { id: session.userId, role: session.role } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
