/**
 * 구글 API 액세스 토큰 (#142, #143). 패키지 없이 node:crypto 로 만든다.
 *
 * - 서비스 계정(GA4, Play): JSON 키로 서명한 JWT 를 토큰으로 바꾼다
 * - 사람 계정 OAuth(AdMob): 갱신 토큰으로 바꾼다. AdMob API 는 서비스 계정을 받지 않는다
 *
 * 오류 메시지에 키나 토큰을 넣지 않는다.
 */

import { createSign } from "node:crypto";

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

export function serviceAccountFromEnv(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 없어요");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 형식이 달라요");
  return { ...sa, token_uri: sa.token_uri || "https://oauth2.googleapis.com/token" };
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

export async function serviceAccountToken(sa: ServiceAccount, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope, aud: sa.token_uri, iat: now, exp: now + 600 })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(sa.private_key, "base64url")}`;
  return exchange(sa.token_uri, { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }, "서비스 계정");
}

export async function refreshTokenAccess(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  return exchange(
    "https://oauth2.googleapis.com/token",
    { grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken },
    "OAuth 갱신 토큰",
  );
}

async function exchange(tokenUri: string, form: Record<string, string>, what: string): Promise<string> {
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!body.access_token) {
    // invalid_grant = 갱신 토큰이 끊겼다(비밀번호 변경, 허락 취소, 테스트 앱 7일 만료). 사람이 다시 허락해야 한다
    throw new Error(`${what}로 토큰을 받지 못했어요 (${body.error ?? res.status}${body.error_description ? `: ${body.error_description}` : ""})`);
  }
  return body.access_token;
}
