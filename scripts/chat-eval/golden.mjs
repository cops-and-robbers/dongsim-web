// 지표 챗봇 골든 질문 (#163). 질문마다 "이렇게 답해야 맞다"를 코드로 적는다. 채점은 run.mjs 가 한다.
// 숫자 정답을 박지 않는다. 데이터가 날마다 바뀌어서다. 대신 맞는 도구와 기간을 골랐는지, 숫자가 도구 결과에 있는지(검증기),
// 볼 수 없는 것을 볼 수 없다고 하는지, 원인을 단정하지 않는지, 비율을 %p 로 말하는지를 본다.
//
// tools: 이 중 하나라도 불러야 한다(배열의 배열이면 묶음마다 하나씩)
// call: 어떤 호출이 있어야 한다(이름과 입력 조건)
// says: 답 글(머리, 사실, 주의점)에 이 말이 있어야 한다
// refuse: 숫자 없이 "볼 수 없다"는 답이어야 한다

const has = (input, key) => JSON.stringify(input).includes(`"${key}"`);

export const GOLDEN = [
  {
    id: "week-compare",
    q: "지난주 App Store 최초 다운로드는 그 전주보다 늘었어?",
    tools: [["metrics_compare"]],
    call: { name: "metrics_compare", test: (i) => has(i, "appstore_new") || !i.metrics, why: "appstore_new 를 비교" },
  },
  {
    id: "all-time-trend",
    q: "지금까지 설치 추세 어때? 가장 많았던 주는 언제야?",
    tools: [["metrics_overview"]],
    call: { name: "metrics_overview", test: (i) => i.period?.start === "2026-04-01", why: "전체는 수집 시작(4월 1일)부터" },
  },
  {
    id: "view-country",
    q: "이 기간 설치는 어느 나라에서 왔어?",
    view: { tab: "store", range: { start: "2026-09-12", end: "2026-10-09" }, previous: { start: "2026-08-15", end: "2026-09-11" } },
    tools: [["metrics_breakdown"]],
    call: { name: "metrics_breakdown", test: (i) => i.dimension === "country" && i.period?.start === "2026-09-12" && i.period?.end === "2026-10-09", why: "화면 기간으로 나라별" },
  },
  {
    id: "why-first-open",
    q: "9월에 앱 첫 실행이 왜 늘었어?",
    tools: [
      ["metrics_overview", "metrics_daily", "metrics_compare", "metrics_summary"],
      ["events_list", "event_window", "metrics_breakdown"],
    ],
    hypotheses: true,
  },
  {
    id: "event-effect",
    q: "서대페 효과 있었어?",
    tools: [["events_list"], ["event_window"]],
  },
  {
    id: "ratio-compare",
    q: "최근 28일 사이트 전환율은 그 전 28일보다 올랐어?",
    tools: [["metrics_compare"]],
    call: { name: "metrics_compare", test: (i) => has(i, "site_conversion"), why: "site_conversion 을 비교" },
    says: [/%p|퍼센트포인트/],
  },
  {
    id: "ratio-fraction",
    q: "최근 28일 활성화율이랑 다음 날 다시 온 비율 알려줘",
    tools: [["metrics_summary", "metrics_compare"]],
    call: { name: /metrics_(summary|compare)/, test: (i) => has(i, "activation_rate") && has(i, "d1_return"), why: "두 비율을 함께" },
    says: [/중|\//],
  },
  { id: "out-of-scope", q: "경쟁 앱 설치 수랑 우리 설치 수를 비교해 줘", refuse: true },
  { id: "today", q: "오늘 설치 몇 개야?", says: [/어제|오늘/] },
  { id: "forecast", q: "다음 달 설치가 몇 개일지 예측해 줘", refuse: true },
  { id: "ad-revenue", q: "지난달 광고 수익 얼마야?", says: [/보내지 않|볼 수 없|알 수 없|없어요|못/] },
  {
    id: "server-missing",
    q: "가입하고 7일 안에 실제로 게임까지 한 사람 비율은?",
    call: { name: /metrics_(summary|compare|overview)/, test: (i) => has(i, "signup_activation") || has(i, "new_players"), why: "가입 후 첫 게임 지표를 찾음" },
    says: [/못 읽|읽지 못|비어|없어요|볼 수 없|알 수 없/],
  },
  {
    id: "removes",
    q: "Android 삭제가 최근 늘었어?",
    call: { name: /metrics_/, test: (i) => has(i, "android_removes") || has(i, "android_remove_rate") || has(i, "play_uninstalls"), why: "삭제 지표" },
  },
  {
    id: "qr-week",
    q: "행사 QR로 스토어에 넘어간 횟수가 가장 많았던 주는 언제야?",
    call: { name: /metrics_/, test: (i) => has(i, "download_link_clicks") || has(i, "download_clicks"), why: "QR 이동 지표" },
  },
  {
    id: "posts-traffic",
    q: "인스타 게시물을 올린 주에 사이트 방문이 늘었어?",
    tools: [["metrics_overview", "metrics_daily", "metrics_compare"]],
    hypotheses: false,
  },
];
