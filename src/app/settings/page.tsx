"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

const accountUrl =
  process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ?? "https://dsgoaccount.vercel.app";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dsgo.vercel.app";

type User = { id: string; role: string } | null;

export default function SettingsPage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.ok) setUser(d.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }

  const ssoCallback = `${siteUrl}/api/auth/sso?return_to=${encodeURIComponent("/settings")}`;
  const loginUrl = `${accountUrl}/?redirect_uri=${encodeURIComponent(ssoCallback)}`;

  return (
    <div className="site-shell">
      <header className="nav-wrap">
        <nav className="nav" aria-label="주요 메뉴">
          <a href="/" className="rounded-lg focus-ring">
            <span className="logo">
              <Image src="/logo-light.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-light" priority />
              <Image src="/logo-dark.svg"  alt="ds-go" width={56} height={43} className="logo-img logo-img-dark"  priority />
            </span>
          </a>
          <div className="nav-actions">
            <a href="/" className="services-link">홈</a>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="settings-main">
        <div className="settings-wrap">
          <h1 className="settings-title">설정</h1>

          {/* ── 테마 섹션 ── */}
          <section className="settings-section">
            <h2 className="settings-section-title">화면</h2>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">테마</div>
                <div className="settings-row-sub">라이트 / 다크 모드 전환</div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* ── 계정 섹션 ── */}
          <section className="settings-section">
            <h2 className="settings-section-title">계정 관리</h2>

            {loading ? (
              <div className="settings-loading">불러오는 중…</div>
            ) : user ? (
              <>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">역할</div>
                    <div className="settings-row-value">{user.role}</div>
                  </div>
                </div>
                <div className="settings-row settings-row-action">
                  <div>
                    <div className="settings-row-label">계정 상세 관리</div>
                    <div className="settings-row-sub">비밀번호 변경, 프로필 수정</div>
                  </div>
                  <a href={`${accountUrl}/account`} className="settings-btn settings-btn-ghost">
                    계정 페이지로
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5-5 5"/></svg>
                  </a>
                </div>
                <div className="settings-row settings-row-action">
                  <div>
                    <div className="settings-row-label">로그아웃</div>
                    <div className="settings-row-sub">모든 서비스에서 로그아웃됩니다</div>
                  </div>
                  <button onClick={handleLogout} className="settings-btn settings-btn-danger">
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <div className="settings-row settings-row-action">
                <div>
                  <div className="settings-row-label">로그인되어 있지 않습니다</div>
                  <div className="settings-row-sub">로그인하면 계정 정보를 확인할 수 있어요</div>
                </div>
                <a href={loginUrl} className="settings-btn">
                  로그인
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5-5 5"/></svg>
                </a>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
