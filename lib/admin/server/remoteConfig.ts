/**
 * Firebase Remote Config REST 호출. 서버 전용이다. 브라우저 코드에서 부르지 않는다.
 *
 * 패키지 없이 지표 수집과 같은 방식으로 서비스 계정 토큰을 만든다(lib/metrics/google.ts).
 * 지표 수집 계정과 키를 나눈다. 이 계정은 전체 사용자를 점검으로 막을 수 있어서, 새면 안 되는 범위가 다르다.
 * 오류 메시지에 키나 토큰을 넣지 않는다.
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { serviceAccountFromEnv, serviceAccountToken } from "@/lib/metrics/google";
import {
  BANNER_PREFIX,
  bannerImageUrl,
  type AppConfigHistoryItem,
  type BannerImage,
  type BannerImageType,
  type RemoteConfigTemplate,
} from "@/lib/admin/appConfig";

const KEY_ENV = "REMOTE_CONFIG_SERVICE_ACCOUNT_JSON";
const SCOPE = "https://www.googleapis.com/auth/firebase.remoteconfig";
const STORAGE_SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";
const HISTORY_SIZE = 5;
const APP_STORE_ID = "6756843948";

/** 키가 아직 연결되지 않은 환경이면 화면이 까닭을 알려 준다. */
export const isConnected = () => Boolean(process.env[KEY_ENV] && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

/** 여기서 저장하면 실제 사용자에게 간다. Firebase 프로젝트가 하나뿐이라 운영 배포 말고는 막는다(미리보기 배포 포함). */
export const isWritable = () => process.env.VERCEL_ENV === "production";

/** 어드민인지 보고, 키가 연결된 환경인지 본다. 통과하면 토큰을 돌려준다. */
export async function guardAppConfig(req: Request): Promise<{ token: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });
  if (!isConnected()) return NextResponse.json({ error: "서비스 계정이 아직 연결되지 않았어요. docs/admin-ui.md를 확인해 주세요." }, { status: 503 });
  return { token };
}

/** 그사이 다른 사람이 게시했다. Firebase 가 409 로 알려 준다. */
export class RemoteConfigConflict extends Error {}

const endpoint = () => `https://firebaseremoteconfig.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/remoteConfig`;
const token = () => serviceAccountToken(serviceAccountFromEnv(KEY_ENV), SCOPE);

// ETag 는 gzip 을 받겠다고 해야 내려온다
const headers = async () => ({ Authorization: `Bearer ${await token()}`, "Accept-Encoding": "gzip" });

export async function getTemplate(): Promise<{ template: RemoteConfigTemplate; etag: string }> {
  const res = await fetch(endpoint(), { headers: await headers(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Remote Config 를 읽지 못했어요 (${res.status})`);
  const etag = res.headers.get("etag");
  if (!etag) throw new Error("Remote Config 응답에 ETag 가 없어요");
  return { template: (await res.json()) as RemoteConfigTemplate, etag };
}

async function put(template: RemoteConfigTemplate, etag: string, validateOnly: boolean) {
  const res = await fetch(`${endpoint()}${validateOnly ? "?validateOnly=true" : ""}`, {
    method: "PUT",
    headers: { ...(await headers()), "Content-Type": "application/json; UTF-8", "If-Match": etag },
    body: JSON.stringify(template),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 409) throw new RemoteConfigConflict();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Remote Config 를 ${validateOnly ? "검사" : "게시"}하지 못했어요 (${res.status}${body.error?.message ? `: ${body.error.message}` : ""})`);
  }
}

/** 먼저 검사만 하고 통과하면 게시한다. 게시는 곧바로 실제 사용자에게 간다. */
export async function publishTemplate(template: RemoteConfigTemplate, etag: string) {
  await put(template, etag, true);
  await put(template, etag, false);
}

/** 최근 변경 이력. 없어도 설정은 바꿀 수 있으니 실패해도 빈 목록으로 둔다. */
export async function listHistory(): Promise<AppConfigHistoryItem[]> {
  try {
    const res = await fetch(`${endpoint()}:listVersions?pageSize=${HISTORY_SIZE}`, {
      headers: await headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      versions?: { versionNumber?: string; updateTime?: string; description?: string; updateUser?: { email?: string } }[];
    };
    return (body.versions ?? []).map((v) => ({
      number: v.versionNumber ?? "",
      updateTime: v.updateTime ?? "",
      description: v.description ?? "",
      email: v.updateUser?.email ?? "",
    }));
  } catch {
    return [];
  }
}

/** 앱스토어에 올라간 버전. 안내용이라 읽지 못하면 null 이다. */
export async function fetchAppStoreVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=kr`, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    const body = (await res.json()) as { results?: { version?: string }[] };
    return body.results?.[0]?.version ?? null;
  } catch {
    return null;
  }
}

export const storageBucket = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
const storageHeaders = async () => ({ Authorization: `Bearer ${await serviceAccountToken(serviceAccountFromEnv(KEY_ENV), STORAGE_SCOPE)}` });

const EXTENSION: Record<BannerImageType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** 새 이름으로 올린다. 이름을 서버가 지어서 있던 파일을 덮어쓰지 않는다(지금 앱에 나가는 이미지가 바뀌면 안 된다). */
export async function uploadBannerImage(bytes: Uint8Array, type: BannerImageType): Promise<BannerImage> {
  const bucket = storageBucket();
  const token = randomUUID();
  const name = `${BANNER_PREFIX}${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${token.slice(0, 8)}.${EXTENSION[type]}`;
  const boundary = `banner-${token}`;
  const meta = JSON.stringify({ name, contentType: type, metadata: { firebaseStorageDownloadTokens: token } });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=multipart&ifGenerationMatch=0`, {
    method: "POST",
    headers: { ...(await storageHeaders()), "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`배너를 올리지 못했어요 (${res.status})`);
  return { name, url: bannerImageUrl(bucket, name, token), updated: new Date().toISOString() };
}

/**
 * 누가 바꿨는지. 서비스 계정으로 게시하면 Firebase 에는 그 계정만 남아 버전 설명에 사람 이름을 적는다.
 * 화면이 보낸 이름은 믿지 않고, 이미 checkAdmin 을 통과한 토큰의 번호로 백엔드에 묻는다.
 */
export async function actorName(accessToken: string) {
  let id = "";
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()) as { sub?: unknown };
    id = String(payload.sub ?? "");
  } catch {
    return "알 수 없는 관리자";
  }
  const fallback = `유저 ${id}`;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        query: "query AppConfigActor($id: ID!) { adminUser(id: $id) { nickname } }",
        operationName: "AppConfigActor",
        variables: { id },
      }),
      cache: "no-store",
    });
    const body = (await res.json()) as { data?: { adminUser?: { nickname?: string } | null } };
    return body.data?.adminUser?.nickname ?? fallback;
  } catch {
    return fallback;
  }
}
