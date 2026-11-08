// 올리는 SVG 를 안전하게 만드는지 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { sanitizeSvg } from "./svgSafe.ts";

const svg = (body, attrs = 'viewBox="0 0 100 100"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

test("스크립트, 이벤트 속성, 외부 링크, foreignObject 를 버린다", () => {
  const { svg: out } = sanitizeSvg(
    svg(
      `<script>alert(1)</script><g onload="alert(2)"><path d="M0 0L10 10" fill="#f00" onclick="x()"/></g>` +
        `<a href="javascript:alert(3)"><rect width="1" height="1"/></a>` +
        `<foreignObject><div>hi</div></foreignObject>` +
        `<use href="https://evil.example/x.svg#a"/><use href="#ok"/>` +
        `<image href="https://evil.example/t.png"/><image href="data:image/svg+xml;base64,PHN2Zz4="/>` +
        `<rect style="fill:url(https://evil.example/x)" width="1" height="1"/><rect fill="url(#grad)" width="2" height="2"/>`,
    ),
  );
  assert.doesNotMatch(out, /script|onload|onclick|javascript|foreignObject|evil\.example|svg\+xml|<a/i);
  assert.match(out, /<path d="M0 0L10 10" fill="#f00"\/>/);
  assert.match(out, /<use href="#ok"\/>/);
  assert.match(out, /fill="url\(#grad\)"/);
});

test("DOCTYPE, ENTITY 는 받지 않는다(엔티티 부풀리기)", () => {
  assert.throws(() => sanitizeSvg(`<!DOCTYPE svg [<!ENTITY a "aaaa">]>${svg("<text>&a;</text>")}`), /DOCTYPE/);
});

test("안에 든 래스터 그림(data:image/png)과 크기는 남긴다", () => {
  const { svg: out, width, height } = sanitizeSvg(svg(`<image width="10" height="10" href="data:image/png;base64,iVBORw0KGgo="/>`, 'width="400" height="300" viewBox="0 0 800 600"'));
  assert.match(out, /href="data:image\/png;base64,iVBORw0KGgo="/);
  assert.deepEqual([width, height], [400, 300]);
});

test("SVG 가 아니거나 크기가 없으면 받지 않는다", () => {
  assert.throws(() => sanitizeSvg("<html><body/></html>"), /SVG 파일이 아니에요/);
  assert.throws(() => sanitizeSvg(svg("<path d='M0 0'/>", "")), /크기/);
});

test("코드에 든 냥파 그림은 그대로 그려진다(마스크, 그라데이션이 남는다)", () => {
  const file = readFileSync(fileURLToPath(new URL("../../public/photobooth/cop-professor.svg", import.meta.url)), "utf8");
  const { svg: out } = sanitizeSvg(file);
  const count = (s, tag) => (s.match(new RegExp(`<${tag}[\\s>/]`, "g")) ?? []).length;
  for (const tag of ["path", "g", "mask"]) assert.equal(count(out, tag), count(file, tag), tag);
});
