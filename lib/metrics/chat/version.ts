/**
 * 체다 버전 (#163). 지시문, 도구, 모델 설정을 한 묶음으로 보고 이름을 붙인다.
 *
 * 질문마다 이 버전을 기록에 남긴다(metrics_chat_log.version). 그러면 질문, 답, 만족도 평가가 버전에 묶여서
 * "1.1 에서 아쉬워요가 줄었나"를 버전끼리 견줄 수 있다(뷰 metrics_chat_versions).
 *
 * 올리는 법(docs/metrics-chat.md "체다 버전 올리기")
 * 1. scripts/chat-eval/feedback-review.mjs 로 지금 버전의 보통이에요, 아쉬워요를 모아 읽는다
 * 2. 고친다(지시문, 도구, 추천 질문, 자동 완성, 모델 설정)
 * 3. scripts/chat-eval/vertex.mjs 로 질문 세트를 다시 돌려 떨어진 게 없는지 본다
 * 4. 여기 버전과 바뀐 점을 적고, version.test.mjs 의 지문을 새로 박는다
 *
 * 지시문이나 도구 설명이 바뀌었는데 버전을 안 올리면 version.test.mjs 가 실패한다. 버전이 같은데 답이 달라지는 일을 막으려고다.
 * 화면 문구만 바꾼 건 버전을 올리지 않는다(답에 영향이 없다)
 */

export const CHEDDAR_VERSION = "1.0";

export const CHANGELOG: { version: string; date: string; notes: string[] }[] = [
  {
    version: "1.0",
    date: "2026-10-11",
    notes: [
      "첫 버전. gemini-3.8-flash(Vertex, 생각 low), 도구 9개(합계, 비교, 날짜별, 나눠 보기, 훑어보기, 일정, 행사 전후, 행사 성적표, 게시물)",
      "같은 날 수로 맞춘 비교, 운영진 거르기(지표 화면과 같은 기준), 답 글의 영어 이름 걷어 내기",
      "Vertex 질문 세트 29문항 모두 통과, 질문당 평균 $0.0133, 중앙 13초",
    ],
  },
];
