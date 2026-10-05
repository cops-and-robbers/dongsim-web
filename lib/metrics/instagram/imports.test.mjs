// 이 폴더 파일들이 Next 없이 node 로 바로 불러와지는지 (#140).
// 타입만 있는 이름을 `import type` 없이 가져오면 tsc 는 통과하지만 node 실행
// (수동 스크립트, 이 테스트)에서만 깨진다. 그 실수를 여기서 잡는다.
import assert from "node:assert/strict";
import { test } from "node:test";

test("수집 모듈을 모두 불러올 수 있다", async () => {
  for (const path of ["./run.ts", "./api.ts", "./store.ts", "./rules.ts", "./messages.ts", "../discord.ts"]) {
    const mod = await import(path);
    assert.ok(Object.keys(mod).length > 0, path);
  }
});
