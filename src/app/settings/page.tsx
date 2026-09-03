"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  hasOrya: boolean;
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

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

type MyReport = {
  id: string;
  targetUsername: string;
  targetDisplayName: string;
  reason: string;
  status: ReportStatus;
  createdAt: number;
  updatedAt: number;
  handledAt: number | null;
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "접수 대기 중",
  reviewing: "처리 중",
  resolved: "처리 완료",
  dismissed: "기각",
};

const REPORT_STATUS_HINT: Record<ReportStatus, string> = {
  pending: "관리자가 아직 확인하기 전입니다.",
  reviewing: "관리자가 내용을 확인하고 있습니다.",
  resolved: "관리자 확인 후 처리가 끝난 신고입니다.",
  dismissed: "관리자가 조치가 필요하지 않다고 판단했습니다.",
};

function reportStatusOf(value: unknown): ReportStatus {
  return value === "reviewing" || value === "resolved" || value === "dismissed" ? value : "pending";
}

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
  invalid_delete_credentials: "아이디 또는 비밀번호가 일치하지 않습니다.",
  invalid_delete_confirmation: "확인란에 scivill을 정확히 입력해주세요.",
  account_changed: "계정 정보가 변경되었습니다. 내용을 다시 확인해주세요.",
  invalid_session: "계정 세션이 만료되었습니다. 다시 로그인해주세요.",
  report_target_required: "신고할 사람의 아이디나 표시 이름 중 하나 이상을 입력해주세요.",
  report_target_too_long: "신고 대상 정보가 너무 깁니다.",
  invalid_report_reason: "신고 사유는 10~2,000자로 입력해주세요.",
  too_many_reports: "신고 접수 횟수가 많습니다. 잠시 후 다시 시도해주세요.",
};

const ACCOUNT_URL = process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL || "https://dsgoaccount.vercel.app";

// 다른 서비스에서 계정 설정으로 들어왔을 때 로그아웃 후 돌려보낼 수 있는 출처.
// 열린 리다이렉트를 막기 위해 알려진 서비스만 허용한다.
const RETURN_ORIGINS = [
  "https://scivill.vercel.app",
  "https://scivill-admin.vercel.app",
  "https://scivill-deepthink.vercel.app",
  "https://scivill-nodetask.vercel.app",
  "https://scivill-sheet.vercel.app",
  "https://scivill-oryaform.vercel.app",
  "https://scivill-qrlink.vercel.app",
  ...(process.env.NEXT_PUBLIC_RETURN_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean),
];

/** ?from= 으로 넘어온 출처가 허용 목록에 있으면 그 origin을 돌려준다. */
function safeFromOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return RETURN_ORIGINS.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

