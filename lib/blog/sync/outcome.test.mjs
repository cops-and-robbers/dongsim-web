import test from "node:test";
import assert from "node:assert/strict";
import { outcomeOf, withoutSignatures } from "./outcome.ts";

test("처음 공개된 글과 공개된 채로 고친 글을 나눈다", () => {
  assert.equal(outcomeOf(null, "published"), "published");
  assert.equal(outcomeOf("draft", "published"), "published");
  assert.equal(outcomeOf("published", "published"), "updated");
});

test("초안만 바뀐 글은 알릴 주소가 아니다", () => {
  assert.equal(outcomeOf(null, "draft"), "written");
  assert.equal(outcomeOf("draft", "draft"), "written");
});

test("공개돼 있다가 초안이 된 글은 내려간 글이다", () => {
  assert.equal(outcomeOf("published", "draft"), "unpublished");
});

test("노션 서명 주소는 서명을 떼고 비교한다", () => {
  const a = "![x](https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b.png?X-Amz-Signature=111&X-Amz-Date=1) 끝";
  const b = "![x](https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b.png?X-Amz-Signature=222&X-Amz-Date=2) 끝";
  assert.equal(withoutSignatures(a), withoutSignatures(b));
  assert.equal(withoutSignatures("![x](https://cdn.copsandrobbers.app/a.png?v=1)"), "![x](https://cdn.copsandrobbers.app/a.png?v=1)");
  assert.equal(withoutSignatures(null), null);
});
