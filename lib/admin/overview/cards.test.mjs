// 개요 카드 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CARD_KEYS, CARDS, cardsProblem, cellsOf, changeOf, MAX_CELLS, pack, presetCards, ratioOf, TEAM_CARDS } from "./cards.ts";

test("역할마다 한 장씩 번갈아 합치고 겹친 것은 하나로 한다", () => {
  assert.deepEqual(presetCards([["crash", "anr", "rel", "bug"], ["bug", "rep"]]), ["crash", "bug", "anr", "rep", "rel"]);
});

test("네 역할을 다 맡아도 역할마다 카드가 보인다", () => {
  const roles = [["crash", "anr", "rel", "bug"], ["frame", "draft", "post", "views"], ["fun", "newu", "ig", "site"], ["rep", "ev", "ret", "chk"]];
  const keys = presetCards(roles);
  assert.equal(cellsOf(keys), MAX_CELLS);
  for (const r of roles) assert.ok(r.some((k) => keys.includes(k)), r.join());
});

test("모르는 카드는 빼고, 비면 팀 기본 카드를 쓴다", () => {
  assert.deepEqual(presetCards([["nope", "bug"]]), ["bug"]);
  assert.deepEqual(presetCards([]), TEAM_CARDS);
  assert.deepEqual(presetCards([["nope"]]), TEAM_CARDS);
});

test("8칸을 넘기지 않는다. 두 칸 카드는 두 칸으로 센다", () => {
  const keys = presetCards([["games", "end", "newu", "ig", "views", "ad", "site"]]);
  assert.ok(cellsOf(keys) <= MAX_CELLS);
  assert.deepEqual(keys, ["games", "end", "newu", "ig", "views", "ad"]);
});

test("네 칸 두 줄은 줄마다 빈틈없이 채운다", () => {
  for (const keys of [["newu", "ig", "views", "ad", "site"], ["games", "bug", "rep", "ev"], ["newu"], ["end", "games", "bug", "rep", "rv", "chk"]]) {
    const placed = pack(keys, 4);
    assert.equal(placed.length, keys.length);
    let row = 0;
    for (const p of placed) {
      row += p.span;
      assert.ok(row <= 4, keys.join());
      if (row === 4) row = 0;
    }
    assert.equal(row, 0, `빈칸이 남았어요: ${keys.join()}`);
  }
});

test("다섯 장이면 두 줄로 나누고 줄마다 카드 수 차이는 하나다", () => {
  const spans = pack(["newu", "ig", "views", "ad", "site"], 4).map((p) => p.span);
  assert.deepEqual(spans, [2, 2, 2, 1, 1]);
});

test("두 칸 줄에서는 두 칸 카드가 한 줄을 차지한다", () => {
  assert.deepEqual(pack(["end", "bug"], 2).map((p) => p.span), [2, 2]);
});

test("비율과 변화", () => {
  assert.equal(ratioOf({ num: 1, den: 4 }), 0.25);
  assert.equal(ratioOf({ num: 1, den: 0 }), null);
  assert.equal(changeOf(12, 10), 0.2);
  assert.equal(changeOf(5, 0), null);
});

test("마이그레이션이 넣는 역할 기본 카드는 모두 목록에 있다", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/0024_admin_team.sql", import.meta.url), "utf8");
  const keys = [...sql.matchAll(/'\{([a-z,]+)\}'/g)].flatMap((m) => m[1].split(","));
  assert.ok(keys.length >= 16);
  for (const k of keys) assert.ok(CARD_KEYS.includes(k), k);
});

test("카드마다 갈 화면이 어드민 안이다", () => {
  for (const k of CARD_KEYS) assert.match(CARDS[k].href, /^\/admin/);
});

test("역할 기본 카드는 아는 카드만, 한 번씩, 8칸까지 저장한다", () => {
  assert.equal(cardsProblem(["newu", "games", "bug"]), null);
  assert.equal(cardsProblem([]), null);
  assert.match(cardsProblem(["newu", "nope"]), /모르는/);
  assert.match(cardsProblem(["newu", "newu"]), /두 번/);
  assert.match(cardsProblem(["games", "end", "newu", "ig", "views", "ad", "site"]), /8칸/);
});
