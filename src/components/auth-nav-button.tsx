"use client";

import { useEffect, useState } from "react";

export function AuthNavButton({ loginHref }: { loginHref: string }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLoggedIn(!!d?.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  async function handleLogout() {
    setLoggedIn(false);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  }

  if (loggedIn === null) {
    return <span className="login-button" style={{ visibility: "hidden" }}>로그인</span>;
  }

  if (loggedIn) {
    return (
      <button type="button" onClick={handleLogout} className="login-button focus-ring">
        로그아웃
      </button>
    );
  }

  return (
    <a className="login-button focus-ring" href={loginHref}>
      로그인
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m7.5 4.5 5 5-5 5" />
      </svg>
    </a>
  );
}
