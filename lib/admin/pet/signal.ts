/**
 * 화면 어디서든 치즈 펫에게 알리는 신호 (#163). 챗봇(AskPanel)이 상태가 바뀔 때 부른다.
 * 펫이 없는 화면에서 불러도 아무 일도 없다(이벤트만 보낸다).
 */
export type PetSignal =
  | "typing" // 입력창에 쓰는 중 -> 귀 기울이기
  | "asking" // 질문을 보냄 -> 생각, 킁킁
  | "answered" // 검증을 다 통과한 답 -> 기쁨
  | "unverified" // 확인 못 한 숫자가 있는 답 -> 갸웃
  | "error" // 오류 -> 꽈당
  | "liked" // 도움이 됐어요 -> 하트
  | "disliked"; // 아니에요 -> 시무룩

export const PET_EVENT = "cheese-pet";

export function petSignal(signal: PetSignal) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<PetSignal>(PET_EVENT, { detail: signal }));
}

export const PET_SAY_EVENT = "cheese-pet-say";

/**
 * 치즈 머리 위 말풍선 한 줄. 긴 답을 담는 곳이 아니라 알림이다(물어보기 창을 닫아 둔 사이 답이 왔을 때 등).
 * 답 자체를 말풍선에 넣지 않는 이유: 숫자 비교와 막대가 들어가야 하는데 말풍선에는 안 들어가고, 몇 줄만 넘어도 읽기 힘들다
 */
export function petSay(text: string, ms = 6000) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<{ text: string; ms: number }>(PET_SAY_EVENT, { detail: { text, ms } }));
}
