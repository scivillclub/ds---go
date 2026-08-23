import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DeveloperPortal from "./developer-portal";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Developers · ds-go",
  description: "DS-GO OAuth 애플리케이션을 등록하고 관리합니다.",
};

export const dynamic = "force-dynamic";

export default async function DevelopersPage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/login?return_to=%2Fdevelopers");
  return <DeveloperPortal />;
}