async function accountFetch(path: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export default function SettingsPage() {
  const router = useRouter();
  // 이 설정 화면으로 보낸 사이트 (scivill 등). 로그아웃 뒤 돌아갈 곳이다.
  const [fromOrigin, setFromOrigin] = useState<string | null>(null);
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
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [deleteUsername, setDeleteUsername] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [connectionsOpen, setConnectionsOpen] = useState(false);

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

  const loadMyReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const response = await accountFetch("/api/account/reports");
      const data = await response.json().catch(() => null);
      const items = response.ok && Array.isArray(data?.reports) ? data.reports : [];
      setMyReports(items.map((item: MyReport) => ({ ...item, status: reportStatusOf(item.status) })));
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    setFromOrigin(safeFromOrigin(new URLSearchParams(window.location.search).get("from")));
  }, []);

  useEffect(() => {
    loadProfile();
    loadInbox();
    loadMyReports();
    const params = new URLSearchParams(window.location.search);
    const bytenodeStatus = params.get("bytenode");
    const oryaStatus = params.get("orya");
    if (bytenodeStatus || oryaStatus) setConnectionsOpen(true);
    if (oryaStatus === "linked") setMessage({ text: "오량인 계정이 연결되었습니다." });
    else if (oryaStatus === "already_linked") setMessage({ text: "해당 오량인 계정은 이미 다른 ds-go 계정에 연결되어 있습니다.", error: true });
    else if (oryaStatus) setMessage({ text: "오량인 계정 연결을 완료하지 못했습니다. 다시 시도해주세요.", error: true });
    else if (bytenodeStatus === "linked") setMessage({ text: "Bytenode 계정이 연결되었습니다." });
    else if (bytenodeStatus === "already_linked") setMessage({ text: "해당 Bytenode 계정은 이미 다른 ds-go 계정에 연결되어 있습니다.", error: true });
    else if (bytenodeStatus) setMessage({ text: "Bytenode 계정 연결을 완료하지 못했습니다. 다시 시도해주세요.", error: true });
  }, [loadInbox, loadMyReports, loadProfile]);

  useEffect(() => {
    if (!connectionsOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConnectionsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [connectionsOpen]);

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
    setSaving("unlink-bytenode"); setMessage(null);
    const response = await accountFetch("/api/account/bytenode/unlink", { method: "POST", body: "{}" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setProfile(data.profile); setMessage({ text: "Bytenode 연결을 해제했습니다." }); }
    else showResult(data, "연결을 해제하지 못했습니다.");
    setSaving(null);
  }

  async function unlinkOrya() {
    if (!window.confirm("오량인 계정 연결을 해제할까요? 다른 연결 계정이나 ds-go 아이디·비밀번호로는 계속 로그인할 수 있습니다.")) return;
    setSaving("unlink-orya"); setMessage(null);
    const response = await accountFetch("/api/account/orya/unlink", { method: "POST", body: "{}" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setProfile(data.profile); setMessage({ text: "오량인 연결을 해제했습니다." }); }
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
      if (data?.report) {
        setMyReports(items => [{ ...data.report, status: reportStatusOf(data.report.status) }, ...items]);
      } else {
        void loadMyReports();
      }
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

  // ds-go 세션만 끊으면 중앙 계정 쿠키가 남아 다음 로그인 화면에서 곧바로
  // SSO로 다시 들어온다. 서드파티 쿠키를 막는 브라우저에서도 확실하도록
  // fetch가 아니라 최상위 이동으로 중앙 세션까지 종료한다.
  //
  // 다른 사이트(?from=)에서 들어왔다면 그 사이트의 세션도 남아 있으므로,
  // 중앙 로그아웃의 도착지를 그 사이트의 로그아웃 주소로 잡는다.
  // ds-go → 중앙 계정 → 원래 사이트 순으로 쿠키가 모두 지워지고 원래 사이트로 돌아간다.
  async function endAllSessions() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    const destination = fromOrigin
      ? `${fromOrigin}/api/auth/logout?return_to=${encodeURIComponent("/")}`
      : window.location.origin;
    window.location.href = `${ACCOUNT_URL}/api/auth/logout?redirect_uri=${encodeURIComponent(destination)}`;
  }

  async function logout() {
    await endAllSessions();
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (deleteConfirmation !== "scivill") {
      setMessage({ text: ERROR_MESSAGES.invalid_delete_confirmation, error: true });
      return;
    }
    setSaving("delete-account"); setMessage(null);
    const response = await accountFetch("/api/account/profile", {
      method: "DELETE",
      body: JSON.stringify({ username: deleteUsername, password: deletePassword, confirmation: deleteConfirmation }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      await endAllSessions();
      return;
    }
    showResult(data, "회원탈퇴를 처리하지 못했습니다.");
    setSaving(null);
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
                <a href="#profile">기본 정보</a><a href="#email">이메일 인증</a><a href="#login">로그인 및 보안</a><a href="#connections">연결된 계정</a><a href="#preferences">개인 설정</a><a href="#inbox">받은편지함{inbox.some(item => !item.readAt) ? ` (${inbox.filter(item => !item.readAt).length})` : ""}</a><a href="#report">사용자 신고</a><a href="#report-status">내 신고 현황</a>
              </nav>
            </aside>

            <div className="account-content">
              <div className="account-heading"><div><span>DS-GO ACCOUNT</span><h2>개인 계정 설정</h2><p>Scivill 서비스에서 사용하는 계정과 개인 설정을 한곳에서 관리합니다.</p></div></div>
              {message && <div className={`account-message${message.error ? " is-error" : ""}`}>{message.text}</div>}
              {profile.needsLocalCredentials && (
                <section className="account-warning">
                  <div className="account-warning-icon">!</div><div><strong>복구용 ds-go 로그인을 만들어두세요</strong><p>지금도 모든 서비스를 이용할 수 있지만, 외부 로그인 제공자에 접근할 수 없을 때를 대비해 개별 아이디와 비밀번호 설정을 권장합니다.</p></div>
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
                <div className="connection-summary">
                  <div className="connection-summary-logos" aria-hidden="true">
                    <span className={profile.hasBytenode ? "is-connected" : ""}><Image src="/bytenode-studio-logo.png" alt="" width={38} height={19} /></span>
                    <span className={profile.hasOrya ? "is-connected" : ""}><Image src="/orya-logo.png" alt="" width={30} height={30} /></span>
                  </div>
                  <div><strong>외부 계정 {[profile.hasBytenode, profile.hasOrya].filter(Boolean).length}개 연결됨</strong><p>연결된 로그인 수단은 모두 현재 DS-GO 계정으로 들어옵니다.</p></div>
                  <button type="button" className="settings-btn" aria-haspopup="dialog" onClick={() => setConnectionsOpen(true)}>계정 연동 관리</button>
                </div>
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

              <section id="report-status" className="account-card">
                <div className="account-card-title"><div><span>REPORT STATUS</span><h3>내 신고 현황</h3></div><p>관리자가 처리한 결과가 이곳에 바로 반영됩니다. 관리자 내부 메모는 공개되지 않습니다.</p></div>
                <div className="account-reports">
                  {reportsLoading ? <p className="account-list-empty">신고 내역을 불러오는 중…</p> : myReports.length === 0 ? <p className="account-list-empty">접수한 신고가 없습니다.</p> : myReports.map(item => (
                    <article className={`account-report is-${item.status}`} key={item.id}>
                      <div className="account-report-head">
                        <div>
                          <strong>{item.targetDisplayName || item.targetUsername || "대상 미상"}</strong>
                          {item.targetUsername && <small>@{item.targetUsername}</small>}
                        </div>
                        <span className="account-report-state">{REPORT_STATUS_LABEL[item.status]}</span>
                      </div>
                      <p className="account-report-reason">{item.reason}</p>
                      <small className="account-report-meta">
                        {REPORT_STATUS_HINT[item.status]}
                        {" · 접수 "}{new Date(item.createdAt).toLocaleString("ko-KR")}
                        {item.handledAt ? ` · 처리 ${new Date(item.handledAt).toLocaleString("ko-KR")}` : ""}
                      </small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="account-card account-danger-card">
                <div className="account-card-title"><div><span>SESSION</span><h3>현재 브라우저에서 로그아웃</h3></div><p>{fromOrigin ? `ds-go·중앙 계정과 ${new URL(fromOrigin).hostname}의 로그인 세션을 모두 종료하고 원래 있던 곳으로 돌아갑니다.` : "ds-go와 중앙 계정의 로그인 세션을 함께 종료하고 로그인 화면으로 돌아갑니다."}</p></div>
                <button className="settings-btn settings-btn-danger" onClick={logout}>로그아웃</button>
              </section>

              <section id="delete-account" className="account-card account-delete-card">
                <div className="account-card-title"><div><span>DANGER ZONE</span><h3>회원탈퇴</h3></div><p>계정과 OAuth 앱, 발급 토큰 및 개인 계정 자료를 영구적으로 삭제합니다.</p></div>
                {profile.hasPassword ? (
                  <form onSubmit={deleteAccount} className="account-form">
                    <div className="account-form-grid">
                      <label><span>ds-go 아이디 재입력</span><input value={deleteUsername} onChange={event => setDeleteUsername(event.target.value)} autoComplete="username" required /></label>
                      <label><span>현재 비밀번호 재입력</span><input type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} autoComplete="current-password" required /></label>
                    </div>
                    <label><span>확인을 위해 scivill 입력</span><input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} autoComplete="off" spellCheck={false} placeholder="scivill" required /></label>
                    <small>탈퇴 후 계정과 OAuth 연결은 복구할 수 없습니다. 세 항목은 서버에서도 다시 검증됩니다.</small>
                    <button className="settings-btn settings-btn-danger" disabled={saving === "delete-account" || !deleteUsername || !deletePassword || deleteConfirmation !== "scivill"}>{saving === "delete-account" ? "탈퇴 처리 중…" : "회원탈퇴"}</button>
                  </form>
                ) : (
                  <p className="account-delete-note">회원탈퇴 전 위의 로그인 및 보안 항목에서 ds-go 아이디와 비밀번호를 먼저 만들어주세요.</p>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      {profile && connectionsOpen && (
        <div className="connection-modal-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setConnectionsOpen(false);
        }}>
          <section className="connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-modal-title">
            <header className="connection-modal-header">
              <div><span>CONNECTED ACCOUNTS</span><h2 id="connection-modal-title">계정 연동 관리</h2></div>
              <button type="button" className="connection-modal-close" aria-label="계정 연동 관리 창 닫기" autoFocus onClick={() => setConnectionsOpen(false)}>×</button>
            </header>
            <p className="connection-modal-intro"><strong>{profile.displayName}</strong>님의 DS-GO 계정에 로그인 수단을 추가합니다. 연동한 뒤에는 아래 계정 중 어느 것으로 로그인해도 동일한 사용자 ID <code>{profile.id}</code>로 접속합니다.</p>
            {message && <div className={`account-message connection-modal-message${message.error ? " is-error" : ""}`}>{message.text}</div>}

            <div className="connection-provider-list">
              <article className={`connection-provider${profile.hasBytenode ? " is-connected" : ""}`}>
                <div className="connection-provider-logo connection-provider-logo-wide"><Image src="/bytenode-studio-logo.png" alt="Bytenode Studio" width={58} height={29} /></div>
                <div className="connection-provider-copy"><div><h3>Bytenode</h3><span>{profile.hasBytenode ? "연결됨" : "연결되지 않음"}</span></div><p>Bytenode 계정으로 이 DS-GO 계정에 로그인합니다.</p></div>
                {profile.hasBytenode ? (
                  <button type="button" className="settings-btn settings-btn-ghost" onClick={unlinkBytenode} disabled={saving === "unlink-bytenode" || (!profile.hasPassword && !profile.hasOrya)}>{saving === "unlink-bytenode" ? "해제 중…" : "연결 해제"}</button>
                ) : <a className="settings-btn" href="/api/account/bytenode/link">계정 연결</a>}
              </article>

              <article className={`connection-provider${profile.hasOrya ? " is-connected" : ""}`}>
                <div className="connection-provider-logo"><Image src="/orya-logo.png" alt="오량인" width={38} height={38} /></div>
                <div className="connection-provider-copy"><div><h3>오량인</h3><span>{profile.hasOrya ? "연결됨" : "연결되지 않음"}</span></div><p>오량인 OAuth 계정으로 이 DS-GO 계정에 로그인합니다.</p></div>
                {profile.hasOrya ? (
                  <button type="button" className="settings-btn settings-btn-ghost" onClick={unlinkOrya} disabled={saving === "unlink-orya" || (!profile.hasPassword && !profile.hasBytenode)}>{saving === "unlink-orya" ? "해제 중…" : "연결 해제"}</button>
                ) : <a className="settings-btn" href="/api/account/orya/link">계정 연결</a>}
              </article>

            </div>

            {profile.hasBytenode && !profile.hasPassword && !profile.hasOrya && <p className="connection-note">Bytenode가 현재 유일한 로그인 수단입니다. 오량인을 연결하거나 ds-go 비밀번호를 만든 뒤 해제할 수 있습니다.</p>}
            {profile.hasOrya && !profile.hasPassword && !profile.hasBytenode && <p className="connection-note">오량인이 현재 유일한 로그인 수단입니다. Bytenode를 연결하거나 ds-go 비밀번호를 만든 뒤 해제할 수 있습니다.</p>}
            <footer className="connection-modal-footer"><p>계정은 이메일이 같다는 이유만으로 자동 병합되지 않습니다. 현재 로그인한 상태에서 직접 인증한 계정만 연결됩니다.</p><button type="button" className="settings-btn settings-btn-ghost" onClick={() => setConnectionsOpen(false)}>닫기</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
