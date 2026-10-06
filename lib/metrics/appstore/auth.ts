/**
 * App Store Connect API 토큰 (#142). 수집용 팀 키(판매, 보고서 액세스)로 ES256 JWT 를 만든다.
 * 토큰은 최대 20분 유효해서 실행할 때마다 새로 만든다.
 */

import { createPrivateKey, sign } from "node:crypto";

export function ascToken(now: Date = new Date()): string {
  const issuer = process.env.ASC_ISSUER_ID;
  const keyId = process.env.ASC_KEY_ID;
  const pem = process.env.ASC_PRIVATE_KEY;
  if (!issuer || !keyId || !pem) throw new Error("ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY 환경변수가 없어요");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(now.getTime() / 1000);
  const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuer, iat, exp: iat + 1200, aud: "appstoreconnect-v1" })}`;
  // 환경변수에 줄바꿈이 \n 글자로 들어오는 경우도 받아 준다
  const key = createPrivateKey(pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem);
  const sig = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsigned}.${sig}`;
}

export const ASC_API = "https://api.appstoreconnect.apple.com/v1";

export class AscError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AscError";
    this.status = status;
  }
}

/** JSON 응답을 받는다. 오류면 애플이 준 문구를 담아 던진다 */
export async function ascJson(url: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (body.errors as { detail?: string; title?: string }[] | undefined)?.[0];
    throw new AscError(`App Store Connect HTTP ${res.status} ${err?.detail ?? err?.title ?? ""}`.trim(), res.status);
  }
  return body;
}
