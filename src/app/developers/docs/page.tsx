import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "OAuth 문서 · ds-go",
  description: "DS-GO OAuth 2.0 연동 가이드와 API 레퍼런스입니다.",
};

const BASE_URL = "https://dsgo.vercel.app";

const sections = [
  ["start", "시작하기"],
  ["flow", "인증 흐름"],
  ["reference", "API 레퍼런스"],
  ["pkce", "PKCE 가이드"],
  ["errors", "오류와 제한"],
  ["security", "보안 가이드"],
] as const;

export default function OAuthDocsPage() {
  return (
    <div className="developer-shell developer-docs-shell">
      <header className="nav-wrap">
        <nav className="nav" aria-label="개발자 메뉴">
          <a href="/" className="developer-logo focus-ring" aria-label="ds-go 홈">
            <Image src="/logo-light.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-light" priority />
            <Image src="/logo-dark.svg" alt="ds-go" width={56} height={43} className="logo-img logo-img-dark" priority />
            <span>Developer</span>
          </a>
          <div className="nav-actions">
            <a href="/developers" className="services-link">내 앱</a>
            <a href="/developers/docs" className="services-link developer-nav-active" aria-current="page">문서</a>
            <a href="/settings" className="services-link">계정 설정</a>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <div className="oauth-docs-layout">
        <aside className="oauth-docs-sidebar">
          <strong>OAuth 2.0</strong>
          <nav aria-label="OAuth 문서 목차">
            {sections.map(([id, label], index) => (
              <a key={id} href={`#${id}`} className={index === 0 ? "is-active" : undefined}>{label}</a>
            ))}
          </nav>
          <p>Authorization Code와 <code>profile</code>, <code>email</code> scope를 지원합니다.</p>
        </aside>

        <main className="oauth-docs-content">
          <section id="start" className="oauth-doc-section oauth-doc-intro">
            <span className="oauth-doc-eyebrow"><i /> OAuth 2.0 Developer Guide</span>
            <h1>DS-GO 계정으로 로그인</h1>
            <p className="oauth-doc-lead">외부 웹 앱에서 DS-GO 계정의 기본 프로필과 이메일을 안전하게 사용할 수 있습니다. 표준 Authorization Code 흐름과 PKCE S256을 지원합니다.</p>

            <div className="oauth-doc-facts">
              <div><span>Base URL</span><code>{BASE_URL}</code></div>
              <div><span>Grant type</span><code>authorization_code</code></div>
              <div><span>Access token</span><code>Bearer · 1시간</code></div>
              <div><span>Discovery</span><code>/.well-known/oauth-authorization-server</code></div>
            </div>

            <div className="oauth-doc-callout">
              <strong>현재 제공 범위</strong>
              <p><code>profile</code>과 <code>email</code> scope를 제공합니다. access token은 1시간 후 만료되며 refresh token은 발급하지 않습니다.</p>
            </div>

            <h2>빠른 시작</h2>
            <ol className="oauth-doc-steps">
              <li><b>1</b><div><strong>내 앱에서 OAuth 앱을 등록합니다.</strong><p>앱 이름과 실제 callback 전체 주소를 입력하고 Client ID와 Client secret을 발급받습니다.</p></div></li>
              <li><b>2</b><div><strong>사용자를 인가 엔드포인트로 보냅니다.</strong><p>예측 불가능한 <code>state</code>를 세션에 저장하고 필요한 scope를 함께 요청합니다.</p></div></li>
              <li><b>3</b><div><strong>callback에서 code와 state를 확인합니다.</strong><p>돌아온 <code>state</code>가 세션에 저장한 값과 정확히 일치하는지 먼저 검증합니다.</p></div></li>
              <li><b>4</b><div><strong>서버에서 code를 access token으로 교환합니다.</strong><p>Client secret은 브라우저에 노출하지 말고 서버에서만 사용합니다.</p></div></li>
              <li><b>5</b><div><strong>Bearer token으로 사용자 정보를 조회합니다.</strong><p><code>sub</code>를 외부 서비스에서 변하지 않는 DS-GO 사용자 식별자로 저장합니다.</p></div></li>
            </ol>
          </section>

          <section id="flow" className="oauth-doc-section">
            <span className="oauth-doc-label">Authorization Code</span>
            <h2>인증 흐름</h2>
            <p>브라우저 이동과 서버 간 요청을 분리하면 Client secret을 사용자에게 노출하지 않고 계정을 연결할 수 있습니다.</p>
            <div className="oauth-flow-list">
              <div><span>내 앱</span><b>→</b><p><strong>state와 PKCE 준비</strong><small>세션마다 무작위 state를 만들고, PKCE 사용 시 verifier에서 S256 challenge를 생성합니다.</small></p></div>
              <div><span>브라우저</span><b>→</b><p><strong>GET /oauth/authorize</strong><small>사용자를 DS-GO 승인 화면으로 이동합니다.</small></p></div>
              <div><span>DS-GO</span><b>→</b><p><strong>callback으로 복귀</strong><small>승인되면 등록된 redirect_uri에 code와 기존 state를 전달합니다.</small></p></div>
              <div><span>내 서버</span><b>→</b><p><strong>POST /api/oauth/token</strong><small>code, redirect_uri, Client 인증 정보로 access token을 요청합니다.</small></p></div>
              <div><span>내 서버</span><b>→</b><p><strong>GET /api/oauth/userinfo</strong><small>Bearer token으로 승인된 범위의 사용자 프로필을 조회합니다.</small></p></div>
            </div>
          </section>

          <section id="reference" className="oauth-doc-section">
            <span className="oauth-doc-label">API Reference</span>
            <h2>API 레퍼런스</h2>

            <article className="oauth-endpoint-doc">
              <header><span className="is-get">GET</span><code>/oauth/authorize</code></header>
              <p>사용자를 DS-GO 로그인 및 승인 화면으로 이동합니다.</p>
              <div className="oauth-doc-table-wrap"><table><thead><tr><th>파라미터</th><th>필수</th><th>설명</th></tr></thead><tbody>
                <tr><td><code>response_type</code></td><td>필수</td><td><code>code</code>만 지원</td></tr>
                <tr><td><code>client_id</code></td><td>필수</td><td>내 앱에서 발급한 Client ID</td></tr>
                <tr><td><code>redirect_uri</code></td><td>필수</td><td>등록한 callback 전체 주소와 정확히 일치해야 함</td></tr>
                <tr><td><code>scope</code></td><td>선택</td><td><code>profile email</code>, 생략 시 <code>profile</code></td></tr>
                <tr><td><code>state</code></td><td>필수</td><td>CSRF 방지를 위한 최대 1,024자의 무작위 값</td></tr>
                <tr><td><code>code_challenge</code></td><td>선택</td><td>PKCE S256 challenge</td></tr>
                <tr><td><code>code_challenge_method</code></td><td>PKCE</td><td><code>S256</code>만 지원</td></tr>
              </tbody></table></div>
              <pre><code>{`${BASE_URL}/oauth/authorize?\n  response_type=code&\n  client_id=CLIENT_ID&\n  redirect_uri=https%3A%2F%2Fexample.com%2Fauth%2Fcallback&\n  scope=profile%20email&\n  state=RANDOM_STATE`}</code></pre>
            </article>

            <article className="oauth-endpoint-doc">
              <header><span className="is-post">POST</span><code>/api/oauth/token</code></header>
              <p>1회용 authorization code를 access token으로 교환합니다. Client 인증은 HTTP Basic을 권장하며 form body도 지원합니다.</p>
              <pre><code>{`curl -X POST ${BASE_URL}/api/oauth/token \\\n  -u 'CLIENT_ID:CLIENT_SECRET' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  --data-urlencode 'grant_type=authorization_code' \\\n  --data-urlencode 'code=AUTHORIZATION_CODE' \\\n  --data-urlencode 'redirect_uri=https://example.com/auth/callback'`}</code></pre>
              <pre><code>{`{
  "access_token": "dsga_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile email"
}`}</code></pre>
            </article>

            <article className="oauth-endpoint-doc">
              <header><span className="is-get">GET</span><code>/api/oauth/userinfo</code></header>
              <p>승인된 scope에 해당하는 현재 사용자 정보를 반환합니다.</p>
              <pre><code>{`curl ${BASE_URL}/api/oauth/userinfo \\\n  -H 'Authorization: Bearer ACCESS_TOKEN'`}</code></pre>
              <pre><code>{`{
  "sub": "USER_ID",
  "name": "사용자 이름",
  "preferred_username": "username",
  "email": "user@example.com",
  "email_verified": true
}`}</code></pre>
            </article>

            <article className="oauth-endpoint-doc">
              <header><span className="is-post">POST</span><code>/api/oauth/revoke</code></header>
              <p>발급한 access token을 폐기합니다. Client 인증과 form body의 <code>token</code> 값이 필요합니다.</p>
            </article>
          </section>

          <section id="pkce" className="oauth-doc-section">
            <span className="oauth-doc-label">Proof Key for Code Exchange</span>
            <h2>PKCE S256</h2>
            <p>인가 요청을 시작한 클라이언트만 code를 교환할 수 있도록 PKCE 사용을 권장합니다. DS-GO는 <code>S256</code> 방식만 지원합니다.</p>
            <ol className="oauth-doc-steps is-compact">
              <li><b>1</b><div><strong>code_verifier 생성</strong><p><code>[A-Z, a-z, 0-9, ., _, ~, -]</code> 문자로 43~128자 무작위 값을 만듭니다.</p></div></li>
              <li><b>2</b><div><strong>code_challenge 계산</strong><p><code>BASE64URL(SHA256(code_verifier))</code>를 계산하고 padding은 제거합니다.</p></div></li>
              <li><b>3</b><div><strong>인가 요청과 token 요청에 나눠 전달</strong><p>인가 요청에는 challenge와 <code>S256</code>, token 요청에는 원래 verifier를 보냅니다.</p></div></li>
            </ol>
            <div className="oauth-doc-callout is-warning"><strong>Client secret도 필요합니다</strong><p>현재 DS-GO token endpoint는 PKCE 사용 여부와 관계없이 등록 시 발급한 Client 인증 정보를 요구합니다.</p></div>
          </section>

          <section id="errors" className="oauth-doc-section">
            <span className="oauth-doc-label">Errors &amp; Limits</span>
            <h2>오류와 제한</h2>
            <div className="oauth-doc-table-wrap"><table><thead><tr><th>오류</th><th>의미</th></tr></thead><tbody>
              <tr><td><code>invalid_request</code></td><td>필수 파라미터 또는 PKCE 형식이 올바르지 않음</td></tr>
              <tr><td><code>invalid_client</code></td><td>Client ID 또는 Client secret 인증 실패</td></tr>
              <tr><td><code>invalid_redirect_uri</code></td><td>등록되지 않은 callback 주소</td></tr>
              <tr><td><code>invalid_scope</code></td><td>지원하지 않는 scope 요청</td></tr>
              <tr><td><code>access_denied</code></td><td>사용자가 앱의 접근 요청을 거절함</td></tr>
              <tr><td><code>invalid_grant</code></td><td>code가 만료·사용되었거나 PKCE 검증 실패</td></tr>
              <tr><td><code>invalid_token</code></td><td>access token이 없거나 만료·폐기됨</td></tr>
            </tbody></table></div>
            <ul className="oauth-doc-checks">
              <li>계정당 OAuth 앱은 최대 20개까지 등록할 수 있습니다.</li>
              <li>앱당 callback URL은 최대 10개까지 등록할 수 있습니다.</li>
              <li>운영 URL은 HTTPS만 허용하며 localhost, 127.0.0.1, ::1은 HTTP를 사용할 수 있습니다.</li>
              <li>authorization code는 10분 동안 유효하며 한 번만 사용할 수 있습니다.</li>
            </ul>
          </section>

          <section id="security" className="oauth-doc-section">
            <span className="oauth-doc-label">Security</span>
            <h2>보안 가이드</h2>
            <ul className="oauth-doc-checks">
              <li><strong>Client secret은 서버 전용 비밀로 보관하세요.</strong> 브라우저 코드, Git 저장소, 로그에 넣지 마세요.</li>
              <li><strong>모든 요청에 state를 사용하세요.</strong> callback에서 세션 값과 상수 시간 비교로 검증하세요.</li>
              <li><strong>redirect_uri를 동적으로 조립하지 마세요.</strong> 등록한 고정 전체 주소를 그대로 사용하세요.</li>
              <li><strong>사용자 연결 키는 sub를 사용하세요.</strong> 이름과 이메일은 변경될 수 있습니다.</li>
              <li><strong>로그아웃이나 연결 해제 시 token을 폐기하세요.</strong> Client secret 유출이 의심되면 즉시 다시 발급하세요.</li>
            </ul>
          </section>

          <footer className="oauth-doc-footer">
            <span>DS-GO OAuth 2.0</span>
            <a href="/.well-known/oauth-authorization-server">Discovery 문서</a>
            <a href="/developers">내 앱</a>
          </footer>
        </main>

        <aside className="oauth-docs-meta">
          <strong>문서 정보</strong>
          <span>Authorization Code</span>
          <span>PKCE S256</span>
          <span>Bearer token</span>
          <span>1시간 만료</span>
          <span>profile · email</span>
        </aside>
      </div>
    </div>
  );
}
