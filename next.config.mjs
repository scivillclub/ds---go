/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const sensitivePageHeaders = [
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ];
    return [
      { source: "/oauth/:path*", headers: sensitivePageHeaders },
      { source: "/developers/:path*", headers: sensitivePageHeaders },
    ];
  },
};

export default nextConfig;
