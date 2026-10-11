import type { Category } from "@/lib/metrics/events";

/**
 * 일정 성격 색 (#165). 달력 점과 차트 마름모가 같이 쓴다.
 * 색은 무엇인지 알아보는 표시일 뿐이라, 글자는 늘 글자색으로 쓰고 옆에 성격 이름을 같이 적는다(색만으로 구분하지 않는다)
 */
export const CATEGORY_DOT: Record<Category, string> = {
  event: "bg-ev-event",
  promo: "bg-ev-promo",
  release: "bg-sd-fg-subtle",
  test: "bg-ev-test",
  etc: "bg-sd-fg",
};

/** 사람이 고르는 성격. 출시는 수집기가 자동으로 넣어 고르지 않는다 */
export const PICKABLE: Category[] = ["event", "promo", "test", "etc"];

/** 고를 때 보여 주는 한 줄 설명 */
export const CATEGORY_HINT: Record<Category, string> = {
  event: "부스, 대회처럼 사람들이 직접 해 보는 자리. 끝나면 그날 게임 중 행사 게임을 골라 성적표를 만들어요",
  promo: "포스터, 모집글, 광고. 그 뒤 유입을 같이 봐요",
  release: "앱 버전 출시. 자동으로 들어와요",
  test: "QA, 팀 시험. 운영진 계정의 게임은 숫자에서 이미 빠져 있어요",
  etc: "그 밖의 일",
};
