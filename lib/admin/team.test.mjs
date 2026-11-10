// 운영진과 역할 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canManage, cleanKeys, ICON_GROUPS, newRoleKey, pickedNote, ROLE_ICONS, roleProblem, seenLabel } from "./team.ts";

const roles = [{ key: "dev", name: "개발" }, { key: "des", name: "디자인" }, { key: "ops", name: "운영" }];

test("운영 역할이 있어야 남을 고치고, 맡은 사람이 없으면 누구나 고친다", () => {
  assert.equal(canManage(["ops"], [{ roleKeys: ["ops"] }]), true);
  assert.equal(canManage(["dev"], [{ roleKeys: ["ops"] }, { roleKeys: ["dev"] }]), false);
  assert.equal(canManage([], [{ roleKeys: ["dev"] }]), true);
});

test("없는 역할은 빼고 목록 순서로 맞춘다", () => {
  assert.deepEqual(cleanKeys(["ops", "gone", "dev", "dev"], roles), ["dev", "ops"]);
  assert.deepEqual(cleanKeys([], roles), []);
});

test("역할 이름과 설명, 아이콘을 확인한다", () => {
  const ok = { name: "커뮤니티", description: "디스코드와 오픈채팅", icon: "message", cards: [] };
  assert.equal(roleProblem(ok, roles, false), null);
  assert.match(roleProblem({ ...ok, name: " " }, roles, false), /이름을 적어/);
  assert.match(roleProblem({ ...ok, name: "가".repeat(11) }, roles, false), /10자/);
  assert.match(roleProblem({ ...ok, name: "개발" }, roles, false), /같은 이름/);
  assert.match(roleProblem({ ...ok, description: "가".repeat(25) }, roles, false), /24자/);
  assert.match(roleProblem({ ...ok, icon: "dev" }, roles, false), /아이콘/);
  assert.equal(roleProblem({ ...ok, icon: "dev" }, roles, true), null);
});

test("새 역할 키는 이름과 상관없이 만든다", () => {
  assert.match(newRoleKey(1_700_000_000_000), /^r_[0-9a-z]+$/);
});

test("마지막 접속을 한국 날짜로 센다", () => {
  const now = Date.parse("2026-11-10T03:00:00Z"); // 한국 낮 12시
  assert.equal(seenLabel("2026-11-10T02:55:00Z", now), "지금 접속 중");
  assert.equal(seenLabel("2026-11-09T16:00:00Z", now), "오늘 접속"); // 한국 새벽 1시
  assert.equal(seenLabel("2026-11-09T14:00:00Z", now), "어제 접속"); // 한국 전날 밤 11시
  assert.equal(seenLabel("2026-11-05T03:00:00Z", now), "5일 전 접속");
  assert.equal(seenLabel("2026-09-01T03:00:00Z", now), "한 달 넘게 접속하지 않았어요");
});

test("고른 역할을 한 줄로 알려 준다", () => {
  assert.equal(pickedNote(["ops", "dev"], roles), "개발, 운영 역할로 시작해요.");
  assert.equal(pickedNote([], roles), "고르지 않아도 모든 화면을 볼 수 있어요.");
});

test("아이콘 목록과 모양이 하나씩 맞고 이름이 겹치지 않는다", () => {
  const shapes = readFileSync(new URL("../../components/admin/team/roleIcons.tsx", import.meta.url), "utf8");
  const drawn = [...shapes.matchAll(/^  "([a-z]+)": /gm)].map((m) => m[1]);
  assert.deepEqual([...drawn].sort(), [...ROLE_ICONS].sort());
  assert.equal(new Set(ROLE_ICONS).size, ROLE_ICONS.length);
  const labels = ICON_GROUPS.flatMap((g) => g.icons.map((i) => i.label));
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(ROLE_ICONS.length >= 60);
});
