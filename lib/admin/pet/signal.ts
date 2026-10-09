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
