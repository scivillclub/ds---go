"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

type Profile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: number | null;
  role: string;
  hasPassword: boolean;
  hasBytenode: boolean;
  needsLocalCredentials: boolean;
};

type InboxMessage = {
  id: string;
  senderDisplayName: string;
  subject: string;
  body: string;
  createdAt: number;
  readAt: number | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_display_name: "표시 이름은 1~40자로 입력해주세요.",
  invalid_email: "이메일 형식을 확인해주세요.",
  email_taken: "이미 다른 계정에서 사용하는 이메일입니다.",
  email_verification_required: "이메일은 인증 코드를 확인한 뒤 변경할 수 있습니다.",
  email_not_configured: "메일 발송 설정이 완료되지 않았습니다.",
  email_send_failed: "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
  invalid_email_code: "6자리 인증 코드가 올바르지 않습니다.",
  email_code_expired: "인증 코드가 만료되었습니다. 새 코드를 요청해주세요.",
  too_many_email_codes: "인증 메일 요청이 너무 많습니다. 10분 후 다시 시도해주세요.",
  email_code_cooldown: "인증 코드는 1분에 한 번 요청할 수 있습니다.",
  too_many_email_attempts: "인증 코드 입력 횟수를 초과했습니다. 새 코드를 요청해주세요.",
  weak_password: "새 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
  invalid_username: "아이디는 영문, 숫자, 밑줄로 3~20자여야 합니다.",
  username_taken: "이미 사용 중인 아이디입니다.",
  invalid_current_password: "현재 비밀번호가 일치하지 않습니다.",
  local_credentials_required: "ds-go 아이디와 비밀번호를 먼저 만들어주세요.",
  invalid_session: "계정 세션이 만료되었습니다. 다시 로그인해주세요.",
  report_target_required: "신고할 사람의 아이디나 표시 이름 중 하나 이상을 입력해주세요.",
  report_target_too_long: "신고 대상 정보가 너무 깁니다.",
  invalid_report_reason: "신고 사유는 10~2,000자로 입력해주세요.",
  too_many_reports: "신고 접수 횟수가 많습니다. 잠시 후 다시 시도해주세요.",
};

