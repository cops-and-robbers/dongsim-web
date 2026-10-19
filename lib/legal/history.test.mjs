// 약관 이전 버전 테스트 (#174). 실행: pnpm test
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { formatIsoDate, isoFromEffectiveDate, pastVersions } from "./history-periods.ts";

const LOCALES = ["ko", "ja", "en"];
const DOCS = ["terms", "privacy", "location", "marketing"];

test("세 언어의 시행일 표기를 같은 날짜로 읽는다", () => {
  assert.equal(isoFromEffectiveDate("2026년 9월 8일"), "2026-09-08");
  assert.equal(isoFromEffectiveDate("2026年9月8日"), "2026-09-08");
  assert.equal(isoFromEffectiveDate("September 8, 2026"), "2026-09-08");
  assert.throws(() => isoFromEffectiveDate("2026-09-08"));
});

test("한 버전은 다음 버전 시행일 전날까지, 마지막 보관본은 현재 시행일 전날까지", () => {
  assert.deepEqual(pastVersions(["2026-06-29", "2026-05-01", "2026-09-08"], "2026-10-23"), [
    { date: "2026-09-08", until: "2026-10-22" },
    { date: "2026-06-29", until: "2026-09-07" },
    { date: "2026-05-01", until: "2026-06-28" },
  ]);
});

test("현재 시행일과 같거나 늦은 보관본은 이전 버전이 아니다", () => {
  assert.deepEqual(pastVersions(["2026-09-08", "2026-10-23"], "2026-09-08"), []);
  assert.deepEqual(pastVersions(["2026-06-29", "2026-09-08"], "2026-09-08"), [
    { date: "2026-06-29", until: "2026-09-07" },
  ]);
});

test("월초 시행일의 전날은 지난달 말일이다", () => {
  assert.deepEqual(pastVersions(["2026-02-01"], "2026-03-01"), [
    { date: "2026-02-01", until: "2026-02-28" },
  ]);
});

test("날짜를 언어별 문서 표기로 쓴다", () => {
  assert.equal(formatIsoDate("2026-10-22", "ko"), "2026년 10월 22일");
  assert.equal(formatIsoDate("2026-10-22", "ja"), "2026年10月22日");
  assert.equal(formatIsoDate("2026-10-22", "en"), "October 22, 2026");
});

// 개정 절차가 지켜졌는지 본다. 현재 문서는 항상 같은 시행일 보관본이 있어야
// 다음 개정 때 이전 버전으로 넘어간다(pnpm legal:archive).
test("현재 문서마다 같은 시행일 보관본이 있고 내용이 같다", () => {
  for (const locale of LOCALES) {
    for (const doc of DOCS) {
      const current = JSON.parse(readFileSync(join("content/legal", locale, `${doc}.json`), "utf-8"));
      const file = join("content/legal", locale, "archive", doc, `${isoFromEffectiveDate(current.effectiveDate)}.json`);
      assert.ok(existsSync(file), `${file} 이 없어요. pnpm legal:archive 를 실행하세요`);
      assert.deepEqual(JSON.parse(readFileSync(file, "utf-8")), current, `${file} 이 현재 문서와 달라요`);
    }
  }
});

test("archive.generated.ts 가 보관 폴더의 파일을 빠짐없이 읽는다", () => {
  const generated = readFileSync("lib/legal/archive.generated.ts", "utf-8");
  const listed = [...generated.matchAll(/from "@\/(content\/legal\/[^"]+\.json)"/g)].map((m) => m[1]).sort();
  const onDisk = [];
  for (const locale of LOCALES) {
    for (const doc of DOCS) {
      const dir = join("content/legal", locale, "archive", doc);
      for (const f of readdirSync(dir)) onDisk.push(`content/legal/${locale}/archive/${doc}/${f}`);
    }
  }
  assert.deepEqual(listed, onDisk.sort(), "pnpm legal:archive 로 다시 만드세요");
});
