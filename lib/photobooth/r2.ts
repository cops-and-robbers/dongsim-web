/**
 * 포토부스 R2 presigned 업로드 URL 발급 (#123).
 *
 * 블로그(lib/blog/sync/r2.ts)와 같은 이유로 AWS SDK 없이 SigV4를 직접 만들되,
 * 여기는 헤더 서명이 아니라 **쿼리 서명(presign)** 이다 - 파일이 Vercel 함수를
 * 거치면 요청 본문 4.5MB 제한에 걸릴 수 있어(스트립 JPEG 2~4MB), 서버는 서명된
 * URL만 주고 브라우저가 R2에 직접 PUT 한다.
 *
 * 계정도 다르다: 블로그 버킷은 개인 계정(커스텀 도메인 필요), 포토부스 버킷은
 * 팀 계정(r2.dev로 충분)이라 자격증명을 PHOTOBOOTH_R2_* 로 분리한다.
 */

import { createHash, createHmac } from "node:crypto";

const REGION = "auto";
const SERVICE = "s3";
/** presigned URL 유효 시간(초) - 발급 직후 바로 쓰므로 짧게. */
const EXPIRES = 600;

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) =>
  createHmac("sha256", key).update(data).digest();

function config() {
  const accountId = process.env.PHOTOBOOTH_R2_ACCOUNT_ID;
  const accessKeyId = process.env.PHOTOBOOTH_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.PHOTOBOOTH_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.PHOTOBOOTH_R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("PHOTOBOOTH_R2 환경변수가 설정되지 않았습니다");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/**
 * 브라우저가 R2에 직접 PUT 할 수 있는 presigned URL을 만든다.
 * SignedHeaders 는 host 뿐이라 클라이언트가 content-type 을 자유롭게 보낼 수
 * 있다(버킷 CORS 의 AllowedHeaders 와 일치). 페이로드는 UNSIGNED-PAYLOAD.
 */
export function presignUpload(key: string): string {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config();

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key}`; // key 는 URL-safe 문자만 쓴다(아래 키 생성 참조)
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;

  // 정렬된 쿼리 - 키가 이미 알파벳 순이다
  const query: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(EXPIRES)],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const canonicalQuery = query
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    path,
    canonicalQuery,
    `host:${host}`,
    "",
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

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

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
