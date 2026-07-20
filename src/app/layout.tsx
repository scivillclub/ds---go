import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ds-go",
  description: "Scivill이 만든 서비스를 하나의 계정으로 만나보세요.",
  openGraph: { images: ["https://dsgo.vercel.app/og-image.png"] },
  twitter: { card: "summary_large_image", images: ["https://dsgo.vercel.app/og-image.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dsgo-theme');if(t){document.documentElement.dataset.theme=t;}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
