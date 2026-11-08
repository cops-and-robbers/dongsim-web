/**
 * App Store Connect API 토큰 (#142). 팀 키로 ES256 JWT 를 만든다.
 * 지표 수집은 수집용 키(판매, 보고서 액세스), 출시 보드는 출시용 키(App Manager, lib/release/stores.ts)를 넘긴다.
 * 토큰은 최대 20분 유효해서 실행할 때마다 새로 만든다.
 */

import { createPrivateKey, sign } from "node:crypto";

export type AscKey = { issuer?: string; keyId?: string; pem?: string };

/** 지표 수집용 팀 키(판매, 보고서 액세스) */
export const metricsAscKey = (): AscKey => ({ issuer: process.env.ASC_ISSUER_ID, keyId: process.env.ASC_KEY_ID, pem: process.env.ASC_PRIVATE_KEY });

/**
 * .p8 내용을 PEM 으로 맞춘다. Vercel 값 칸은 한 줄이라 붙여 넣으면 줄바꿈이 빠지거나 공백, "\n" 글자로 바뀐다.
 * 머리줄과 꼬리줄 사이의 base64 만 꺼내 64자씩 다시 짠다
 */
export function normalizePem(pem: string): string {
  const text = pem.trim().replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
  const m = text.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return text;
  const body = m[2].replace(/\s+/g, "");
  return `-----BEGIN ${m[1]}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${m[1]}-----\n`;
}

export function ascToken(now: Date = new Date(), key: AscKey = metricsAscKey()): string {
  const { issuer, keyId, pem } = key;
  if (!issuer || !keyId || !pem) throw new Error("ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY 환경변수가 없어요");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(now.getTime() / 1000);
  const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuer, iat, exp: iat + 1200, aud: "appstoreconnect-v1" })}`;
  const sig = sign("sha256", Buffer.from(unsigned), { key: createPrivateKey(normalizePem(pem)), dsaEncoding: "ieee-p1363" }).toString("base64url");
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
