// QR 인쇄물 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BUILTIN_ICONS,
  CHARACTER_SCALE,
  DOUBLE,
  SINGLE,
  blockHeight,
  doubleCaptionTop,
  doubleLeftBlock,
  fitIcon,
  iconBox,
  iconSrc,
  isOpenableUrl,
  linesOf,
  linkUrl,
  normalizeUrl,
  preset,
  singleTitleTop,
} from "./layout.ts";
import { jpegToPdf, mmToPt } from "./pdf.ts";

const URLS = { site: "https://copsandrobbers.app", instagram: "https://www.instagram.com/x", youtube: "https://www.youtube.com/y" };

test("디자이너 원본 자리: 한 개짜리 제목 두 줄은 원본 잉크 윗선(269, 371)에 놓인다", () => {
  assert.equal(singleTitleTop(2), 269);
  assert.equal(singleTitleTop(2) + SINGLE.title.pitch, 371);
  // 한 줄이면 두 줄 묶음의 가운데
  assert.equal(singleTitleTop(1) + SINGLE.title.ink / 2, 269 + blockHeight(2, SINGLE.title) / 2);
});

test("디자이너 원본 자리: 두 개짜리 안내는 QR 아래 44px, 유튜브 칸이면 원본 1370 근처", () => {
  assert.equal(doubleCaptionTop(DOUBLE.rows[1]), 1156 + 170 + 44);
});

test("두 개짜리 왼쪽 묶음은 세로 가운데가 그 칸 QR 가운데와 같다", () => {
  for (const cy of DOUBLE.rows) {
    for (const [iconH, lines] of [[112, 2], [81, 2], [0, 1], [112, 0]]) {
      const b = doubleLeftBlock(cy, iconH, lines);
      const bottom = b.titleTop + blockHeight(lines, DOUBLE.title);
      const top = iconH > 0 ? b.iconTop : b.titleTop;
      assert.ok(Math.abs((top + (lines > 0 ? bottom : b.iconTop + iconH)) / 2 - cy) < 0.001, `${cy} ${iconH} ${lines}`);
    }
  }
  // 아이콘이 없으면 틈도 없다
  const noIcon = doubleLeftBlock(500, 0, 2);
  assert.equal(noIcon.titleTop, noIcon.iconTop);
});

test("아이콘은 비율을 지켜 칸 안에 맞추고, 캐릭터 칸은 더 크다", () => {
  assert.deepEqual(fitIcon(117, 82), { width: 117, height: 82 });
  const tall = fitIcon(100, 300);
  assert.equal(tall.height, DOUBLE.icon.height);
  assert.ok(Math.abs(tall.width - DOUBLE.icon.height / 3) < 1e-9);
  assert.deepEqual(fitIcon(0, 10), { width: 0, height: 0 });
  assert.equal(iconBox({ kind: "builtin", id: "police" }).width, DOUBLE.icon.width * CHARACTER_SCALE);
  assert.equal(iconBox({ kind: "builtin", id: "tiktok" }).width, DOUBLE.icon.width);
  assert.equal(iconSrc({ kind: "none" }), null);
});

test("아이콘 목록: id 가 겹치지 않고 모두 파일 주소가 있다", () => {
  const ids = BUILTIN_ICONS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of BUILTIN_ICONS) assert.match(i.src, /^\/.+\.(svg|png)$/);
});

test("빈 줄은 빼고 앞뒤 공백을 지운다", () => {
  assert.deepEqual(linesOf(["  가  ", ""]), ["가"]);
  assert.deepEqual(linesOf(["", "나"]), ["나"]);
});

test("링크: 행사 링크는 짧은 주소, 주소는 https 를 붙여 받는다", () => {
  assert.equal(linkUrl({ kind: "event", code: "nowon" }, URLS.site), "https://copsandrobbers.app/q/nowon");
  assert.equal(linkUrl({ kind: "event", code: "" }, URLS.site), "");
  assert.equal(normalizeUrl(" forms.gle/abc "), "https://forms.gle/abc");
  assert.equal(normalizeUrl("http://a.kr"), "http://a.kr");
  assert.ok(isOpenableUrl("forms.gle/abc"));
  assert.ok(!isOpenableUrl("javascript:alert(1)"));
  assert.ok(!isOpenableUrl("localhost"));
  assert.ok(!isOpenableUrl(""));
});

test("처음 틀: 디자이너 원본 4장의 문구 그대로", () => {
  const app = preset("app", URLS);
  assert.equal(app.layout, "single");
  assert.deepEqual(app.title, ["‘경찰과도둑’ 앱", "다운로드 QR"]);
  const sns = preset("sns", URLS);
  assert.equal(sns.layout, "double");
  assert.equal(sns.rows[1].link.url, URLS.youtube);
});

// 2 x 3 짜리 JPEG
const JPEG = Uint8Array.from(
  atob(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAADAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCWiiiv3U/BD//Z",
  ),
  (c) => c.charCodeAt(0),
);

test("PDF: 쪽 크기가 mm 그대로이고, 목차(xref)가 객체 자리를 정확히 가리킨다", () => {
  const pdf = jpegToPdf({ jpeg: JPEG, width: 2, height: 3 }, { width: 109, height: 152.5 }, "행사 QR");
  const txt = new TextDecoder("latin1").decode(pdf);
  assert.ok(txt.startsWith("%PDF-1.4\n"));
  assert.ok(txt.endsWith("%%EOF\n"));
  assert.match(txt, new RegExp(`MediaBox \\[0 0 ${mmToPt(109).toFixed(3)} ${mmToPt(152.5).toFixed(3)}\\]`));
  const start = Number(/startxref\n(\d+)/.exec(txt)[1]);
  assert.ok(txt.slice(start).startsWith("xref"));
  const offsets = [...txt.slice(start).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  assert.equal(offsets.length, 6);
  offsets.forEach((o, i) => assert.ok(txt.slice(o).startsWith(`${i + 1} 0 obj`), `obj ${i + 1}`));
  // JPEG 바이트가 그대로 들어 있다
  assert.ok(txt.includes(`/Length ${JPEG.length} >>`));
  // 한글 제목은 UTF-16BE ("행사 QR")
  assert.ok(txt.includes("/Title <FEFFd589c0ac002000510052>"));
});
