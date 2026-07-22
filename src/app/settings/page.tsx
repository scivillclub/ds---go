"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ?? "https://dsgoaccount.vercel.app";

type Profile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  hasPassword: boolean;
  hasBytenode: boolean;
  needsLocalCredentials: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_display_name: "표시 이름은 1~40자로 입력해주세요.",
  invalid_email: "이메일 형식을 확인해주세요.",
  email_taken: "이미 다른 계정에서 사용하는 이메일입니다.",
  weak_password: "새 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
  invalid_username: "아이디는 영문, 숫자, 밑줄로 3~20자여야 합니다.",
  username_taken: "이미 사용 중인 아이디입니다.",
  invalid_current_password: "현재 비밀번호가 일치하지 않습니다.",
  local_credentials_required: "ds-go 아이디와 비밀번호를 먼저 만들어주세요.",
  invalid_session: "계정 세션이 만료되었습니다. 다시 로그인해주세요.",
};

async function accountFetch(path: string, init: RequestInit = {}) {
  const request = () => fetch(`${ACCOUNT_URL}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  let response = await request();
  if (response.status !== 401) return response;
  const refreshed = await fetch(`${ACCOUNT_URL}/api/auth/refresh`, {
    method: "POST", credentials: "include", cache: "no-store",
  });
  if (refreshed.ok) response = await request();
  return response;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await accountFetch("/api/account/profile");
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.profile) {
        setProfile(null);
        return;
      }
      setProfile(data.profile);
      setDisplayName(data.profile.displayName);
      setEmail(data.profile.email);
      setUsername(data.profile.hasPassword ? data.profile.username : "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const status = new URLSearchParams(window.location.search).get("bytenode");
    if (status === "linked") setMessage({ text: "Bytenode 계정이 연결되었습니다." });
    else if (status === "already_linked") setMessage({ text: "해당 Bytenode 계정은 이미 다른 ds-go 계정에 연결되어 있습니다.", error: true });
    else if (status && status !== "linked") setMessage({ text: "Bytenode 계정 연결을 완료하지 못했습니다. 다시 시도해주세요.", error: true });
  }, [loadProfile]);

  function showResult(data: { error?: string }, fallback: string) {
    if (data.error) setMessage({ text: ERROR_MESSAGES[data.error] || fallback, error: true });
    else setMessage({ text: fallback });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving("profile"); setMessage(null);
    const response = await accountFetch("/api/account/profile", {
      method: "PATCH", body: JSON.stringify({ displayName, email }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfile(data.profile); setMessage({ text: "기본 정보가 저장되었습니다." });
    } else showResult(data, "기본 정보를 저장하지 못했습니다.");
    setSaving(null);
  }

  async function saveCredentials(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: "새 비밀번호 확인이 일치하지 않습니다.", error: true }); return;
    }
    setSaving("credentials"); setMessage(null);
    const response = await accountFetch("/api/account/local-credentials", {
      method: "POST", body: JSON.stringify({ username, currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfile(data.profile); setUsername(data.profile.username);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setMessage({ text: profile?.hasPassword ? "비밀번호가 변경되었습니다." : "ds-go 아이디와 비밀번호가 만들어졌습니다." });
    } else showResult(data, "로그인 정보를 저장하지 못했습니다.");
    setSaving(null);
  }

  async function unlinkBytenode() {
    if (!window.confirm("Bytenode 계정 연결을 해제할까요? ds-go 아이디와 비밀번호로는 계속 로그인할 수 있습니다.")) return;
    setSaving("unlink"); setMessage(null);
    const response = await accountFetch("/api/account/bytenode/unlink", { method: "POST", body: "{}" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setProfile(data.profile); setMessage({ text: "Bytenode 연결을 해제했습니다." }); }
    else showResult(data, "연결을 해제하지 못했습니다.");
    setSaving(null);
  }

  async function logout() {
    await Promise.allSettled([
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }),
      fetch(`${ACCOUNT_URL}/api/auth/logout`, { method: "POST", credentials: "include" }),
    ]);
    window.location.href = "/";
  }

  const initial = profile?.displayName?.trim().charAt(0).toUpperCase() || "D";

  return (
    <div className="site-shell account-settings-shell">
      <header className="nav-wrap">
        <nav className="nav" aria-label="주요 메뉴">
          <a href="/" className="rounded-lg focus-ring" aria-label="ds-go 홈">
            <span className="logo">
              <Image src="/logo-light.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-light" priority />
              <Image src="/logo-dark.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-dark" priority />
            </span>
          </a>
          <div className="nav-actions"><a href="/" className="services-link">서비스</a><ThemeToggle /></div>
        </nav>
      </header>

      <main className="account-settings-main">
        {loading ? <div className="account-loading">계정 정보를 안전하게 불러오는 중…</div> : !profile ? (
          <section className="account-empty">
            <span className="account-avatar account-avatar-lg">?</span>
            <h1>계정 설정을 열려면 로그인이 필요해요</h1>
            <p>ds-go 계정으로 다시 인증한 뒤 이 페이지로 돌아옵니다.</p>
            <a className="settings-btn" href="/api/auth/login?return_to=%2Fsettings">로그인하고 계속</a>
          </section>
        ) : (
          <div className="account-layout">
            <aside className="account-sidebar">
              <span className="account-avatar account-avatar-lg" aria-hidden="true">{initial}</span>
              <h1>{profile.displayName}</h1>
              <p>@{profile.username}</p>
              <span className="account-role">{profile.role}</span>
              <nav aria-label="설정 항목">
                <a href="#profile">기본 정보</a><a href="#login">로그인 및 보안</a><a href="#connections">연결된 계정</a><a href="#preferences">개인 설정</a>
              </nav>
            </aside>

            <div className="account-content">
              <div className="account-heading"><div><span>DS-GO ACCOUNT</span><h2>개인 계정 설정</h2><p>Scivill 서비스에서 사용하는 계정과 개인 설정을 한곳에서 관리합니다.</p></div></div>
              {message && <div className={`account-message${message.error ? " is-error" : ""}`}>{message.text}</div>}
              {profile.needsLocalCredentials && (
                <section className="account-warning">
                  <div className="account-warning-icon">!</div><div><strong>복구용 ds-go 로그인을 만들어두세요</strong><p>지금도 모든 서비스를 이용할 수 있지만, Bytenode에 접근할 수 없을 때를 대비해 개별 아이디와 비밀번호 설정을 권장합니다.</p></div>
                  <a href="#login">지금 만들기</a>
                </section>
              )}

              <section id="profile" className="account-card">
                <div className="account-card-title"><div><span>PROFILE</span><h3>기본 정보</h3></div><p>모든 Scivill 서비스에 표시될 정보입니다.</p></div>
                <form onSubmit={saveProfile} className="account-form">
                  <label><span>표시 이름</span><input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} required /></label>
                  <label><span>이메일</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>
                  <button className="settings-btn" disabled={saving === "profile"}>{saving === "profile" ? "저장 중…" : "기본 정보 저장"}</button>
                </form>
              </section>

              <section id="login" className="account-card">
                <div className="account-card-title"><div><span>SECURITY</span><h3>{profile.hasPassword ? "ds-go 비밀번호 변경" : "ds-go 아이디·비밀번호 만들기"}</h3></div><p>{profile.hasPassword ? `아이디 @${profile.username}` : "선택 사항이지만 계정 복구를 위해 권장합니다."}</p></div>
                <form onSubmit={saveCredentials} className="account-form">
                  {!profile.hasPassword && <label><span>새 ds-go 아이디</span><input value={username} onChange={e => setUsername(e.target.value)} placeholder="영문·숫자·밑줄 3~20자" required /></label>}
                  {profile.hasPassword && <label><span>현재 비밀번호</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>}
                  <div className="account-form-grid">
                    <label><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label>
                    <label><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></label>
                  </div>
                  <small>8자 이상, 영문과 숫자를 포함하세요. 변경 시 다른 기기의 중앙 계정 세션은 종료됩니다.</small>
                  <button className="settings-btn" disabled={saving === "credentials"}>{saving === "credentials" ? "저장 중…" : profile.hasPassword ? "비밀번호 변경" : "아이디·비밀번호 만들기"}</button>
                </form>
              </section>

              <section id="connections" className="account-card">
                <div className="account-card-title"><div><span>CONNECTIONS</span><h3>연결된 로그인 계정</h3></div><p>한 계정으로 어느 방법이든 안전하게 로그인하세요.</p></div>
                <div className="connection-row"><div className="connection-logo">B</div><div><strong>Bytenode</strong><p>{profile.hasBytenode ? "연결됨" : "연결되지 않음"}</p></div>
                  {profile.hasBytenode ? <button className="settings-btn settings-btn-ghost" onClick={unlinkBytenode} disabled={saving === "unlink"}>연결 해제</button>
                    : <a className="settings-btn" href={`${ACCOUNT_URL}/api/account/bytenode/link`}>계정 연결</a>}
                </div>
                {profile.hasBytenode && !profile.hasPassword && <p className="connection-note">ds-go 비밀번호를 만들기 전에는 계정 잠금을 방지하기 위해 Bytenode 연결을 해제할 수 없습니다.</p>}
              </section>

              <section id="preferences" className="account-card">
                <div className="account-card-title"><div><span>PREFERENCES</span><h3>개인 설정</h3></div><p>이 브라우저의 ds-go 화면 설정입니다.</p></div>
                <div className="preference-row"><div><strong>화면 테마</strong><p>라이트와 다크 모드를 전환합니다.</p></div><ThemeToggle /></div>
              </section>

              <section className="account-card account-danger-card">
                <div className="account-card-title"><div><span>SESSION</span><h3>현재 브라우저에서 로그아웃</h3></div><p>dsgo와 중앙 계정의 현재 로그인 세션을 종료합니다.</p></div>
                <button className="settings-btn settings-btn-danger" onClick={logout}>로그아웃</button>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
