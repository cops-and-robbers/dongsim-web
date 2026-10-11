// 확인용(held-out) 질문 10개 (#163). 지시문과 도구를 다듬는 데는 쓰지 않고, 고친 뒤 정말 나아졌는지 재는 데만 쓴다.
// 2026-10-11 체다 1.0 말투까지 넣은 뒤, 답 모양을 바꾸기 전에 적었다. 오늘은 2026-10-11, 데이터는 10월 10일까지
//
// 의도(intent): 체다가 질문을 맞게 알아들었나를 도구 호출로 본다(call: 어떤 도구를 어떤 기간, 지표로 불렀나)
// 답(says, refuse, truth): 알아들은 뒤 질문에 맞는 답을 했나
const has = (input, key) => JSON.stringify(input).includes(`"${key}"`);
const period = (i) => i.period ?? i.periodA ?? i.a ?? null;
const covers = (i, start, end) => {
  const p = period(i);
  return !!p && p.start === start && p.end === end;
};

export const HOLDOUT = [
  {
    id: "h-sep-activation",
    kind: "비율",
    q: "9월에 가입한 사람 중에 실제로 게임까지 한 비율 얼마야?",
    call: { name: /metrics_(summary|compare)/, test: (i) => has(i, "signup_activation") && JSON.stringify(i).includes("2026-09-01") && JSON.stringify(i).includes("2026-09-30"), why: "9월, 가입 후 7일 안 첫 게임 비율" },
    says: [/%/],
  },
  {
    id: "h-month-firstopen",
    kind: "비교",
    q: "지난달이랑 이번달 앱 첫 실행 비교해줘",
    tools: [["metrics_compare"]],
    call: { name: "metrics_compare", test: (i) => has(i, "first_open_android") || has(i, "first_open_ios") || !i.metrics, why: "앱 첫 실행을 9월과 10월로 비교" },
  },
  {
    id: "h-cheongchun-games",
    kind: "행사",
    q: "청춘대로 때 몇 판 했어?",
    tools: [["event_report"]],
    truth: { events: [5] },
  },
  {
    id: "h-insta-mood",
    kind: "비교",
    q: "요즘 인스타 반응 어때?",
    call: { name: /metrics_(compare|overview|summary|daily)/, test: (i) => /"ig_/.test(JSON.stringify(i)) || !i.metrics, why: "인스타 지표" },
  },
  {
    id: "h-qr-month",
    kind: "기본",
    q: "QR 찍고 스토어 간 거 이번 달 몇 번이야?",
    call: { name: /metrics_(summary|daily|compare)/, test: (i) => (has(i, "download_link_clicks") || i.metric === "download_link_clicks" || !i.metrics) && JSON.stringify(i).includes("2026-10-01"), why: "이번 달 QR, 링크 이동" },
  },
  {
    id: "h-country-all",
    kind: "분해",
    q: "어느 나라에서 제일 많이 깔았어? 전체 기간으로",
    tools: [["metrics_breakdown"]],
    call: { name: "metrics_breakdown", test: (i) => i.dimension === "country" && covers(i, "2026-04-01", "2026-10-10"), why: "전체 기간 나라별" },
  },
  {
    id: "h-august-quiet",
    kind: "원인",
    q: "8월이 왜 이렇게 조용했어?",
    call: { name: /metrics_(compare|overview|summary|daily)/, test: (i) => JSON.stringify(i).includes("2026-08-01"), why: "8월을 본다" },
    hypotheses: true,
  },
  {
    id: "h-ad-month",
    kind: "기본",
    q: "광고로 이번 달 얼마 벌었어",
    call: { name: /metrics_(summary|compare|daily)/, test: (i) => (has(i, "ad_earnings_usd") || i.metric === "ad_earnings_usd" || !i.metrics) && JSON.stringify(i).includes("2026-10-01"), why: "이번 달 광고 수익" },
    says: [/달러/],
  },
  {
    id: "h-checklist",
    kind: "거절",
    q: "다음 주 행사 준비 체크리스트 만들어줘",
    refuse: true,
  },
  {
    id: "h-remove-peak",
    kind: "최고",
    q: "Android 삭제 많았던 날 있었어?",
    call: { name: /metrics_(daily|overview)/, test: (i) => i.metric === "android_removes" || i.metric === "play_uninstalls" || has(i, "android_removes") || has(i, "play_uninstalls"), why: "삭제를 날짜별로" },
  },
];
