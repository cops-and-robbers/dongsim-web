// 경찰과 도둑 온라인 게임(저장소 cops-and-robbers-web-game)의 운영 상태. 게임 서버가 정본이고 어드민은 바꾸기만 한다.
// 게임 쪽 설명은 그 저장소 docs/ops.md

export const WEBGAME_MODES = ["soon", "open", "pause"] as const;
export type WebgameMode = (typeof WEBGAME_MODES)[number];

/** 게임 서버가 들고 있는 값. by 는 바꾼 사람 이름(밖으로 내보내지 않는다) */
export type WebgameControl = {
  mode: WebgameMode;
  message: string;
  until: string | null;
  at: number;
  by: string;
};

/** 어드민 화면이 받는 값. 게임 주소와 지금 환경에서 바꿀 수 있는지를 붙인다 */
export type WebgameState = WebgameControl & { url: string; writable: boolean };

export type WebgameChange = { mode: WebgameMode; message: string; until: string | null };

/** 누구나 읽는 /status 의 값. 웹사이트 입구 페이지가 쓴다 */
export type WebgameStatus = Pick<WebgameControl, "mode" | "message" | "until">;

export const WEBGAME_URL_DEFAULT = "https://cops-and-robbers-game.pages.dev";
export const MESSAGE_MAX = 80;

export const MODE_LABEL: Record<WebgameMode, string> = {
  soon: "공개 전",
  open: "누구나",
  pause: "점검 중",
};

// 고르면서 결과가 읽히게, 상태 이름 대신 무슨 일이 생기는지 적는다(docs/admin-ui.md "온라인 게임")
export const MODE_RESULT: Record<WebgameMode, string> = {
  soon: "팀만 시험 주소로 들어와요. 다른 사람은 만들고 있다는 안내를 봐요.",
  open: "누구나 들어와 방을 만들고 친구를 불러요.",
  pause: "아무도 새로 못 들어와요. 하던 판은 끝까지 가요.",
};

export function isWebgameMode(v: unknown): v is WebgameMode {
  return typeof v === "string" && (WEBGAME_MODES as readonly string[]).includes(v);
}

/** 서버와 화면이 같은 규칙으로 검사한다. 통과하면 null */
export function validateWebgameChange(c: Partial<WebgameChange> | null | undefined): string | null {
  if (!c || !isWebgameMode(c.mode)) return "상태를 골라 주세요.";
  if (Array.from(c.message ?? "").length > MESSAGE_MAX) return `안내는 ${MESSAGE_MAX}자까지 적을 수 있어요.`;
  if (c.until && Number.isNaN(new Date(c.until).getTime())) return "다시 여는 시각을 다시 골라 주세요.";
  return null;
}
