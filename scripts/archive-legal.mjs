// 약관·처리방침의 현재 문서를 보관 폴더에 시행일 이름으로 남기고,
// 보관본을 읽어 들이는 lib/legal/archive.generated.ts 를 다시 만든다(#174).
//
//   pnpm legal:archive            개정 원문을 넣은 뒤 실행. 새 시행일 보관본을 만든다
//   pnpm legal:archive --replace  시행 전 정정처럼, 같은 시행일 보관본을 고쳐야 할 때만
//
// 보관본은 한 번 넣으면 고치지 않는다. 그래서 같은 시행일 보관본이 이미 있는데
// 현재 문서와 내용이 다르면 멈춘다. 시행일을 바꾸지 않고 문서를 고친 경우다.
//
// 페이지가 보관본을 fs 로 읽지 않고 이 파일의 정적 import 로 읽는 이유: 변수로 만든
// 경로를 읽으면 파일 트레이싱이 프로젝트 전체를 함수 번들에 넣는다(#113).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { isoFromEffectiveDate } from "../lib/legal/history-periods.ts";

const CONTENT = "content/legal";
const OUT = "lib/legal/archive.generated.ts";
const LOCALES = ["ko", "ja", "en"];
const DOCS = ["terms", "privacy", "location", "marketing"];
const replace = process.argv.includes("--replace");

let failed = false;
for (const locale of LOCALES) {
  for (const doc of DOCS) {
    const current = JSON.parse(readFileSync(join(CONTENT, locale, `${doc}.json`), "utf-8"));
    const date = isoFromEffectiveDate(current.effectiveDate);
    const dir = join(CONTENT, locale, "archive", doc);
    const file = join(dir, `${date}.json`);
    mkdirSync(dir, { recursive: true });
    if (existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf-8"));
      if (isDeepStrictEqual(saved, current)) continue;
      if (!replace) {
        console.error(`${file}: 현재 문서와 내용이 달라요. 시행일을 바꿨는지 확인하고, 시행 전 정정이면 --replace 로 다시 실행하세요.`);
        failed = true;
        continue;
      }
    }
    writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
    console.log(`보관: ${file}`);
  }
}
if (failed) process.exit(1);

const imports = [];
const tree = [];
for (const locale of LOCALES) {
  const docs = [];
  for (const doc of DOCS) {
    const dir = join(CONTENT, locale, "archive", doc);
    const dates = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
          .map((f) => f.slice(0, 10))
          .sort()
      : [];
    const entries = dates.map((date) => {
      const name = `${locale}_${doc}_${date.replaceAll("-", "")}`;
      imports.push(`import ${name} from "@/content/legal/${locale}/archive/${doc}/${date}.json";`);
      return `      "${date}": ${name} as PolicyData,`;
    });
    docs.push(`    ${doc}: {\n${entries.join("\n")}\n    },`);
  }
  tree.push(`  ${locale}: {\n${docs.join("\n")}\n  },`);
}

const source = `// 자동 생성 파일. \`pnpm legal:archive\` 가 만든다. 손으로 고치지 않는다(#174).
${imports.join("\n")}
import type { PolicyData } from "./documents";
import type { HistoryDoc } from "./history";
import type { Locale } from "@/lib/i18n/config";

export const ARCHIVE: Record<Locale, Record<HistoryDoc, Record<string, PolicyData>>> = {
${tree.join("\n")}
};
`;
writeFileSync(OUT, source);
console.log(`생성: ${OUT} (보관본 ${imports.length}개)`);
