// 로컬에서 개요 서버 카드를 보는 가짜 값. 지표 표와 스토어에 닿지 않는다.
import { CARDS, isCardKey, type OverviewData } from "@/lib/admin/overview/cards";
import { SAMPLE_CARDS } from "@/lib/admin/overview/samples";

export function mockOverview(url: string): OverviewData {
  const keys = (new URL(url).searchParams.get("cards") ?? "").split(",").filter(isCardKey).filter((k) => CARDS[k].source === "server");
  return { cards: Object.fromEntries(keys.map((k) => [k, SAMPLE_CARDS[k] ?? { kind: "error", message: "가짜 값이 없어요." }])), readAt: new Date().toISOString() };
}
