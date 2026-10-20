/**
 * 게임 상세의 "현장 운영" 카드 규칙: 이벤트 게임 켜고 끄기(BE #214)와 방 참가 QR.
 *
 * 화면 문구는 컴포넌트(components/admin/games/)에 두고, 여기에는 상태에 따른 판단만 둔다.
 * node --test 로 바로 돌리므로 타입 말고는 다른 모듈을 부르지 않는다.
 */

import type { MetricsLink } from "../download/links.ts";

export type GameStatusLike = "WAITING" | "IN_PROGRESS" | "FINISHED" | string;

/** 현장 운영 카드를 보일 게임인가. 끝난 방에는 켤 것도, 들어올 사람도 없다 */
export const isActive = (status: GameStatusLike): boolean => status === "WAITING" || status === "IN_PROGRESS";

/**
 * 이벤트 게임 스위치를 지금 누를 수 있나 (BE AdminGameService.updateEventGame 과 같은 규칙).
 * - 켜기: 대기 중, 진행 중
 * - 끄기: 대기 중만. 진행 중에 끄면 이벤트로 들어온 경찰이 일반 규칙 게임에 남는다
 * - confirm: 진행 중에 켜면 이 판이 끝날 때까지 되돌릴 수 없어서 한 번 묻는다. 대기 중에는 바로 되돌릴 수 있어 묻지 않는다
 */
export function eventGameSwitch(status: GameStatusLike, isEventGame: boolean): { enabled: boolean; confirm: boolean } {
  if (status === "WAITING") return { enabled: true, confirm: false };
  if (status === "IN_PROGRESS") return isEventGame ? { enabled: false, confirm: false } : { enabled: true, confirm: true };
  return { enabled: false, confirm: false };
}

/**
 * 실패 이유. 백엔드는 GraphQL 오류를 따로 바꾸지 않아 업무 오류는 메시지로 갈리지 않는다.
 * - not-deployed: 운영 서버에 아직 updateEventGame 이 없다(BE #214 가 main 에 나가기 전). 스키마 검사에서 걸린다
 * - other: 그사이 게임 상태가 바뀌었거나 그 밖의 실패. 최신 상태를 다시 불러와 보여 준다
 */
export function eventGameFailure(message: string): "not-deployed" | "other" {
  return /FieldUndefined|is undefined|Cannot query field|Unknown field|ValidationError/i.test(message) ? "not-deployed" : "other";
}

/** 방 참가 QR 이 가리키는 곳의 뒤에 붙는 구분값. 같은 행사 링크의 다운로드 QR 과 App Store 캠페인 토큰에서 갈린다 */
export const JOIN_CONTENT = "join";
/** campaign.ts 의 APPSTORE_CT_MAX 와 같다 */
const CT_MAX = 30;

type Tag = Pick<MetricsLink, "source" | "medium" | "campaign">;

/**
 * 방 참가 주소. /join/<코드> 는 앱이 있으면 그 방으로 열고, 없으면 스토어로 보낸다.
 * 행사 링크를 고르면 그 꼬리표(출처, 매체, 캠페인)를 붙인다. 결과는 링크별 결과에 같이 잡힌다
 * (linkResult 는 출처|매체|캠페인으로 찾고 구분은 보지 않는다). 구분 join 은 App Store 캠페인 토큰을
 * 30자 안에서만 다운로드 QR 과 가르려고 붙이고, 넘치면 뺀다
 */
export function joinUrl(site: string, inviteCode: string, tag: Tag | null): string {
  const base = `${site}/join/${encodeURIComponent(inviteCode)}`;
  if (!tag) return base;
  const q = new URLSearchParams();
  q.set("utm_source", tag.source);
  q.set("utm_medium", tag.medium);
  q.set("utm_campaign", tag.campaign);
  if ([tag.source, tag.campaign, JOIN_CONTENT].join("-").length <= CT_MAX) q.set("utm_content", JOIN_CONTENT);
  return `${base}?${q.toString()}`;
}

/**
 * 처음 고를 행사 링크. 지난번에 고른 것이 아직 있으면 그것, "꼬리표 없이"를 골랐으면 없음,
 * 처음이면 가장 최근에 만든 링크(행사 직전에 만들어 두고 바로 쓰는 일이 많다)
 */
export function defaultLink(links: MetricsLink[], remembered: number | "none" | null): MetricsLink | null {
  if (remembered === "none") return null;
  if (remembered != null) {
    const rememberedId = remembered;
    const kept = links.find((l) => l.id === rememberedId);
    if (kept) return kept;
  }
  return [...links].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
