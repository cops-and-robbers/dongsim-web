import assert from "node:assert/strict";
import { test } from "node:test";
import { baseOf, checkField, countOf, FIELDS, isField, keywordStates, videoThumb, youtubeId } from "./fields.ts";

const field = (p, id) => FIELDS[p].find((f) => f.id === id);
const texts = (issues) => issues.map((i) => i.text);
const levels = (issues) => issues.map((i) => i.level);

test("글자 수는 한글, 일본어, 이모지 모두 한 글자로 센다", () => {
  assert.equal(countOf("경찰과도둑"), 5);
  assert.equal(countOf("ケイドロ"), 4);
  assert.equal(countOf("🚓a"), 2);
});

test("공식 문서의 칸별 한도", () => {
  const max = (p, id) => field(p, id).max;
  assert.equal(max("ios", "name"), 30);
  assert.equal(max("ios", "subtitle"), 30);
  assert.equal(max("ios", "promotionalText"), 170);
  assert.equal(max("ios", "description"), 4000);
  assert.equal(max("ios", "keywords"), 100);
  assert.equal(max("ios", "whatsNew"), 4000);
  assert.equal(max("android", "title"), 30);
  assert.equal(max("android", "shortDescription"), 80);
  assert.equal(max("android", "fullDescription"), 4000);
});

test("한도를 넘으면 몇 자 줄일지 말한다", () => {
  const out = checkField("ios", field("ios", "name"), "가".repeat(33), {});
  assert.deepEqual(levels(out), ["block"]);
  assert.match(out[0].text, /3자 줄여/);
});

test("이름은 비울 수 없고, 프로모션 문구는 비워도 된다", () => {
  assert.deepEqual(levels(checkField("ios", field("ios", "name"), " ", {})), ["block"]);
  assert.deepEqual(checkField("ios", field("ios", "promotionalText"), "", {}), []);
  assert.deepEqual(levels(checkField("android", field("android", "title"), "", {})), ["block"]);
});

test("실제 나가 있는 문구에는 경고가 없다", () => {
  assert.deepEqual(checkField("ios", field("ios", "name"), "경찰과도둑", {}), []);
  assert.deepEqual(checkField("ios", field("ios", "subtitle"), "친구들과 밖에서 노는 GPS 술래잡기, 경도", {}).filter((i) => i.level === "warn"), []);
  assert.deepEqual(checkField("android", field("android", "title"), "Cops and Robbers:Hide and Seek", {}), []);
  assert.deepEqual(checkField("android", field("android", "title"), "ケイドロ", {}), []);
  assert.deepEqual(checkField("android", field("android", "shortDescription"), "친구들과 밖에서 노는 GPS 술래잡기, 경도. 숨바꼭질·추격전을 진짜로 즐겨요", {}), []);
});

test("iOS: 가격, 다른 플랫폼, 어린이용 표현을 알린다", () => {
  assert.equal(levels(checkField("ios", field("ios", "name"), "경찰과도둑 무료", {}))[0], "warn");
  assert.match(texts(checkField("ios", field("ios", "description"), "Android 에서도 돼요", {})).join(), /다른 플랫폼/);
  assert.match(texts(checkField("ios", field("ios", "subtitle"), "어린이용 술래잡기", {})).join(), /어린이용/);
  assert.match(texts(checkField("ios", field("ios", "subtitle"), "세계 최고의 술래잡기", {})).join(), /세계 최고/);
  assert.match(texts(checkField("ios", field("ios", "description"), "월 1,000원이에요", {})).join(), /금액/);
  assert.match(texts(checkField("ios", field("ios", "description"), "<b>굵게</b>", {})).join(), /HTML/);
});

test("iOS: 이모지와 프로모션 문구의 할인은 애플이 허용해서 경고하지 않는다", () => {
  assert.deepEqual(checkField("ios", field("ios", "name"), "경찰과도둑🚓", {}), []);
  assert.deepEqual(checkField("ios", field("ios", "promotionalText"), "이번 주말만 50% 할인해요", {}), []);
  assert.deepEqual(checkField("ios", field("ios", "whatsNew"), "지금 다운로드해 보세요", {}), []);
});