async function accountFetch(path: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [targetDisplayName, setTargetDisplayName] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);

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

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    try {
      const response = await accountFetch("/api/account/inbox");
      const data = await response.json().catch(() => null);
      setInbox(response.ok && Array.isArray(data?.messages) ? data.messages : []);
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadInbox();
    const status = new URLSearchParams(window.location.search).get("bytenode");
    if (status === "linked") setMessage({ text: "Bytenode 계정이 연결되었습니다." });
    else if (status === "already_linked") setMessage({ text: "해당 Bytenode 계정은 이미 다른 ds-go 계정에 연결되어 있습니다.", error: true });
    else if (status && status !== "linked") setMessage({ text: "Bytenode 계정 연결을 완료하지 못했습니다. 다시 시도해주세요.", error: true });
  }, [loadInbox, loadProfile]);

  function showResult(data: { error?: string }, fallback: string) {
    if (data.error) setMessage({ text: ERROR_MESSAGES[data.error] || fallback, error: true });
    else setMessage({ text: fallback });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving("profile"); setMessage(null);
    const response = await accountFetch("/api/account/profile", {
      method: "PATCH", body: JSON.stringify({ displayName }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfile(data.profile); setMessage({ text: "기본 정보가 저장되었습니다." });
    } else showResult(data, "기본 정보를 저장하지 못했습니다.");
    setSaving(null);
  }

  async function sendEmailCode() {
    setSaving("email-send"); setMessage(null); setEmailCode("");
    const response = await accountFetch("/api/account/email/send-code", {
      method: "POST", body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setEmailCodeSent(true);
      setMessage({ text: `${email}로 6자리 인증 코드를 보냈습니다. 10분 안에 입력해주세요.` });
    } else showResult(data, "인증 메일을 보내지 못했습니다.");
    setSaving(null);
  }

  async function verifyEmailCode(event: FormEvent) {
    event.preventDefault();
    setSaving("email-verify"); setMessage(null);
    const response = await accountFetch("/api/account/email/verify", {
      method: "POST", body: JSON.stringify({ email, code: emailCode }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfile(data.profile); setEmail(data.profile.email);
      setEmailCode(""); setEmailCodeSent(false);
      setMessage({ text: "이메일 인증과 변경이 완료되었습니다." });
    } else showResult(data, "이메일을 인증하지 못했습니다.");
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

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    setSaving("report"); setMessage(null);
    const response = await accountFetch("/api/account/reports", {
      method: "POST",
      body: JSON.stringify({ targetUsername, targetDisplayName, reason: reportReason }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setTargetUsername(""); setTargetDisplayName(""); setReportReason("");
      setMessage({ text: "신고가 관리자에게 안전하게 접수되었습니다." });
    } else showResult(data, "신고를 접수하지 못했습니다.");
    setSaving(null);
  }

  async function markMessageRead(id: string) {
    const current = inbox.find(item => item.id === id);
    if (!current || current.readAt) return;
    const response = await accountFetch(`/api/account/inbox/${encodeURIComponent(id)}/read`, {
      method: "PATCH", body: "{}",
    });
    if (response.ok) {
      setInbox(items => items.map(item => item.id === id ? { ...item, readAt: Date.now() } : item));
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
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
                <a href="#profile">기본 정보</a><a href="#email">이메일 인증</a><a href="#login">로그인 및 보안</a><a href="#connections">연결된 계정</a><a href="#preferences">개인 설정</a><a href="#inbox">받은편지함{inbox.some(item => !item.readAt) ? ` (${inbox.filter(item => !item.readAt).length})` : ""}</a><a href="#report">사용자 신고</a>
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
                  <button className="settings-btn" disabled={saving === "profile"}>{saving === "profile" ? "저장 중…" : "기본 정보 저장"}</button>
                </form>
              </section>

              <section id="email" className="account-card">
                <div className="account-card-title"><div><span>EMAIL</span><h3>이메일 인증</h3></div><p>6자리 일회용 코드를 확인한 이메일만 계정에 저장합니다.</p></div>
                <form onSubmit={verifyEmailCode} className="account-form">
                  <label><span>인증할 이메일</span><input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailCodeSent(false); setEmailCode(""); }} placeholder="name@example.com" required /></label>
                  <div className="email-verification-status">
                    <span className={`email-status-badge${profile.emailVerified && email === profile.email ? " is-verified" : ""}`}>
                      {profile.emailVerified && email === profile.email ? "✓ 인증 완료" : "인증 필요"}
                    </span>
                    <button type="button" className="settings-btn settings-btn-ghost" onClick={sendEmailCode} disabled={saving === "email-send" || !email}>
                      {saving === "email-send" ? "발송 중…" : emailCodeSent ? "인증 코드 다시 보내기" : "6자리 코드 받기"}
                    </button>
                  </div>
                  {emailCodeSent && <div className="email-code-row">
                    <label><span>인증 코드</span><input value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required /></label>
                    <button className="settings-btn" disabled={saving === "email-verify" || emailCode.length !== 6}>{saving === "email-verify" ? "확인 중…" : "이메일 인증"}</button>
                  </div>}
                  <small>코드는 10분 동안 한 번만 사용할 수 있으며 5회 잘못 입력하면 폐기됩니다. 스팸함도 확인해주세요.</small>
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
                    : <a className="settings-btn" href="/api/account/bytenode/link">계정 연결</a>}
                </div>
                {profile.hasBytenode && !profile.hasPassword && <p className="connection-note">ds-go 비밀번호를 만들기 전에는 계정 잠금을 방지하기 위해 Bytenode 연결을 해제할 수 없습니다.</p>}
              </section>

              <section id="preferences" className="account-card">
                <div className="account-card-title"><div><span>PREFERENCES</span><h3>개인 설정</h3></div><p>이 브라우저의 ds-go 화면 설정입니다.</p></div>
                <div className="preference-row"><div><strong>화면 테마</strong><p>라이트와 다크 모드를 전환합니다.</p></div><ThemeToggle /></div>
              </section>

              <section id="inbox" className="account-card">
                <div className="account-card-title"><div><span>INBOX</span><h3>관리자에게 받은 메시지</h3></div><p>관리자가 회원님에게 직접 보낸 안내입니다. 이 편지함에서는 답장할 수 없습니다.</p></div>
                <div className="account-inbox">
                  {inboxLoading ? <p className="account-list-empty">메시지를 불러오는 중…</p> : inbox.length === 0 ? <p className="account-list-empty">받은 메시지가 없습니다.</p> : inbox.map(item => (
                    <details className={`account-mail${item.readAt ? "" : " is-unread"}`} key={item.id} onToggle={event => { if (event.currentTarget.open) markMessageRead(item.id); }}>
                      <summary>
                        <span className="account-mail-dot" aria-label={item.readAt ? "읽음" : "읽지 않음"} />
                        <span><strong>{item.subject}</strong><small>{item.senderDisplayName || "관리자"} · {new Date(item.createdAt).toLocaleString("ko-KR")}</small></span>
                        <span className="account-mail-state">{item.readAt ? "읽음" : "새 메시지"}</span>
                      </summary>
                      <p>{item.body}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section id="report" className="account-card">
                <div className="account-card-title"><div><span>REPORT</span><h3>사용자 신고</h3></div><p>아이디 또는 표시 이름 중 하나만 입력해도 접수할 수 있습니다.</p></div>
                <form onSubmit={submitReport} className="account-form">
                  <div className="account-form-grid">
                    <label><span>신고할 사람의 아이디</span><input value={targetUsername} onChange={e => setTargetUsername(e.target.value)} maxLength={40} placeholder="예: user_id" /></label>
                    <label><span>신고할 사람의 표시 이름</span><input value={targetDisplayName} onChange={e => setTargetDisplayName(e.target.value)} maxLength={40} placeholder="예: 홍길동" /></label>
                  </div>
                  <label><span>신고 사유</span><textarea value={reportReason} onChange={e => setReportReason(e.target.value)} minLength={10} maxLength={2000} rows={7} placeholder="어떤 일이 있었는지 구체적으로 적어주세요. 민감한 비밀번호나 인증 코드는 적지 마세요." required /></label>
                  <small>허위 신고나 반복 신고는 서비스 이용 제한 사유가 될 수 있습니다. 접수 내용은 관리자만 확인합니다.</small>
                  <button className="settings-btn settings-btn-danger" disabled={saving === "report"}>{saving === "report" ? "접수 중…" : "관리자에게 신고 보내기"}</button>
                </form>
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
