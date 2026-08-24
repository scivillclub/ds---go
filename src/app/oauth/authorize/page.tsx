import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { oauthAccountRequest } from "@/lib/oauthAccount";

export const metadata: Metadata = { title: "앱 연결 승인 · ds-go" };
export const dynamic = "force-dynamic";

const FIELDS = ["client_id", "redirect_uri", "response_type", "scope", "state", "code_challenge", "code_challenge_method"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();
  for (const field of FIELDS) {
    const value = first(resolvedSearchParams[field]);
    if (value) query.set(field, value);
  }
  const returnTo = `/oauth/authorize?${query.toString()}`;
  const switchAccountHref = `/api/auth/login?return_to=${encodeURIComponent(returnTo)}&prompt=login`;
  const session = await getSession();
  if (!session) redirect(`/api/auth/login?return_to=${encodeURIComponent(returnTo)}`);

  let data: {
    ok?: boolean;
    error?: string;
    errorDescription?: string;
    redirectUrl?: string;
    app?: { clientId: string; name: string; description: string; homepageUrl: string };
    user?: { displayName: string; username: string; email: string };
    scopes?: string[];
  } | null = null;
  try {
    const upstream = await oauthAccountRequest(session, "/api/oauth/authorize/context", "GET", { search: query });
    data = await upstream.json().catch(() => null);
  } catch {
    data = { error: "account_service_unavailable", errorDescription: "계정 서버에 연결할 수 없습니다." };
  }
  if (data?.redirectUrl) redirect(data.redirectUrl);

  if (!data?.ok || !data.app || !data.user || !data.scopes) {
    return (
      <main className="oauth-consent-shell">
        <section className="oauth-error-card">
          <div className="oauth-brand"><Image src="/logo-light.svg" alt="ds-go" width={66} height={51} className="logo-img logo-img-light" /><Image src="/logo-dark.svg" alt="ds-go" width={66} height={51} className="logo-img logo-img-dark" /></div>
          <span>OAUTH ERROR</span><h1>요청을 확인할 수 없습니다.</h1>
          <p>{data?.errorDescription || "client_id와 redirect_uri가 올바른지 확인해 주세요."}</p>
          <code>{data?.error || "invalid_request"}</code><a href="/developers">개발자 페이지로 돌아가기</a>
        </section>
      </main>
    );
  }

  const scopeText: Record<string, { title: string; description: string }> = {
    profile: { title: "기본 프로필", description: "사용자 ID, 표시 이름, 아이디" },
    email: { title: "이메일 주소", description: "이메일 주소와 인증 여부" },
  };

  return (
    <main className="oauth-consent-shell">
      <section className="oauth-consent-card">
        <div className="oauth-brand"><Image src="/logo-light.svg" alt="ds-go" width={66} height={51} className="logo-img logo-img-light" /><Image src="/logo-dark.svg" alt="ds-go" width={66} height={51} className="logo-img logo-img-dark" /></div>
        <span>DS-GO 계정으로 계속</span>
        <h1>{data.app.name}에서<br />계정 연결을 요청합니다.</h1>
        {data.app.description && <p className="oauth-app-description">{data.app.description}</p>}
        <div className="oauth-user-pill"><i>{data.user.displayName.slice(0, 1).toUpperCase()}</i><div><strong>{data.user.displayName}</strong><span>@{data.user.username}</span></div></div>
        <div className="oauth-permissions">
          <span>이 앱에서 다음 정보에 접근합니다.</span>
          {data.scopes.map((scope) => (
            <div key={scope}><i>✓</i><p><strong>{scopeText[scope]?.title || scope}</strong><small>{scopeText[scope]?.description || "승인된 계정 정보"}</small></p></div>
          ))}
        </div>
        <form method="post" action="/api/oauth/authorize">
          {FIELDS.map((field) => <input key={field} type="hidden" name={field} value={query.get(field) || ""} />)}
          <button type="submit" name="decision" value="deny" className="oauth-deny">취소</button>
          <a className="oauth-switch-account" href={switchAccountHref}>다른 계정으로 계속</a>
          <button type="submit" name="decision" value="allow" className="oauth-allow">계속</button>
        </form>
        <p className="oauth-notice">계속하면 {data.app.name}의 서비스 약관과 개인정보 처리방침이 적용됩니다. DS-GO 비밀번호는 앱에 공유되지 않습니다.</p>
      </section>
    </main>
  );
}
