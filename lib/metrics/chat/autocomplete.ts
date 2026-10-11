/**
 * 질문 자동 완성 (#163). 모델을 부르지 않는다(토큰 0). 쓰는 중인 말에 맞는 질문 틀을 골라 채운다.
 *
 * 틀은 2026-10-11 Vertex 실험에서 잘 답한 질문 모양에서 왔다(행사 효과, 행사에서 만난 사람, 이 기간 비교, 가장 많은 날, 추세).
 * 행사 이름은 일정의 첫 낱말이다("서대페 부스, 미니운동회 14~20시" -> 서대페). 팀이 부르는 줄임말도 받는다(서겜타).
 * 지표는 어드민이 칠 법한 낱말(설치, 가입, 게임...)로 찾는다. 지표 키나 정의를 외울 필요가 없게.
 *
 * 쓰는 중인 말이 길어져 어떤 틀과도 앞이 안 맞으면 내놓지 않는다. 자기 질문을 쓰는 중이라 방해만 된다
 */

export type EventName = { day: string; label: string };

const MAX = 4;
/** 이보다 길게 썼는데 틀 앞부분과 안 맞으면 자기 질문을 쓰는 중으로 본다 */
const OWN_QUESTION_FROM = 10;

/** 팀이 부르는 행사 줄임말 -> 일정 첫 낱말 */
const EVENT_ALIASES: Record<string, string> = { 서겜타: "서울게임타운2", 겜타: "서울게임타운2" };

const METRICS: { words: string[]; name: string }[] = [
  { words: ["설치", "다운", "깔"], name: "설치" },
  { words: ["가입"], name: "가입" },
  { words: ["게임", "판"], name: "진행된 게임" },
  { words: ["방문", "사이트", "홈페이지"], name: "사이트 방문" },
  { words: ["인스타", "조회", "릴스", "게시물"], name: "인스타 조회" },
  { words: ["삭제", "지움"], name: "앱 삭제" },
  { words: ["전환"], name: "사이트 전환율" },
  { words: ["실행", "첫실행"], name: "앱 첫 실행" },
  { words: ["qr", "큐알", "링크"], name: "QR로 스토어 이동" },
];

const metricTemplates = (m: string) => [`이 기간 ${m}, 이전 기간보다 늘었어?`, `이 기간 ${m}이 가장 많았던 날은?`, `지금까지 ${m} 추세 어때?`];
const eventTemplates = (e: string) => [`${e} 효과 있었어?`, `${e}에서 실제로 몇 명이랑 게임했어?`, `${e} 앞뒤로 설치와 가입은 어땠어?`];

const GENERAL: { words: string[]; questions: string[] }[] = [
  { words: ["왜", "이유", "원인"], questions: ["이 기간 왜 이렇게 늘었어?", "이 기간 왜 이렇게 줄었어?"] },
  { words: ["비교", "지난", "이번", "대비"], questions: ["이번 주 지난주 대비 어때?", "이번 달 지난달 대비 어때?", "이 기간을 이전 기간과 비교해 줘"] },
  { words: ["나라", "국가", "어디서"], questions: ["이 기간 설치는 어느 나라에서 왔어?"] },
  { words: ["경로", "채널", "유입", "어디로"], questions: ["이 기간 사이트 방문은 어느 채널에서 왔어?", "이 기간 App Store 설치는 검색과 링크 중 어디로 더 왔어?"] },
  { words: ["전체", "지금까지", "누적", "추세"], questions: ["지금까지 설치 추세 어때? 가장 많았던 주는 언제야?"] },
  { words: ["7일", "활성", "실제로"], questions: ["가입하고 7일 안에 실제로 게임까지 한 사람 비율은?"] },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
/** 일정 이름의 첫 낱말. "서대페 부스, 미니운동회 14~20시 (반포한강공원)" -> 서대페 */
export const eventShortName = (label: string) => label.trim().split(/[\s,(]/)[0];

/** 쓰는 중인 말 끝 낱말이 단어의 앞이거나, 단어가 말 안에 있으면 맞는다 */
function hit(draft: string, word: string): boolean {
  const d = norm(draft);
  const w = norm(word);
  if (!d || !w) return false;
  if (d.includes(w)) return true;
  const last = norm(draft.trim().split(/\s+/).at(-1) ?? "");
  return last.length >= 1 && w.startsWith(last);
}

export function complete(draft: string, events: EventName[]): string[] {
  const d = norm(draft);
  if (!d) return [];
  const out: string[] = [];
  // 행사가 먼저다. 행사 이름은 지표 낱말보다 드물게 겹쳐서 맞으면 거의 그 행사를 찾는 중이다
  const names = [...new Set(events.map((e) => eventShortName(e.label)))];
  for (const [alias, name] of Object.entries(EVENT_ALIASES)) if (names.includes(name) && hit(draft, alias)) out.push(...eventTemplates(alias));
  for (const n of names) if (hit(draft, n)) out.push(...eventTemplates(n));
  if (/행사|축제|부스/.test(draft) && names[0]) out.push(...eventTemplates(names[0]));
  for (const g of GENERAL) if (g.words.some((w) => hit(draft, w))) out.push(...g.questions);
  for (const m of METRICS) if (m.words.some((w) => hit(draft, w))) out.push(...metricTemplates(m.name));

  const uniq = [...new Set(out)].filter((q) => norm(q) !== d);
  // 앞이 맞는 틀을 먼저. 길게 썼는데 앞이 맞는 틀이 없으면 자기 질문을 쓰는 중이다
  const prefix = uniq.filter((q) => norm(q).startsWith(d));
  if (d.length >= OWN_QUESTION_FROM && !prefix.length) return [];
  return [...prefix, ...uniq.filter((q) => !prefix.includes(q))].slice(0, MAX);
}
