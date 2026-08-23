import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const configured = process.env.DSGO_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const issuer = process.env.NODE_ENV === "production" && configured
    ? new URL(configured).origin
    : req.nextUrl.origin;
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: ["profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
  }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
