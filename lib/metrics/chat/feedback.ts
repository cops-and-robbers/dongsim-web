/**
 * 챗봇 답 평가와 질문 입력 방식 (#163). 라우트, 화면, 마이그레이션(0009)이 같은 값을 쓴다.
 *
 * 평가는 엄지 대신 치즈 표정 셋으로 받는다(2026-10-11). 엄지는 누르는 사람이 드물다
 * (Amplitude 가 27,410개 세션을 봤더니 대부분 엄지 평가가 없었다). 팀 비서가 치즈라, 치즈 얼굴로 묻는 편이 눌러 볼 마음이 든다.
 * 셋으로 둔 건 "틀리진 않았는데 쓸모가 애매한" 답을 따로 세려고다. 좋다/나쁘다 둘이면 이게 어느 쪽에도 안 들어간다.
 * 애매해요, 아쉬워요를 누르면 이유를 하나 고른다. 이유가 있어야 지시문, 도구, 추천 질문 중 무엇을 고칠지 정할 수 있다
 */

export const FEEDBACKS = ["good", "meh", "bad"] as const;
export type Feedback = (typeof FEEDBACKS)[number];

/** 표정과 말. anim 은 치즈 스프라이트 동작 이름(lib/admin/pet/brain.ts) */
export const FEEDBACK_FACES: { key: Feedback; label: string; anim: "love" | "confused" | "sad" }[] = [
  { key: "good", label: "좋았어요", anim: "love" },
  { key: "meh", label: "애매해요", anim: "confused" },
  { key: "bad", label: "아쉬워요", anim: "sad" },
];

export const FEEDBACK_REASONS: { key: string; label: string }[] = [
  { key: "wrong_number", label: "숫자가 틀려요" },
  { key: "misunderstood", label: "질문을 잘못 알아들었어요" },
  { key: "wrong_period", label: "기간이 달라요" },
  { key: "not_useful", label: "쓸모가 없어요" },
  { key: "other", label: "다른 이유" },
];

/** 질문을 어떻게 넣었나 */
export const INPUT_SOURCES = ["typed", "suggestion", "autocomplete", "followup"] as const;
export type InputSource = (typeof INPUT_SOURCES)[number];
