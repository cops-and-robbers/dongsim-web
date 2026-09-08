/**
 * R2 업로더 (ADR-0023).
 *
 * AWS SDK를 넣지 않고 SigV4 서명을 직접 만든다 — 필요한 동작이 PUT·목록·DELETE
 * 셋뿐이라 수십 MB짜리 의존성을 더할 이유가 없다. R2는 S3 호환이므로 표준 서명이
 * 그대로 통한다.
 */

import { createHash, createHmac } from "node:crypto";

const REGION = "auto"; // R2는 리전 개념이 없지만 서명에는 값이 필요하다
const SERVICE = "s3";

const sha256 = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) =>
  createHmac("sha256", key).update(data).digest();

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error("R2 환경변수가 설정되지 않았습니다");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

/** 오브젝트가 이미 있는지 확인한다. 있으면 다시 올리지 않는다(멱등). */
export async function exists(key: string): Promise<boolean> {
  const { publicBase } = config();
  // 공개 버킷이므로 공개 URL로 확인하는 편이 서명보다 싸다
  const res = await fetch(`${publicBase}/${key}`, { method: "HEAD" });
  return res.ok;
}

/** 오브젝트를 올리고 공개 URL을 돌려준다. */
export async function put(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicBase } = config();

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  const headers: Record<string, string> = {
    host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    // 내용 해시를 키로 쓰므로 같은 키면 항상 같은 파일이다. 영구 캐싱해도 안전하다.
    "cache-control": "public, max-age=31536000, immutable",
  };

  const signedHeaders = Object.keys(headers).sort();
  const canonicalRequest = [
    "PUT",
    path,
    "",
    ...signedHeaders.map((h) => `${h}:${headers[h]}`),
    "",
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  let signingKey = hmac(`AWS4${secretAccessKey}`, date);
  for (const part of [REGION, SERVICE, "aws4_request"]) {
    signingKey = hmac(signingKey, part);
  }
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const res = await fetch(`https://${host}${path}`, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    throw new Error(`R2 업로드 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return `${publicBase}/${key}`;
}

/**
 * 본문 없는 요청(GET 목록·DELETE)의 SigV4 서명 호출.
 * put() 과 서명 절차는 같지만, 쿼리 스트링이 정규화 대상에 들어가는 점이 다르다.
 */
async function signedFetch(
  method: "GET" | "DELETE",
  path: string,
  query: Record<string, string>,
): Promise<Response> {
  const { accountId, accessKeyId, secretAccessKey } = config();

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256("");

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join("&");

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort();
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    ...signedHeaders.map((h) => `${h}:${headers[h]}`),
    "",
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  let signingKey = hmac(`AWS4${secretAccessKey}`, date);
  for (const part of [REGION, SERVICE, "aws4_request"]) {
    signingKey = hmac(signingKey, part);
  }
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const qs = canonicalQuery ? `?${canonicalQuery}` : "";
  return fetch(`https://${host}${path}${qs}`, {
    method,
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`,
    },
  });
}

export type R2Object = { key: string; lastModified: Date };

/**
 * 버킷의 오브젝트 목록 (고아 정리용).
 * 공개 URL로는 목록을 볼 수 없으므로 서명 GET을 쓴다. 1,000개 단위로 잇는다.
 */
export async function listObjects(prefix: string): Promise<R2Object[]> {
  const { bucket } = config();
  const out: R2Object[] = [];
  let token: string | undefined;

  do {
    const query: Record<string, string> = { "list-type": "2", prefix };
    if (token) query["continuation-token"] = token;
    const res = await signedFetch("GET", `/${bucket}`, query);
    if (!res.ok) {
      throw new Error(`R2 목록 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    const xml = await res.text();
    for (const m of xml.matchAll(
      /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<LastModified>([^<]+)<\/LastModified>[\s\S]*?<\/Contents>/g,
    )) {
      out.push({ key: m[1], lastModified: new Date(m[2]) });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1]
      : undefined;
  } while (token);

  return out;
}

/** 오브젝트 하나를 지운다 (고아 정리용). 없는 키를 지워도 S3 규약상 성공이다. */
export async function remove(key: string): Promise<void> {
  const { bucket } = config();
  const res = await signedFetch("DELETE", `/${bucket}/${key}`, {});
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 삭제 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}
