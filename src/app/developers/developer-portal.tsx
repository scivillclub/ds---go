"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

type OAuthApp = {
  clientId: string;
  name: string;
  description: string;
  homepageUrl: string;
  redirectUris: string[];
  createdAt: number;
  updatedAt: number;
  secretRotatedAt: number;
};

type AppInput = {
  name: string;
  description: string;
  homepageUrl: string;
  redirectUris: string;
};

const EMPTY_APP: AppInput = { name: "", description: "", homepageUrl: "", redirectUris: "" };
const ERROR_MESSAGES: Record<string, string> = {
  invalid_name: "앱 이름은 2~60자로 입력해 주세요.",
  invalid_description: "설명은 240자 이하여야 합니다.",
  invalid_homepage_url: "홈페이지 주소를 확인해 주세요.",
  invalid_redirect_uris: "HTTPS 콜백 URL을 한 개 이상 입력해 주세요. 로컬 개발에서는 localhost의 HTTP도 허용됩니다.",
  app_limit_reached: "계정당 OAuth 앱은 최대 20개까지 만들 수 있습니다.",
  app_not_found: "앱을 찾지 못했습니다.",
  invalid_session: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
};

function inputFromApp(app: OAuthApp): AppInput {
  return {
    name: app.name,
    description: app.description,
    homepageUrl: app.homepageUrl,
    redirectUris: app.redirectUris.join("\n"),
  };
}

function payload(input: AppInput) {
  return {
    name: input.name,
    description: input.description,
    homepageUrl: input.homepageUrl,
    redirectUris: input.redirectUris.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  };
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "request_failed");
  return data;
}

