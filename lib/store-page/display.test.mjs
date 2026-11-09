import assert from "node:assert/strict";
import { test } from "node:test";
import { fitLabel, slotOf, STAGE_WIDTH } from "./display.ts";
import { parsePlayPage } from "./read.ts";

test("넘치면 몇 줄까지 보이는지 말한다", () => {
  const slot = slotOf("ios", "whatsNew", "page");
  assert.deepEqual(fitLabel(slot, 3), { text: "새로운 소식 3줄", cut: false });
  assert.deepEqual(fitLabel(slot, 7), { text: "새로운 소식 7줄, 3줄까지 보여요", cut: true });
});

test("App Store 줄 제한은 웹 스토어에서 본 값을 쓰고 표시해 둔다", () => {
  for (const [f, sf, n] of [["name", "search", 1], ["subtitle", "search", 1], ["description", "page", 5]]) {
    const slot = slotOf("ios", f, sf);
    assert.equal(slot.maxLines, n);
    assert.equal(slot.fromWeb, true);
    assert.equal(slot.confirmed, false);
  }
  assert.equal(slotOf("ios", "name", "page").maxLines, 2);
  assert.equal(slotOf("ios", "name", "page").fromConsole, true);
  assert.equal(slotOf("ios", "whatsNew", "page").fromWeb, undefined);
  assert.equal(slotOf("ios", "description", "page").more, true);
  assert.equal(slotOf("ios", "name", "search").more, undefined);
});

test("Play 이름이 한 줄을 넘으면 큰 제목 화면으로 바뀐다", () => {
  const slot = slotOf("android", "title", "page");
  assert.deepEqual(fitLabel(slot, 1), { text: "상세 페이지 1줄", cut: false });
  assert.deepEqual(fitLabel(slot, 2), { text: "상세 페이지 큰 제목으로 바뀌어요", cut: true });
  const long = slotOf("android", "title", "pageLong");
  assert.deepEqual([long.width, long.fontSize, long.lineHeight], [335.6, 33, 50]);
});

test("근거가 없는 줄 제한은 지어내지 않는다", () => {
  assert.equal(slotOf("android", "title", "search").maxLines, null);
  assert.equal(fitLabel(slotOf("android", "title", "search"), 9).cut, false);
});

test("실제 앱 캡처에서 잰 값", () => {
  assert.deepEqual(STAGE_WIDTH, { ios: 393, android: 384 });
  const v = (p, f, s) => {
    const x = slotOf(p, f, s);
    return [x.width, x.fontSize, x.lineHeight];
  };
  assert.deepEqual(v("ios", "name", "page"), [218.7, 19.4, 24]);
  assert.deepEqual(v("ios", "description", "page"), [353, 13.2, 24]);
  assert.deepEqual(v("ios", "whatsNew", "page"), [353, 13.2, 24]);
  assert.deepEqual(v("android", "shortDescription", "page"), [335.6, 22.15, 32]);
  assert.equal(slotOf("ios", "subtitle", "page"), undefined);
  assert.equal(slotOf("android", "fullDescription", "page"), undefined);
  assert.deepEqual(v("android", "fullDescription", "details"), [335.6, 13.25, 21]);
  assert.deepEqual(v("android", "shortDescription", "details"), [335.6, 13.25, 21]);
  assert.equal(slotOf("android", "fullDescription", "details").maxLines, null);
});

test("Play 공개 페이지에서 자세한 설명과 이미지를 읽는다", () => {
  const html = `<title id="x">경찰과도둑 - Google Play 앱</title>
    <img src="https://play-lh.googleusercontent.com/icon=w240" srcset="a 2x" alt="아이콘 이미지" class="q">
    <a href="/store/apps/developer?id=Dongsim"><span>동심지키미</span></a>
    <img src="https://play-lh.googleusercontent.com/s1=w526" alt="스크린샷 이미지">
    <img src="https://play-lh.googleusercontent.com/s1=w526" alt="스크린샷 이미지">
    <img src="https://play-lh.googleusercontent.com/s2=w526" alt="스크린샷 이미지">
    <div class="bARER" data-g-id="description">첫 줄<br><br>A &amp; B의 &quot;추격&quot;</div>`;
  const out = parsePlayPage(html);
  assert.equal(out.title, "경찰과도둑");
  assert.equal(out.fullDescription, '첫 줄\n\nA & B의 "추격"');
  assert.equal(out.art.icon, "https://play-lh.googleusercontent.com/icon=w240");
  assert.equal(out.art.developer, "동심지키미");
  assert.equal(out.art.screenshots.length, 2);
});

test("페이지 모양이 바뀌면 빈 값이 되어 지어내지 않는다", () => {
  const out = parsePlayPage("<html></html>");
  assert.equal(out.title, null);
  assert.equal(out.fullDescription, null);
  assert.equal(out.art.icon, null);
  assert.deepEqual(out.art.screenshots, []);
});
