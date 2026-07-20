import type { ReactNode } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

const serviceUrls = {
  deepthink:
    process.env.NEXT_PUBLIC_DEEPTHINK_URL ??
    "https://scivill-deepthink.vercel.app",
  onsheet:
    process.env.NEXT_PUBLIC_ONSHEET_URL ?? "https://scivill-sheet.vercel.app",
  oryaform:
    process.env.NEXT_PUBLIC_ORYAFORM_URL ??
    "https://scivill-oryaform.vercel.app",
  qrlink:
    process.env.NEXT_PUBLIC_QRLINK_URL ??
    "https://scivill-qrlink.vercel.app",
};

const services: Array<{
  name: string;
  description: string;
  href: string;
  accent: string;
  icon: ReactNode;
}> = [
  {
    name: "Deepthink",
    description: "웹을 탐색하고 근거를 찾아 답하는 AI 채팅",
    href: serviceUrls.deepthink,
    accent: "from-violet-500 to-indigo-500",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a6.5 6.5 0 0 0-3.8 11.78V18h7.6v-3.22A6.5 6.5 0 0 0 12 3Z" />
        <path d="M9 21h6M8.5 10.5h7M12 7v7" />
      </svg>
    ),
  },
  {
    name: "Onsheet",
    description: "데이터를 빠르게 정리하고 함께 만드는 스프레드시트",
    href: serviceUrls.onsheet,
    accent: "from-emerald-400 to-teal-500",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M4 9h16M10 9v12M4 15h16" />
      </svg>
    ),
  },
  {
    name: "Oryaform",
    description: "질문부터 응답 분석까지 간편한 온라인 설문 빌더",
    href: serviceUrls.oryaform,
    accent: "from-orange-400 to-rose-500",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    ),
  },
  {
    name: "QRLink",
    description: "링크를 단정한 QR 코드로 바꾸고 바로 공유하세요",
    href: serviceUrls.qrlink,
    accent: "from-sky-400 to-cyan-500",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
        <path d="M14 14h2v2h-2zM18 14h2v4h-2zM14 18h4v2h-4z" />
      </svg>
    ),
  },
];

const loginUrl = process.env.NEXT_PUBLIC_DSGO_ACCOUNT_URL ?? "https://dsgoaccount.vercel.app";

function Logo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 56 : 80;
  return (
    <span className="logo" aria-label="ds-go 홈">
      <Image
        src="/logo-light.svg"
        alt="ds-go"
        width={size}
        height={size * (200 / 260)}
        className="logo-img logo-img-light"
        priority
      />
      <Image
        src="/logo-dark.svg"
        alt="ds-go"
        width={size}
        height={size * (200 / 260)}
        className="logo-img logo-img-dark"
        priority
      />
    </span>
  );
}

export default function Home() {
  return (
    <div className="site-shell">
      <header className="nav-wrap">
        <nav className="nav" aria-label="주요 메뉴">
          <a href="#top" className="rounded-lg focus-ring">
            <Logo compact />
          </a>
          <div className="nav-actions">
            <a href="#services" className="services-link">
              서비스
            </a>
            <a href="/settings" className="services-link">
              설정
            </a>
            <a className="login-button focus-ring" href={loginUrl}>
              로그인
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m7.5 4.5 5 5-5 5" />
              </svg>
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-inner">
              <h1>
              더 나은 작업을 위한
              <br />
              <span>하나의 출발점</span>
            </h1>
            <p>
              여러 툴을 한곳에서 만나보세요.
              <br className="hidden sm:block" /> 하나의 ds-go 계정으로 모든
              서비스를 이어서 사용할 수 있습니다.
            </p>
            <a className="hero-cta focus-ring" href="#services">
              서비스 둘러보기
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 10h12M11 5l5 5-5 5" />
              </svg>
            </a>
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="section-heading">
            <div>
              <span className="section-kicker">OUR SERVICES</span>
              <h2>필요한 도구를 바로 시작하세요</h2>
            </div>
            <p>생각하고, 정리하고, 묻고, 공유하는 모든 순간을 연결합니다.</p>
          </div>

          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.name}>
                <div className={`icon-box bg-gradient-to-br ${service.accent}`}>
                  {service.icon}
                </div>
                <span className="card-number">0{index + 1}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <a
                  href={service.href}
                  target="_blank"
                  rel="noreferrer"
                  className="card-link focus-ring"
                  aria-label={`${service.name} 바로가기 (새 창)`}
                >
                  바로가기
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" />
                  </svg>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="sso-banner">
          <div className="sso-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 11V8a4 4 0 0 1 8 0v3M7 11h10a2 2 0 0 1 2 2v6H5v-6a2 2 0 0 1 2-2Z" />
              <path d="M12 15v1" />
            </svg>
          </div>
          <div>
            <span>ONE ACCOUNT, EVERYWHERE</span>
            <h2>한 번의 로그인으로, 모든 서비스를</h2>
            <p>ds-go 계정으로 모든 서비스를 만나보세요!</p>
          </div>
          <a href={loginUrl} className="sso-link focus-ring">
            ds-go 로그인
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m7.5 4.5 5 5-5 5" />
            </svg>
          </a>
        </section>
      </main>

      <footer>
        <Logo compact />
        <p>Science × Technology × Imagination</p>
        <span>© {new Date().getFullYear()} Scivill. All rights reserved.</span>
      </footer>

      <div className="footer-legal">
        <nav>
          <a href="https://scivill.vercel.app/terms" target="_blank" rel="noopener noreferrer">이용약관</a>
          <a href="https://scivill.vercel.app/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>
          <a href="https://scivill.vercel.app/licenses" target="_blank" rel="noopener noreferrer">오픈소스 라이선스</a>
        </nav>
      </div>
    </div>
  );
}
