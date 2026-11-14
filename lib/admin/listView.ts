/**
 * 유저, 게임 목록 보기 (docs/admin-ui.md "목록 보기 고르기").
 * 사람마다 좋아하는 모양이 달라서 고르게 한다. 한 사람이 고르면 유저와 게임 두 화면에 함께 쓰인다.
 *
 * - split: 목록과 상세 두 칸. 한 명씩, 한 판씩 이어 볼 때 좋다(신고 처리처럼)
 * - table: 표. 줄을 누르면 전체 화면 상세로 간다. 여러 줄의 값을 나란히 견줄 때 좋다
 *
 * 폰처럼 좁은 화면은 표가 들어갈 자리가 없어 고른 값과 상관없이 두 칸(좁으면 목록, 고르면 상세)으로 본다.
 */
export type ListView = "split" | "table";

export const DEFAULT_LIST_VIEW: ListView = "split";

/** 표를 보여 줄 수 있는 폭. 두 칸 화면이 옆에 상세를 띄우는 폭(lg)과 같다 */
export const TABLE_MIN_WIDTH = 1024;

export function parseListView(value: unknown): ListView | null {
  return value === "split" || value === "table" ? value : null;
}

/** 실제로 그릴 보기. 좁은 화면은 늘 두 칸이다 */
export function effectiveListView(chosen: ListView, wide: boolean): ListView {
  return wide ? chosen : "split";
}
