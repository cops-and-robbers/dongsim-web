/**
 * 노션 이미지를 R2로 옮긴다 (ADR-0023).
 *
 * 노션 이미지 URL은 서명이 붙어 한 시간이면 만료된다. 그대로 저장하면
 * 며칠 뒤 글의 이미지가 전부 깨진다. 그래서 동기화 때 한 번 받아서
 * 우리 저장소에 굽고, 본문의 URL을 바꿔 끼운다.
 *
 * 요청 시점 변환은 하지 않는다 — 발행 때 이미 최적화된 파일을 만들어 두므로
 * R2에 이미지 변환 기능이 없어도, Vercel 이미지 최적화 할당량에도 의존하지 않는다.
 */

import { createHash } from "node:crypto";
import sharp from "sharp";
import { exists, put } from "./r2";

/** 긴 변 상한. 본문 폭이 34rem 정도라 이보다 클 이유가 없다(2배 해상도 감안). */
const MAX_EDGE = 1600;

/**
 * 우리 저장소로 옮겨야 하는 주소인지. 외부 URL(이미 안정적인 주소)은 건드리지 않는다.
 *
 * 노션 서명 URL(만료됨)과 노션 내장 아이콘, 그리고 동기화가 국기 이모지 대신
 * 박아 넣는 트위모지 그림이 대상이다 - 트위모지는 남의 CDN 이라 우리가 못
 * 지키는 주소이고, 옮겨 두면 걱정할 일이 없다.
 */
function isNotionHosted(url: string): boolean {
  // app.notion.com 은 내장 갤러리 커버(page-cover)가 오는 곳이다 - 만료는 없지만
  // 남의 서버라 우리가 지킬 수 없는 주소이고, 옮겨 두면 걱정할 일이 없다.
  return /(amazonaws\.com|notion-static\.com|notion\.so|app\.notion\.com|cdn\.jsdelivr\.net)/.test(
    url,
  );
}

/**
 * R2 키를 내용 해시 + 치수로 만든다 — `images/<해시>-<가로>x<세로>.webp`
 *
 * 노션 URL은 서명이 매번 바뀌므로 URL로 키를 만들면 같은 이미지를 계속 다시 올리게 된다.
 * 내용을 해시하면 같은 그림은 항상 같은 키가 되어, 재동기화해도 업로드가 일어나지 않는다.
 *
 * 치수를 이름에 넣는 이유는 화면이 그림 자리를 미리 잡기 위해서다(ADR-0027).
 * 본문 마크다운이나 URL 조각이 아니라 파일 이름에 두는 이유는, 본문은 노션 글의 사본이어야 하고
 * 주소는 복사하든 RSS로 나가든 온전해야 하기 때문이다. 이름에 있으면 벗겨낼 규칙이 없다.
 */
function keyOf(buf: Buffer, ext: string, w?: number, h?: number): string {
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 32);
  return w && h ? `images/${hash}-${w}x${h}.${ext}` : `images/${hash}.${ext}`;
}

/**
 * 이미지 하나를 R2로 옮기고 새 URL을 돌려준다.
 * 실패하면 원본 URL을 그대로 돌려준다 — 한 장 때문에 글 전체가 막히면 안 된다.
 */
export async function migrateImage(url: string): Promise<string> {
  if (!isNotionHosted(url)) return url;

  // UA 가 없으면 노션 CDN(내장 아이콘 경로)이 403 을 준다 (실측). 이름을 밝힌다.
  // 시간 상한: 멎은 다운로드 하나가 동기화 전체를 붙잡지 않게 한다.
  const res = await fetch(url, {
    headers: { "user-agent": "dongsim blog sync" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`이미지 내려받기 실패 (${res.status})`);
  const original = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(original).metadata();

  // 애니메이션 GIF와 SVG는 변환하면 망가지거나 의미가 없다. 원본을 그대로 올린다.
  const keepAsIs = meta.format === "gif" || meta.format === "svg";

  let body: Buffer;
  let ext: string;
  let contentType: string;

  if (keepAsIs) {
    body = original;
    ext = meta.format === "svg" ? "svg" : "gif";
    contentType = meta.format === "svg" ? "image/svg+xml" : "image/gif";
  } else {
    body = await sharp(original)
      .rotate() // EXIF 방향 반영 후 메타데이터가 사라지므로 먼저 적용한다
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    ext = "webp";
    contentType = "image/webp";
  }

  // 변환 뒤 실제 치수. 리사이즈·EXIF 회전이 반영된 값이라 원본 메타데이터와 다를 수 있다.
  const out = keepAsIs ? meta : await sharp(body).metadata();

  const key = keyOf(body, ext, out.width, out.height);
  const publicBase = process.env.R2_PUBLIC_BASE!;

  // 이미 올라가 있으면 업로드를 건너뛴다(내용 해시라 같은 그림은 같은 키)
  if (await exists(key)) return `${publicBase}/${key}`;
  return put(key, body, contentType);
}

/** 마크다운 본문의 `![](url)` 이미지를 모두 R2로 옮긴다. */
export async function migrateBodyImages(
  markdown: string,
): Promise<{ body: string; moved: number; failed: number }> {
  // alt 는 이스케이프된 대괄호를 허용한다. 우리 블로그는 캡션에 [작게]/[중간]
  // 크기 지시어를 쓰는데, 노션 마크다운이 이를 \[작게\] 로 내보낸다. 이걸 못
  // 잡으면 그 이미지만 치환이 빠져 서명 URL 이 남고, 한 시간 뒤 깨진다 (실측).
  const pattern = /!\[((?:\\.|[^\]])*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;
  const matches = [...markdown.matchAll(pattern)];

  let body = markdown;
  let moved = 0;
  let failed = 0;

  for (const m of matches) {
    const [full, alt, url, title = ""] = m;
    if (!isNotionHosted(url)) continue;
    try {
      const newUrl = await migrateImage(url);
      body = body.replace(full, `![${alt}](${newUrl}${title})`);
      moved += 1;
    } catch {
      // 원본 URL을 남긴다. 만료되면 깨지므로 호출자가 집계해 알린다.
      failed += 1;
    }
  }

  return { body, moved, failed };
}
