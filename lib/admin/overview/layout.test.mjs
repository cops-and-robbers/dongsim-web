// 내 개요 구성 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { addCards, fitCards, myCards, newRoleOffer } from "./layout.ts";

const roles = [
  { key: "dev", name: "개발", cards: ["crash", "anr", "rel", "bug"] },
  { key: "des", name: "디자인", cards: ["frame", "draft", "post", "views"] },
];
const me = (o) => ({ roleKeys: ["dev"], overviewCards: null, overviewRoles: null, ...o });

test("고친 구성이 없으면 역할 기본 카드를 본다", () => {
  assert.deepEqual(myCards(me({}), roles), { keys: ["crash", "anr", "rel", "bug"], custom: false });
});

test("고친 구성이 있으면 그것을 본다. 모르는 카드는 뺀다", () => {
  assert.deepEqual(myCards(me({ overviewCards: ["games", "nope", "bug"] }), roles), { keys: ["games", "bug"], custom: true });
  assert.deepEqual(myCards(me({ overviewCards: [] }), roles).keys, []);
});

test("고친 뒤에 새로 맡은 역할의 없는 카드만 물어본다", () => {
  assert.equal(newRoleOffer(me({}), roles), null);
  assert.equal(newRoleOffer(me({ overviewCards: ["bug"], overviewRoles: ["dev"] }), roles), null);
  const offer = newRoleOffer(me({ roleKeys: ["dev", "des"], overviewCards: ["bug", "draft"], overviewRoles: ["dev"] }), roles);
  assert.deepEqual(offer.roles.map((r) => r.key), ["des"]);
  assert.deepEqual(offer.cards, ["frame", "post", "views"]);
  assert.equal(newRoleOffer(me({ roleKeys: ["dev", "des"], overviewCards: ["frame", "draft", "post", "views"], overviewRoles: ["dev"] }), roles), null);
});

test("더할 때 8칸을 넘는 만큼은 못 넣었다고 센다", () => {
  assert.deepEqual(addCards(["newu", "ig"], ["bug", "ig"]), { keys: ["newu", "ig", "bug"], skipped: 0 });
  assert.deepEqual(addCards(["games", "end", "newu", "ig"], ["bug", "rep", "games"]), { keys: ["games", "end", "newu", "ig", "bug", "rep"], skipped: 0 });
  assert.deepEqual(addCards(["games", "end", "newu", "ig", "views", "ad"], ["bug", "rep"]), { keys: ["games", "end", "newu", "ig", "views", "ad"], skipped: 2 });
});

test("아는 카드만, 한 번씩, 8칸까지", () => {
  assert.deepEqual(fitCards(["newu", "newu", "x", "games"]), ["newu", "games"]);
});
