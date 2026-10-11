/**
 * 챗봇 답 평가와 질문 입력 방식 (#163). 라우트, 화면, 마이그레이션(0009)이 같은 값을 쓴다.
 *
 * 평가는 엄지 대신 치즈 신선도 셋으로 받는다(2026-10-11). 엄지는 누르는 사람이 드물다
 * (Amplitude 가 27,410개 세션을 봤더니 대부분 엄지 평가가 없었다). 팀 비서가 치즈라, 치즈 얼굴로 묻는 편이 눌러 볼 마음이 든다.
 * 셋으로 둔 건 "틀리진 않았는데 쓸모가 애매한" 답을 따로 세려고다. 좋다/나쁘다 둘이면 이게 어느 쪽에도 안 들어간다.
 * 처음엔 펫 표정(하트, 갸웃, 울상)만 썼는데 작게 보면 셋이 비슷해 좋고 나쁨이 바로 안 보였다. 그래서 치즈가 얼마나 신선한지로 바꿨다.
 * 신선한 노랑(만족해요), 너무 익은 갈색(보통이에요), 곰팡이 핀 초록(아쉬워요). 그림은 scripts/pet/freshness.py
 * 글자는 신선도 말("신선해요", "상했어요")이 아니라 만족도 말로 둔다. 신선도 비유는 처음 보는 사람에게 바로 와닿지 않을 수 있어서, 비유는 그림에만 맡긴다
 * 보통이에요, 아쉬워요를 누르면 이유를 하나 고른다. 이유가 있어야 지시문, 도구, 추천 질문 중 무엇을 고칠지 정할 수 있다
 */

export const FEEDBACKS = ["good", "meh", "bad"] as const;
export type Feedback = (typeof FEEDBACKS)[number];

/** 신선도와 말. frame 은 freshness.png 의 칸, tone 은 색 토큰(globals.css 의 fresh, ripe, mold) */
export const FEEDBACK_FACES: { key: Feedback; label: string; meaning: string; frame: number; tone: "fresh" | "ripe" | "mold" }[] = [
  { key: "good", label: "만족해요", meaning: "답이 맞고 쓸모 있었어요", frame: 0, tone: "fresh" },
  { key: "meh", label: "보통이에요", meaning: "틀리진 않았는데 아쉬워요", frame: 1, tone: "ripe" },
  { key: "bad", label: "아쉬워요", meaning: "틀렸거나 쓸모없었어요", frame: 2, tone: "mold" },
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
