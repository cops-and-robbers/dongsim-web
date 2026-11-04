// 운영 서버에 아직 없는 필드 알아보기 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isFieldNotDeployed } from "./notDeployed.ts";

const relayMessage = (operation, errors) =>
  `Relay: No data returned for operation \`${operation}\`, got error(s):\n${errors}\n\nSee the error \`source\` property for more information.`;

test("쿼리에 필드가 없을 때를 Relay 가 감싼 메시지에서도 알아본다", () => {
  const message = relayMessage(
    "AdminUserGameHistories",
    "Validation error (FieldUndefined@[adminUser/gameHistories]) : Field 'gameHistories' in type 'AdminUser' is undefined"
  );
  assert.equal(isFieldNotDeployed(message, "gameHistories"), true);
});

test("뮤테이션이 없을 때도 알아본다", () => {
  const message = relayMessage(
    "UpdateEventGame",
    "Validation error (FieldUndefined@[updateEventGame]) : Field 'updateEventGame' in type 'Mutation' is undefined"
  );
  assert.equal(isFieldNotDeployed(message, "updateEventGame"), true);
});

test("다른 필드가 없는 오류는 이 기능의 배포 전으로 보지 않는다", () => {
  const message = "Validation error (FieldUndefined@[adminUser/other]) : Field 'other' in type 'AdminUser' is undefined";
  assert.equal(isFieldNotDeployed(message, "gameHistories"), false);
});

test("오퍼레이션 이름만 같은 다른 오류는 배포 전으로 보지 않는다", () => {
  assert.equal(isFieldNotDeployed(relayMessage("AdminUserGameHistories", "x is undefined"), "gameHistories"), false);
  assert.equal(isFieldNotDeployed(relayMessage("UpdateEventGame", "x is undefined"), "updateEventGame"), false);
});

test("업무 오류와 네트워크 실패는 배포 전으로 보지 않는다", () => {
  assert.equal(isFieldNotDeployed("Failed to fetch", "gameHistories"), false);
  assert.equal(isFieldNotDeployed(relayMessage("AdminUserGameHistories", "INTERNAL_ERROR"), "gameHistories"), false);
  assert.equal(isFieldNotDeployed("GAME_NOT_WAITING", "updateEventGame"), false);
});
