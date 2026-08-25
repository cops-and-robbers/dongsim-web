// 법적 문서를 고쳐 놓고 폰트 서브셋을 다시 안 만든 상태를 잡아낸다(#47).
//
// /legal/[doc]/embed 는 문서에 쓰이는 글자만 담은 Pretendard 서브셋을 쓴다
// (760KB -> 52KB). 문서에 새 글자가 생기면 그 글자만 시스템 폰트로 떨어져서
// 한 문단 안에 서체가 섞인다. 화면을 안 열어보면 모르는 종류의 사고라 자동으로 막는다.
//
// 폰트 파일을 파싱하지 않고 글자 집합 해시만 비교한다. CI 에 파이썬이나
// fontTools 가 없어도 돌아야 하기 때문이다.
//
//   node scripts/check-legal-fonts.mjs
//
// 실패하면: python scripts/build-legal-fonts.py

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CONTENT = "content/legal";
const MANIFEST = "lib/legal/font-manifest.json";
const FONT_DIR = "public/fonts/legal";

// build-legal-fonts.py 의 ALWAYS 와 같아야 한다. 한쪽만 고치면 해시가 어긋난다.
const ALWAYS =
  Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join("") +
  "·…‧∙•―—–‐※○●◦△▲▽▼□■◇◆★☆←→↑↓⇒⌜⌟「」『』〈〉《》" +
  "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮" +
  "㈜℃％＆＇（）～" +
  "０１２３４５６７８９" +
  "가나다라마바사아자차카타파하";

function collect(node, out) {
  if (typeof node === "string") for (const ch of node) out.add(ch);
  else if (Array.isArray(node)) for (const child of node) collect(child, out);
  else if (node && typeof node === "object")
    for (const child of Object.values(node)) collect(child, out);
}

const chars = new Set(ALWAYS);
for (const locale of readdirSync(CONTENT)) {
  const dir = join(CONTENT, locale);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    collect(JSON.parse(readFileSync(join(dir, file), "utf-8")), chars);
  }
}

const hash = createHash("sha256")
  .update([...chars].sort().join(""))
  .digest("hex");

if (!existsSync(MANIFEST)) {
  console.error(`${MANIFEST} 이 없다. python scripts/build-legal-fonts.py 를 돌려라.`);
  process.exit(1);
}

const saved = JSON.parse(readFileSync(MANIFEST, "utf-8"));
if (saved.hash !== hash) {
  console.error(
    `법적 문서의 글자 집합이 폰트 서브셋과 다르다.\n` +
      `  폰트 기준 ${saved.count}자 (${saved.hash.slice(0, 12)})\n` +
      `  현재 문서 ${chars.size}자 (${hash.slice(0, 12)})\n` +
      `python scripts/build-legal-fonts.py 를 돌리고 결과를 커밋해라.`,
  );
  process.exit(1);
}

// 파일 이름에 내용 해시가 들어가 있어서(#49) 폰트를 다시 만들면 이름이 바뀐다.
// 매니페스트만 고치고 파일을 안 올렸거나 그 반대인 상태를 여기서 잡는다.
// 이름이 어긋나면 화면에서 폰트가 통째로 404 라 글꼴이 전부 시스템 폰트가 된다.
const listed = Object.values(saved.files ?? {});
if (listed.length === 0) {
  console.error(`${MANIFEST} 에 파일 목록이 없다.`);
  console.error("python scripts/build-legal-fonts.py 를 돌려라.");
  process.exit(1);
}

const missing = listed.filter((file) => !existsSync(join(FONT_DIR, file)));
if (missing.length > 0) {
  console.error("매니페스트가 가리키는 폰트가 없다.");
  for (const file of missing) console.error(`  ${join(FONT_DIR, file)}`);
  console.error("python scripts/build-legal-fonts.py 를 돌리고 결과를 커밋해라.");
  process.exit(1);
}

// 빌드 스크립트가 만들기 전에 폴더를 비우지만, 손으로 옛 파일을 되살렸거나
// 머지하면서 딸려 온 경우를 잡는다. 죽은 파일이 커밋되면 계속 쌓인다.
const stale = readdirSync(FONT_DIR).filter(
  (file) => file.endsWith(".woff2") && !listed.includes(file),
);
if (stale.length > 0) {
  console.error("아무도 안 쓰는 폰트가 남아 있다.");
  for (const file of stale) console.error(`  ${join(FONT_DIR, file)}`);
  console.error("지우고 커밋해라.");
  process.exit(1);
}

console.log(`법적 문서 폰트 서브셋 최신 (${chars.size}자, ${listed.length}개 파일)`);