test("freeze, sales 처럼 다른 단어 안의 글자는 가격으로 보지 않는다", () => {
  assert.deepEqual(checkField("ios", field("ios", "name"), "Freeze Tag", {}), []);
});

test("iOS 키워드: 칸마다 상태를 나눈다", () => {
  const out = keywordStates("추격,경찰,추격,게임,얼음땡", "경찰과도둑", "GPS 술래잡기");
  assert.deepEqual(out.map((k) => k.state), ["ok", "inName", "repeat", "waste", "ok"]);
});

test("iOS 키워드: 띄어쓰기, 기호, 중복을 알린다", () => {
  const t = texts(checkField("ios", field("ios", "keywords"), "추격, 추격,#런닝", { name: "경찰과도둑" })).join("|");
  assert.match(t, /띄어쓰기/);
  assert.match(t, /#과 @/);
  assert.match(t, /같은 키워드가 또 있어요: 추격/);
});

test("Play 앱 이름: 이모지, 반복 문자, 대문자, 순위, 가격, 신규를 알린다", () => {
  const check = (v) => texts(checkField("android", field("android", "title"), v, {})).join("|");
  assert.match(check("경찰과도둑🚓"), /이모지/);
  assert.match(check("경찰과도둑!!!"), /반복/);
  assert.match(check("COPS AND ROBBERS"), /대문자/);
  assert.match(check("인기 게임 1위 경도"), /순위/);
  assert.match(check("경찰과도둑 무료"), /가격/);
  assert.match(check("New 경찰과도둑"), /신규/);
});

test("Play 간단한 설명: 행동 유도와 줄바꿈을 알린다", () => {
  const check = (v) => texts(checkField("android", field("android", "shortDescription"), v, {})).join("|");
  assert.match(check("지금 다운로드하세요"), /지금 다운로드/);
  assert.match(check("첫 줄\n둘째 줄"), /줄을 바꾸지/);
});

test("Play 자세한 설명: 간단한 설명을 되풀이하면 알린다", () => {
  const short = "밖에서 노는 술래잡기";
  const out = checkField("android", field("android", "fullDescription"), `${short}예요.`, { shortDescription: short });
  assert.deepEqual(levels(out), ["tip"]);
});

test("편집의 출발점은 다음에 나갈 값, 없으면 지금 값이다", () => {
  assert.equal(baseOf({ live: { name: "옛 이름" }, pending: { name: "새 이름" } }, "name"), "새 이름");
  assert.equal(baseOf({ live: { name: "옛 이름" }, pending: null }, "name"), "옛 이름");
  assert.equal(baseOf(undefined, "name"), "");
});

test("스토어에 없는 칸은 받지 않는다", () => {
  assert.equal(isField("ios", "keywords"), true);
  assert.equal(isField("android", "keywords"), false);
  assert.equal(isField("ios", "price"), false);
});

test("Play 동영상은 YouTube 영상 주소만 받는다", () => {
  const f = field("android", "video");
  for (const ok of ["https://youtu.be/4nLEws5Sk8A?si=n5QFkdBA-FRttmXL", "https://www.youtube.com/watch?v=4nLEws5Sk8A", "https://m.youtube.com/watch?list=x&v=4nLEws5Sk8A", "https://www.youtube.com/embed/4nLEws5Sk8A"]) {
    assert.equal(youtubeId(ok), "4nLEws5Sk8A", ok);
    assert.deepEqual(checkField("android", f, ok, {}), []);
  }
  for (const bad of ["https://www.youtube.com/@copsandrobbers", "https://www.youtube.com/playlist?list=PL1", "https://vimeo.com/123", "영상"]) {
    assert.equal(youtubeId(bad), null, bad);
    assert.deepEqual(levels(checkField("android", f, bad, {})), ["block"]);
  }
  assert.deepEqual(checkField("android", f, "", {}), []);
});

test("영상 썸네일 주소를 만든다", () => {
  assert.equal(videoThumb("https://youtu.be/4nLEws5Sk8A"), "https://i.ytimg.com/vi/4nLEws5Sk8A/hqdefault.jpg");
  assert.equal(videoThumb(undefined), null);
  assert.equal(videoThumb(""), null);
});
