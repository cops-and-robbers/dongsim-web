// 포토부스 방식, 흐름, 문구 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { COPY, DEFAULT_KIOSK, METHODS, copyText, diffKiosk, flowLine, normalizeKiosk, validateCopy } from "./kiosk.ts";
import { defaultSettings, readiness } from "./settings.ts";

test("기본값은 지금 부스와 같다(인쇄, 엽서 2장, 96%, 6장, 3초, 1분)", () => {
  assert.deepEqual(
    [DEFAULT_KIOSK.receive, DEFAULT_KIOSK.paper, DEFAULT_KIOSK.overscan, DEFAULT_KIOSK.shots, DEFAULT_KIOSK.countdown, DEFAULT_KIOSK.restartSec],
    ["print", "postcard-pair", 96, 6, 3, 60],
  );
  assert.equal(flowLine(DEFAULT_KIOSK), "6장 찍기 → 4장 고르기 → 인쇄하고 QR");
  assert.equal(flowLine({ ...DEFAULT_KIOSK, ...METHODS.quick.values }), "4장 찍기 → QR로 받기");
});

test("저장소 값을 믿지 않는다: 고를 수 없는 값은 기본값, 보정은 90 ~ 100 안으로, 기본과 같은 문구는 버림", () => {
  const k = normalizeKiosk({ shots: 13, countdown: 4, overscan: 150, receive: "fax", copy: { "intro.title": COPY["intro.title"].text, "qr.body": "폰으로 받아가세요", hack: "x" } });
  assert.equal(k.shots, 6);
  assert.equal(k.countdown, 3);
  assert.equal(k.overscan, 100);
  assert.equal(k.receive, "print");
  assert.deepEqual(k.copy, { "qr.body": "폰으로 받아가세요" });
});

test("문구 바꿔 넣기", () => {
  assert.equal(copyText({}, "closed.body", { name: "노원 청소년축제" }), "노원 청소년축제에서 만나요");
  assert.equal(copyText({}, "select.title", { name: "", cuts: 3 }), "마음에 드는 3컷을 골라요");
  assert.equal(copyText({ "qr.body": "{행사 이름} 사진 받아가세요" }, "qr.body", { name: "서대페" }), "서대페 사진 받아가세요");
});

test("문구 검사: 비움, 한 줄 길이, 줄 수, 모르는 바꿔 넣기", () => {
  const p = validateCopy({
    "intro.title": " ",
    "qr.body": "가".repeat(25),
    "intro.start": "시작\n하기",
    "closed.body": "{행사이름}에서 만나요",
    "intro.body": "첫 줄\n둘째 줄",
  });
  assert.match(p["intro.title"], /비워/);
  assert.match(p["qr.body"], /24자/);
  assert.match(p["intro.start"], /1줄/);
  assert.match(p["closed.body"], /\{행사이름\}/);
  assert.equal(p["intro.body"], undefined);
});

test("바뀐 것은 어느 화면 어디인지와 같이", () => {
  const d = diffKiosk(DEFAULT_KIOSK, { ...DEFAULT_KIOSK, receive: "qr", copy: { "result.title": "사진 왔어요" } });
  assert.deepEqual(d.map((x) => x.label), ["받는 방법 · 받기 화면, 인쇄", "제목 · 손님 폰 사진 받기 페이지"]);
  assert.deepEqual([d[0].before, d[0].after], ["인쇄하고 QR도", "QR로만"]);
});

test("준비 점검: QR로만 받는데 문구에 인쇄가 있으면, 인쇄 부스면 시험 인쇄", () => {
  const e = { id: 1, day: "2026-11-22", label: "축제", startsAt: "12:00", endsAt: "17:00" };
  const s = { ...defaultSettings(e), location: "운동장" };
  assert.ok(readiness(e, s).some((c) => c.id === "testPrint" && c.level === "todo"));
  const qr = { ...s, kiosk: { ...s.kiosk, receive: "qr", copy: { "intro.body": "찍고 바로 인쇄해 가세요" } } };
  const checks = readiness(e, qr);
  assert.equal(checks[0].id, "qrPrintCopy");
  assert.ok(!checks.some((c) => c.id === "testPrint"));
});

test("프레임과 캐릭터: 모르는 주소는 버리고, 고른 게 없으면 기본, 바뀐 것은 이름으로", async () => {
  const { BUILTIN_FRAME } = await import("./assets.ts");
  const { framesOf, slotsOf, charactersOf } = await import("./kiosk.ts");
  const k = normalizeKiosk({
    frames: [{ key: "assets/frame/winter-1.png", label: "겨울", width: 1800, height: 5400, slots: BUILTIN_FRAME.slots.slice(0, 3), swatch: "#DCE8F5" }, { key: "http://x/y.png" }],
    characters: { cop: { key: "assets/character/cop-1.png", label: "산타 경찰" }, thief: { key: "assets/frame/nope.png", label: "x" } },
  });
  assert.equal(k.frames.length, 1);
  assert.equal(slotsOf(k), 3);
  assert.equal(framesOf(DEFAULT_KIOSK)[0].key, BUILTIN_FRAME.key);
  assert.deepEqual(charactersOf(k), { cop: "/photobooth/asset/character/cop-1.png", thief: "/photobooth/thief-runaway.svg" });
  const d = diffKiosk(DEFAULT_KIOSK, k);
  assert.deepEqual(d.map((x) => [x.before, x.after]), [
    ["연두(기본)", "겨울"],
    ["냥파 교수(기본)", "산타 경찰"],
  ]);
});

test("코드에 든 냥파, 도둥이 그림은 키만 저장하고 그 경로로 그린다. 모르는 builtin 키는 버린다", async () => {
  const { charactersOf } = await import("./kiosk.ts");
  const k = normalizeKiosk({ characters: { cop: { key: "builtin/cop-wave", label: "손 흔드는 냥파" }, thief: { key: "builtin/thief-ghost", label: "x" } } });
  assert.deepEqual(k.characters, { cop: { key: "builtin/cop-wave", label: "손 흔드는 냥파" }, thief: null });
  assert.deepEqual(charactersOf(k), { cop: "/photobooth/police-wave.svg", thief: "/photobooth/thief-runaway.svg" });
});