function CopyButton({ value, label = "복사" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <button type="button" className="developer-copy" onClick={copy}>{copied ? "복사됨" : label}</button>;
}

function AppForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: AppInput;
  submitLabel: string;
  busy: boolean;
  onSubmit: (input: AppInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial);
  function update(name: keyof AppInput, value: string) {
    setInput((current) => ({ ...current, [name]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(input);
  }
  return (
    <form className="developer-form" onSubmit={submit}>
      <label>
        <span>앱 이름 <b>필수</b></span>
        <input value={input.name} onChange={(event) => update("name", event.target.value)} maxLength={60} placeholder="예: 우리 학교 시간표" required />
      </label>
      <label>
        <span>앱 설명</span>
        <textarea value={input.description} onChange={(event) => update("description", event.target.value)} maxLength={240} rows={3} placeholder="사용자가 승인 화면에서 볼 간단한 설명" />
      </label>
      <label>
        <span>홈페이지 URL</span>
        <input type="url" value={input.homepageUrl} onChange={(event) => update("homepageUrl", event.target.value)} placeholder="https://example.com" />
      </label>
      <label>
        <span>Authorization callback URL <b>필수</b></span>
        <textarea value={input.redirectUris} onChange={(event) => update("redirectUris", event.target.value)} rows={3} placeholder={"https://example.com/auth/dsgo/callback\nhttp://localhost:3000/auth/callback"} required />
        <small>주소를 한 줄에 하나씩 입력하세요. 등록된 주소와 요청 주소가 완전히 일치해야 합니다.</small>
      </label>
      <div className="developer-form-actions">
        <button type="button" className="developer-button secondary" onClick={onCancel}>취소</button>
        <button type="submit" className="developer-button" disabled={busy}>{busy ? "저장 중…" : submitLabel}</button>
      </div>
    </form>
  );
}

function AppCard({
  app,
  onChanged,
  onSecret,
  onMessage,
}: {
  app: OAuthApp;
  onChanged: () => Promise<void>;
  onSecret: (app: OAuthApp, secret: string) => void;
  onMessage: (text: string, error?: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(input: AppInput) {
    setBusy(true);
    try {
      await request(`/api/account/oauth/apps/${encodeURIComponent(app.clientId)}`, {
        method: "PATCH", body: JSON.stringify(payload(input)),
      });
      await onChanged();
      setEditing(false);
      onMessage("앱 설정을 저장했습니다.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "request_failed";
      onMessage(ERROR_MESSAGES[code] || "앱 설정을 저장하지 못했습니다.", true);
    } finally { setBusy(false); }
  }

  async function rotateSecret() {
    if (!window.confirm("기존 Client secret은 즉시 사용할 수 없게 됩니다. 새로 발급할까요?")) return;
    setBusy(true);
    try {
      const data = await request(`/api/account/oauth/apps/${encodeURIComponent(app.clientId)}/secret`, { method: "POST", body: "{}" });
      await onChanged();
      onSecret(app, data.clientSecret);
    } catch { onMessage("Client secret을 다시 발급하지 못했습니다.", true); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`‘${app.name}’ 앱을 삭제할까요? 발급된 액세스 토큰도 더 이상 사용할 수 없습니다.`)) return;
    setBusy(true);
    try {
      await request(`/api/account/oauth/apps/${encodeURIComponent(app.clientId)}`, { method: "DELETE" });
      await onChanged();
      onMessage("OAuth 앱을 삭제했습니다.");
    } catch { onMessage("앱을 삭제하지 못했습니다.", true); }
    finally { setBusy(false); }
  }

  return (
    <article className="developer-app-card">
      <div className="developer-app-heading">
        <div className="developer-app-icon">{app.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3>{app.name}</h3>
          <p>{app.description || "설명이 없습니다."}</p>
        </div>
        <span className="developer-status"><i /> 활성</span>
      </div>
      {editing ? (
        <AppForm initial={inputFromApp(app)} submitLabel="변경사항 저장" busy={busy} onSubmit={save} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="developer-credential">
            <span>Client ID</span>
            <code>{app.clientId}</code>
            <CopyButton value={app.clientId} />
          </div>
          <div className="developer-callbacks">
            <span>Callback URL</span>
            {app.redirectUris.map((uri) => <code key={uri}>{uri}</code>)}
          </div>
          <div className="developer-card-actions">
            <button type="button" onClick={() => setEditing(true)} disabled={busy}>설정 편집</button>
            <button type="button" onClick={rotateSecret} disabled={busy}>Secret 재발급</button>
            <button type="button" className="danger" onClick={remove} disabled={busy}>앱 삭제</button>
          </div>
        </>
      )}
    </article>
  );
}

export default function DeveloperPortal() {
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [secret, setSecret] = useState<{ app: OAuthApp; value: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await request("/api/account/oauth/apps");
      setApps(Array.isArray(data.apps) ? data.apps : []);
    } catch (error) {
      const code = error instanceof Error ? error.message : "request_failed";
      setMessage({ text: ERROR_MESSAGES[code] || "OAuth 앱 목록을 불러오지 못했습니다.", error: true });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showMessage(text: string, error = false) { setMessage({ text, error }); }

  async function create(input: AppInput) {
    setBusy(true); setMessage(null);
    try {
      const data = await request("/api/account/oauth/apps", { method: "POST", body: JSON.stringify(payload(input)) });
      setApps((current) => [data.app, ...current]);
      setCreating(false);
      setSecret({ app: data.app, value: data.clientSecret });
    } catch (error) {
      const code = error instanceof Error ? error.message : "request_failed";
      showMessage(ERROR_MESSAGES[code] || "OAuth 앱을 만들지 못했습니다.", true);
    } finally { setBusy(false); }
  }

  return (
    <div className="developer-shell">
      <header className="nav-wrap">
        <nav className="nav" aria-label="개발자 메뉴">
          <a href="/" className="developer-logo focus-ring" aria-label="ds-go 홈">
            <Image src="/logo-light.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-light" priority />
            <Image src="/logo-dark.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-dark" priority />
            <span>Developer</span>
          </a>
          <div className="nav-actions">
            <a href="/developers" className="services-link developer-nav-active">내 앱</a>
            <a href="/developers/docs" className="services-link">문서</a>
            <a href="/settings" className="services-link">계정 설정</a>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="developer-main">
        <section className="developer-hero">
          <div>
            <h1>OAuth 앱</h1>
            <p>외부 서비스에서 DS-GO 계정으로 로그인할 수 있게 해주는 앱입니다.</p>
          </div>
          <button className="developer-button developer-create-button" onClick={() => setCreating(true)}>
            <span>＋</span> 새 앱 만들기
          </button>
        </section>

        {message && <div className={`developer-message${message.error ? " is-error" : ""}`}>{message.text}</div>}

        {creating && (
          <section className="developer-create-card">
            <div className="developer-section-title"><span>NEW APPLICATION</span><h2>OAuth 앱 만들기</h2></div>
            <AppForm initial={EMPTY_APP} submitLabel="앱 만들기" busy={busy} onSubmit={create} onCancel={() => setCreating(false)} />
          </section>
        )}

        <section className="developer-apps-section">
          <div className="developer-list-title">
            <div><h2>등록된 앱</h2></div>
            <b>{apps.length}</b>
          </div>
          {loading ? <div className="developer-empty">앱 목록을 불러오는 중…</div> : apps.length === 0 ? (
            <div className="developer-empty">
              <div className="developer-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M14.6 5.4c2.7-2.7 5.9-2.4 5.9-2.4s.3 3.2-2.4 5.9l-4.4 4.4-3.5.6.6-3.5 3.8-5Z" /><path d="m9.9 8.9-3.6-.2-3 3 4.8 1.2M15 13.9l.2 3.6-3 3-1.2-4.8M7.2 16.3c-1.7.3-2.5 1.2-2.8 3 1.8-.3 2.8-1.1 3.1-2.8" /><circle cx="16" cy="7.5" r="1.2" /></svg>
              </div>
              <h3>첫 앱을 만들어 보세요</h3>
              <p>DS-GO OAuth로 사용자 인증을 받을 수 있습니다.</p>
            </div>
          ) : (
            <div className="developer-app-list">
              {apps.map((app) => <AppCard key={app.clientId} app={app} onChanged={load} onSecret={(target, value) => setSecret({ app: target, value })} onMessage={showMessage} />)}
            </div>
          )}
        </section>

      </main>

      {secret && (
        <div className="developer-modal-backdrop" role="presentation">
          <section className="developer-secret-modal" role="dialog" aria-modal="true" aria-labelledby="secret-title">
            <div className="developer-secret-icon">✓</div>
            <span>APPLICATION CREATED</span>
            <h2 id="secret-title">Client secret을 지금 저장하세요.</h2>
            <p>보안을 위해 이 값은 다시 표시되지 않습니다. 분실하면 새로 발급해야 합니다.</p>
            <div><code>{secret.value}</code><CopyButton value={secret.value} label="Secret 복사" /></div>
            <button className="developer-button" onClick={() => setSecret(null)}>안전하게 저장했습니다</button>
          </section>
        </div>
      )}
    </div>
  );
}
