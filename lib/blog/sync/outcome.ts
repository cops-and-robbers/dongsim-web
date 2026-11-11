/** 글을 쓴 결과. 내용이 같아 쓰지 않은 경우(unchanged)는 부르는 쪽이 먼저 거른다 (#309) */
export type ChangeOutcome = "written" | "published" | "updated" | "unpublished";

/**
 * 이전 상태와 이번 상태로 쓰기 결과를 정한다.
 *
 * - published: 이번에 처음 공개됐다. 검색엔진에 새 주소로 알린다
 * - updated: 공개된 채로 내용이 바뀌었다. 바뀐 주소로 알린다
 * - unpublished: 공개돼 있다가 내려갔다. 그 주소가 정말 닫혔는지 본다
 * - written: 공개 전 초안만 바뀌었다. 주소가 열려 있지 않아 알릴 것이 없다
 */
export function outcomeOf(prevStatus: string | null, nextStatus: string): ChangeOutcome {
  const was = prevStatus === "published";
  const now = nextStatus === "published";
  if (was && !now) return "unpublished";
  if (!was && now) return "published";
  if (was && now) return "updated";
  return "written";
}

/**
 * 노션 서명 주소의 서명 부분을 뗀다. 이미지 이관에 실패한 글은 본문에 노션 서명 주소가 남는데,
 * 서명은 받을 때마다 달라서 그대로 비교하면 6시간마다 "고친 글"이 되어 검색엔진에 다시 알려진다(#309).
 */
export function withoutSignatures(text: string | null): string | null {
  if (!text) return text;
  return text.replace(/(https?:\/\/[^\s)"]*(?:amazonaws\.com|notion\.so|notion-static\.com)[^\s)"?]*)\?[^\s)"]*/g, "$1");
}
