// 노션 블록 경계를 문단으로 되살리는지 (#349). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkParagraphs, separateBlocks } from "../../components/blog/markdown/remark-paragraphs.ts";
import { remarkToggle } from "../../components/blog/markdown/remark-toggle.ts";

// Markdown.tsx 와 같은 순서: <br> 을 하드 브레이크로 바꾸고, 블록을 떼고, 문단을 나눈다
const render = (md) =>
  renderToStaticMarkup(
    h(ReactMarkdown, { remarkPlugins: [remarkGfm, remarkParagraphs, remarkToggle] },
      separateBlocks(md.replace(/<br\s*\/?>\n?/gi, "  \n"))),
  );
const paragraphs = (html) => [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]);

test("줄바꿈 한 번으로 이어진 블록은 각각 문단이 된다", () => {
  const html = render("팀장 상희가 물었다.\n“경도 해보셨어요?”\n**숨이** 턱 막혔다.");
  assert.deepEqual(paragraphs(html), ["팀장 상희가 물었다.", "“경도 해보셨어요?”", "<strong>숨이</strong> 턱 막혔다."]);
});

test("블록 안 줄바꿈(<br>)은 한 문단 안 줄 넘김으로 남는다", () => {
  const html = render("첫 줄<br>둘째 줄");
  assert.equal(paragraphs(html).length, 1);
  assert.match(html, /첫 줄<br\/>/);
});

test("목록 바로 다음 문단은 목록 항목에 붙지 않는다", () => {
  const html = render("- 데모데이 - 특별상\n여기에 지원금까지 더해졌다.");
  assert.match(html, /<li>데모데이 - 특별상<\/li>/);
  assert.deepEqual(paragraphs(html), ["여기에 지원금까지 더해졌다."]);
});

test("들여 쓴 하위 항목과 하드 브레이크 다음 줄은 목록 안에 남는다", () => {
  const html = render("- 위\n\t- 아래\n- 둘째<br>이어지는 줄\n다음 문단");
  assert.equal((html.match(/<li>/g) || []).length, 3);
  assert.match(html, /둘째<br\/>\n이어지는 줄<\/li>/);
  assert.deepEqual(paragraphs(html), ["다음 문단"]);
});

test("문단 바로 다음 구분선은 문단을 제목으로 바꾸지 않는다", () => {
  const html = render("문단이에요\n---\n다음");
  assert.doesNotMatch(html, /<h2>/);
  assert.match(html, /<hr\/>/);
});

test("목록, 표, 코드 블록은 그대로다", () => {
  const md = "1. 하나\n2. 둘\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n```\n코드 한 줄\n코드 두 줄\n```";
  const html = render(md);
  assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.equal((html.match(/<tr>/g) || []).length, 2);
  assert.match(html, /<code>코드 한 줄\n코드 두 줄\n<\/code>/);
  assert.equal(paragraphs(html).length, 0);
});

test("토글 제목과 내용이 갈라지고, 인용 안 목록 뒤 줄도 떨어진다", () => {
  const html = render("> [!toggle] 제목\n> 내용 한 줄\n> 내용 두 줄\n\n> - 항목\n> 인용 속 문단");
  assert.match(html, /<summary>제목<\/summary>/);
  assert.ok(paragraphs(html).includes("내용 한 줄"));
  assert.ok(paragraphs(html).includes("인용 속 문단"));
});
