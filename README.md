# ds-go

DS-GO 서비스 허브와 OAuth 2.0 개발자 포털입니다.

## OAuth 2.0

로그인한 사용자는 `/developers`에서 OAuth 앱과 callback URL을 등록할 수 있습니다. 생성 직후 표시되는 Client secret은 서버에 원문으로 저장되지 않으므로 반드시 그때 보관해야 합니다.

| 용도 | 엔드포인트 |
| --- | --- |
| 서버 메타데이터 | `/.well-known/oauth-authorization-server` |
| 사용자 승인 | `/oauth/authorize` |
| 토큰 교환 | `/api/oauth/token` |
| 사용자 정보 | `/api/oauth/userinfo` |
| 토큰 폐기 | `/api/oauth/revoke` |

지원 흐름은 `authorization_code`, 지원 scope는 `profile email`, 액세스 토큰 유효시간은 1시간입니다. PKCE를 사용할 때는 `S256`을 사용합니다. `state`는 모든 승인 요청에서 필수입니다.

승인 요청 예시:

```text
https://dsgo.vercel.app/oauth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=https%3A%2F%2Fexample.com%2Fauth%2Fcallback&scope=profile%20email&state=RANDOM_STATE
```

콜백으로 받은 code는 앱의 서버에서 교환합니다.

```bash
curl -X POST https://dsgo.vercel.app/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://example.com/auth/callback" \
  -d "client_id=CLIENT_ID" \
  -d "client_secret=CLIENT_SECRET"
```

```bash
curl https://dsgo.vercel.app/api/oauth/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
