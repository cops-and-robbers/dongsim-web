// KO_ONLY_PATHS 가 실제 페이지 구성과 어긋난 상태를 잡아낸다(#58).
//
// LanguageSwitcher 는 이 목록을 보고, 여기 있는 경로에서 다른 언어로 바꾸면
// 그 언어의 홈으로 보낸다. 목록이 어긋나면 두 방향 모두 사고가 난다.
//
//   목록에 있는데 en/ja 페이지가 있음  -> 번역본이 있는데 홈으로 가버린다
//   목록에 없는데 en/ja 페이지가 없음  -> 404 로 간다
//
// 둘 다 그 언어로 그 페이지를 열어보지 않으면 모른다. 실제로 영문 약관을
// 만들고도 목록에서 빼지 않아 반년 가까이 홈으로 가고 있었다.
//
//   node scripts/check-ko-only-paths.mjs
//
// 실패하면: lib/i18n/config.ts 의 KO_ONLY_PATHS 를 고친다.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const CONFIG = "lib/i18n/config.ts";
const APP = "app";
// 어드민은 로케일 체계 밖이라(자체 레이아웃, 언어 전환 없음) 검사에서 뺀다.
const SKIP_TOP = new Set(["en", "ja", "admin"]);

function fail(lines) {
  console.error("KO_ONLY_PATHS 가 실제 페이지와 어긋납니다.\n");
  for (const line of lines) console.error(line);
  console.error(`\n${CONFIG} 의 KO_ONLY_PATHS 를 고쳐주세요.`);
  process.exit(1);
}

/** config.ts 에서 KO_ONLY_PATHS 배열을 읽는다. */
function readList() {
  const src = readFileSync(CONFIG, "utf8");
  const m = src.match(/KO_ONLY_PATHS: readonly string\[\] = \[([\s\S]*?)\]/);
  if (!m) fail([`  ${CONFIG} 에서 KO_ONLY_PATHS 를 찾지 못했습니다.`]);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/**
 * 폴더 아래 page.tsx 의 경로를 모은다.
 *
 * 동적 조각에서 끊는다. `/join/[code]` 는 `/join` 으로 본다.
 * isKoOnlyPath 가 접두사로 비교하기 때문에 목록에도 `/join` 만 있으면 된다.
 *
 * page.tsx 가 있는 폴더만 센다. route.ts 만 있는 폴더는 화면이 아니라
 * 언어 전환 대상이 아니다(`/legal/[doc]/embed` 처럼).
 *
 * 한국어(app)와 번역(app/en·app/ja) 양쪽을 같은 규칙으로 모아야 한다 -
 * 번역 쪽만 문자 그대로 찾으면 `/en/g/[postId]` 처럼 번역본까지 동적인
 * 라우트가 없는 것으로 오탐된다(#92).
 */
function collectPages(dir, base = "", skipTop = new Set()) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (base === "" && skipTop.has(name)) continue;
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const dynamic = name.startsWith("[");
    const path = dynamic ? base : `${base}/${name}`;
    if (path !== "" && existsSync(join(full, "page.tsx"))) found.push(path);
    found.push(...collectPages(full, path, skipTop));
  }
  return [...new Set(found)];
}

const list = readList();
const koPages = collectPages(APP, "", SKIP_TOP);
const translatedPages = new Set([
  ...collectPages(join(APP, "en")),
  ...collectPages(join(APP, "ja")),
]);
const translated = (path) => translatedPages.has(path);

const problems = [];

for (const path of list) {
  if (translated(path)) {
    problems.push(`  ${path} 는 번역본이 있는데 목록에 있습니다. 목록에서 빼주세요.`);
  }
}

for (const path of koPages) {
  if (translated(path)) continue;
  const covered = list.some((p) => path === p || path.startsWith(`${p}/`));
  if (!covered) {
    problems.push(`  ${path} 는 한국어만 있는데 목록에 없습니다. 목록에 넣어주세요.`);
  }
}

if (problems.length > 0) fail(problems);

console.log(
  `KO_ONLY_PATHS ${list.length}개, 한국어 페이지 ${koPages.length}개 - 어긋난 곳 없음`
);
