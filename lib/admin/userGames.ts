/**
 * 유저 상세 "끝난 게임" 규칙(BE #227).
 *
 * 화면 문구는 컴포넌트(components/admin/users/)에 두고, 여기에는 판단과 상태 변화만 둔다.
 * node --test 로 바로 돌리므로 다른 모듈을 부르지 않는다.
 */

export const FIRST_SHOWN = 20;
/** 백엔드 limit 최댓값(AdminUserResolver @Max(100)) */
export const MAX_LIMIT = 100;

/** 서버가 전체 개수를 주지 않아서, 더 있는지 알려고 처음엔 한 줄 더 묻는다 */
export const limitFor = (expanded: boolean): number => (expanded ? MAX_LIMIT : FIRST_SHOWN + 1);

/** 카드 상태. expanded 는 지금 읽으려는 크기, loaded.expanded 는 화면에 있는 줄을 읽은 크기다 */
export type FinishedGamesState<T> = {
  expanded: boolean;
  attempt: number;
  loaded: { games: readonly T[]; expanded: boolean } | null;
  failure: "not-deployed" | "other" | "more" | null;
};

export type FinishedGamesAction<T> =
  | { type: "loaded"; games: readonly T[]; expanded: boolean }
  | { type: "failed"; notDeployed: boolean; expanded: boolean }
  | { type: "expand" }
  | { type: "retry" };

export const initialFinishedGames: FinishedGamesState<never> = {
  expanded: false,
  attempt: 0,
  loaded: null,
  failure: null,
};

export function finishedGamesReducer<T>(
  state: FinishedGamesState<T>,
  action: FinishedGamesAction<T>
): FinishedGamesState<T> {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        loaded: { games: action.games, expanded: action.expanded },
        // 더 보기 실패 안내는 다시 누를 때까지 둔다. 접으면서 다시 읽은 결과로 지우지 않는다
        failure: state.failure === "more" ? "more" : null,
      };
    case "failed":
      if (action.notDeployed) return { ...state, failure: "not-deployed" };
      // 펼치다 실패하면 접어 두고 다시 누르게 한다
      if (action.expanded && !state.loaded?.expanded) return { ...state, expanded: false, failure: "more" };
      // 있던 줄을 다시 받다 실패하면 그대로 둔다. 잠깐의 실패로 표를 지우지 않는다
      return state.loaded ? state : { ...state, failure: "other" };
    case "expand":
      return { ...state, expanded: true, failure: null };
    case "retry":
      return { ...state, attempt: state.attempt + 1, failure: null };
  }
}

/**
 * 받아 온 줄에서 보여 줄 줄과 머리의 개수 글자.
 * - hasMore: 더 볼 수 있다(처음 읽기에서 한 줄 더 왔다)
 * - capped: 100판을 다 채웠다. 그 뒤에 더 있는지는 알 수 없다
 */
export function shownGames<T>(games: readonly T[], expanded: boolean) {
  const hasMore = !expanded && games.length > FIRST_SHOWN;
  const capped = expanded && games.length >= MAX_LIMIT;
  const rows = hasMore ? games.slice(0, FIRST_SHOWN) : games;
  return { rows, hasMore, capped, countLabel: hasMore || capped ? `최근 ${rows.length}판` : `${rows.length}판` };
}

/**
 * 이 유저의 결과. 판이 끝나기 전에 나갔으면 승패를 말하지 않는다.
 * 팀이 이겼어도 끝까지 함께한 게 아니라서 승리로 적으면 사실과 달라진다.
 */
export function gameOutcome(game: {
  team: string;
  winnerTeam?: string | null;
  leftAt?: string | null;
}): "left" | "win" | "lose" | null {
  if (game.leftAt != null) return "left";
  if (game.winnerTeam == null) return null;
  return game.team === game.winnerTeam ? "win" : "lose";
}

/**
 * 체포, 잡힘 횟수를 믿을 수 있는 첫 시각. 두 값은 v3.9.0(2026-09-17 02:18 KST 머지)부터 운영에 쌓였고,
 * 그 전 기록에는 기본값 0 이 들어 있어 실제로 0 번이었던 판과 구분되지 않는다.
 */
const RECORD_COUNTED_FROM = Date.parse("2026-09-17T03:00:00+09:00");

export function recordCounted(endedAt: string | null | undefined): boolean {
  if (!endedAt) return false;
  const at = Date.parse(endedAt);
  return !Number.isNaN(at) && at >= RECORD_COUNTED_FROM;
}
