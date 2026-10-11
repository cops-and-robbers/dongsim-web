/**
 * 챗봇 사용량과 남은 한도 (#163). 질문 기록(metrics_chat_log)으로 센다. 라우트와 시험이 같이 쓴다.
 *
 * 한도는 세 겹이다.
 * 1. 사람당 하루 질문 수(CHAT_DAILY_LIMIT): 한 사람이 몰아 써서 팀 몫을 다 쓰지 않게
 * 2. 이번 달 팀 비용(CHAT_MONTHLY_USD): 우리가 토큰으로 센 값. 구글 지출 한도(₩12,000)보다 낮게 둬서 앱이 먼저 멈춘다
 * 3. 구글 Cloud 지출 한도(Vertex AI, ₩12,000): 정가 기준이고 몇 시간 늦게 걸린다. 크레딧(월 ₩13,588) 안쪽이다
 *
 * 화면에는 돈이 아니라 "몇 번 더 물을 수 있나"로 보여 준다. 달러나 원은 어드민이 가늠하기 어렵다
 * (Shape of AI "Cost estimates": 비기술 사용자에게는 제품 단위가 낫다, Hex 는 80% 에서 입력창 위에 알린다).
 * 질문 하나 값은 이번 달 실제 평균으로 잡는다. 2026-10-11 Vertex 실험 29문항 평균은 $0.0133, 가장 비싼 문항 $0.027
 */

export type LogRow = { user_key: string; cost_usd: number; error: string | null; created_at: string };

export type Usage = {
  /** 오늘 이 사람이 더 물을 수 있는 수 */
  remainingToday: number;
  dailyLimit: number;
  month: {
    /** 팀 전체 이번 달 질문 수(실패 포함), 그중 내 것 */
    questions: number;
    mine: number;
    spentUsd: number;
    capUsd: number;
    /** 질문 하나 평균 비용. 이번 달 성공한 답이 적으면 실험 평균 */
    avgCostUsd: number;
    /** 남은 예산으로 더 물을 수 있는 대략의 수 */
    estLeft: number;
    /** 한도가 풀리는 날(다음 달 1일) */
    resetOn: string;
    full: boolean;
  };
  /** 화면이 입력창 위에 알릴지. 하루 몫이 거의 다 찼거나 달 예산의 80% 를 넘으면 */
  warn: "today" | "month" | null;
};

/** 실험 평균(2026-10-11, gemini-3.8-flash, 29문항). 이번 달 답이 이보다 적으면 이 값을 쓴다 */
export const DEFAULT_COST_USD = 0.0133;
const MIN_SAMPLES = 5;
const WARN_TODAY_UNDER = 5;
const WARN_MONTH_RATIO = 0.8;

const nextMonthFirst = (today: string) => {
  const [y, m] = today.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
};

/** rows 는 이번 달 기록 전부(팀). dayStart 는 오늘 0시(한국)의 ISO */
export function usageOf(rows: LogRow[], me: string, dayStart: string, today: string, dailyLimit: number, capUsd: number): Usage {
  const spent = rows.reduce((a, r) => a + (r.cost_usd || 0), 0);
  const answered = rows.filter((r) => !r.error && r.cost_usd > 0);
  const avg = answered.length >= MIN_SAMPLES ? answered.reduce((a, r) => a + r.cost_usd, 0) / answered.length : DEFAULT_COST_USD;
  const usedToday = rows.filter((r) => r.user_key === me && r.created_at >= dayStart).length;
  const remainingToday = Math.max(0, dailyLimit - usedToday);
  const full = spent >= capUsd;
  const estLeft = full ? 0 : Math.floor((capUsd - spent) / avg);
  const warn = full || spent >= capUsd * WARN_MONTH_RATIO ? "month" : remainingToday <= WARN_TODAY_UNDER ? "today" : null;
  return {
    remainingToday,
    dailyLimit,
    month: {
      questions: rows.length,
      mine: rows.filter((r) => r.user_key === me).length,
      spentUsd: Math.round(spent * 10000) / 10000,
      capUsd,
      avgCostUsd: Math.round(avg * 10000) / 10000,
      estLeft,
      resetOn: nextMonthFirst(today),
      full,
    },
    warn,
  };
}
