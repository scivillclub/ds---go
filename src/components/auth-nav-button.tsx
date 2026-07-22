"use client";

import { useEffect, useState } from "react";

type AccountProfile = { displayName?: string; needsLocalCredentials?: boolean };

export function AuthNavButton({ loginHref }: { loginHref: string }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        const active = !!data?.ok;
        setLoggedIn(active);
        if (!active) return;
        const response = await fetch("/api/account/profile", { credentials: "include", cache: "no-store" });
        const account = await response.json().catch(() => null);
        if (response.ok) setProfile(account?.profile ?? null);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) return <span className="profile-nav" style={{ visibility: "hidden" }}>D</span>;

  if (loggedIn) {
    const initial = profile?.displayName?.trim().charAt(0).toUpperCase() || "D";
    return (
      <a className="profile-nav focus-ring" href="/settings" aria-label="개인 계정 설정" title="개인 계정 설정">
        {initial}
        {profile?.needsLocalCredentials && <span className="profile-warning-dot" aria-label="ds-go 비밀번호 설정 권장">!</span>}
      </a>
    );
  }

  return (
    <a className="login-button focus-ring" href={loginHref}>
      로그인
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5-5 5" /></svg>
    </a>
  );
}
