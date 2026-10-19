/**
 * 행사 링크: 짧은 주소 /q/<코드> 와 QR (#171).
 *
 * 어드민에서 링크를 등록하면 /q/<코드> 가 등록된 꼬리표를 붙여 /download 로 보낸다.
 * /download 는 기기를 보고 스토어로 넘기면서 꼬리표를 Play referrer 와 App Store 캠페인 토큰으로 이어 준다(campaign.ts, #144).
 *
 * 등록할 때 여기서 미리 막는 것
 * - 꼬리표 글자: /download 가 받는 글자(영문, 숫자, - _ .)가 아니면 거기서 조용히 버려진다
 * - App Store 캠페인 토큰: 출처-캠페인-구분을 이어 30자에서 자른다. 넘으면 다른 링크와 같은 토큰이 될 수 있다
 * - 코드: 주소에 그대로 들어가니 소문자, 숫자, 하이픈만. 짧을수록 QR 점이 성기어 멀리서도 잘 읽힌다
 *
 * 이 파일은 node --test 로 바로 돌리므로 다른 모듈을 부르지 않는다. 그래서 campaign.ts 의 규칙을 그대로 옮겨 적었다
 * (같은지는 links.test.mjs 가 campaign.ts 와 견줘 확인한다).
 */

/** campaign.ts 의 SAFE 와 같다 */
const SAFE = /^[A-Za-z0-9_.-]{1,64}$/;
/** campaign.ts 의 APPSTORE_CT_MAX 와 같다 */
const CT_MAX = 30;
/** 2~24자, 소문자와 숫자로 시작하고 끝난다. 마이그레이션 0012 의 검사와 같다 */
const CODE = /^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$/;
const MAX_LABEL = 40;

export type LinkFields = {
  code: string;
  label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  event_id: number | null;
};

export type MetricsLink = {
  id: number;
  code: string;
  label: string;
  source: string;
  medium: string;
  campaign: string;
  content: string | null;
  eventId: number | null;
  createdAt: string;
};

export const LINK_COLUMNS = "id, code, label, utm_source, utm_medium, utm_campaign, utm_content, event_id, created_at";

export function toLink(row: Record<string, unknown>): MetricsLink {
  return {
    id: Number(row.id),
    code: String(row.code),
    label: String(row.label),
    source: String(row.utm_source),
    medium: String(row.utm_medium),
    campaign: String(row.utm_campaign),
    content: row.utm_content == null ? null : String(row.utm_content),
    eventId: row.event_id == null ? null : Number(row.event_id),
    createdAt: String(row.created_at),
  };
}

export const isCode = (v: string): boolean => CODE.test(v);

/** App Store 캠페인 토큰. campaign.ts 의 appStoreCampaignToken 과 같은 규칙(자르기 전 길이를 보려고 자르지 않는다) */
export function campaignToken(source: string, campaign: string, content: string | null): string {
  return [source, campaign, content].filter(Boolean).join("-");
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * 몸통을 DB 칸으로. 틀린 값은 사람이 고칠 수 있는 말로 돌려준다. partial 이면 온 칸만 본다.
 * 꼬리표 하나를 고칠 때도 토큰 길이는 세 칸을 합쳐 봐야 해서, current(지금 저장된 값)를 받아 합쳐 본다
 */
export function linkFieldsOf(
  body: Record<string, unknown>,
  partial: boolean,
  current?: Pick<LinkFields, "utm_source" | "utm_campaign" | "utm_content">,
): Partial<LinkFields> | string {
  const out: Partial<LinkFields> = {};
  if (!partial || "code" in body) {
    const code = text(body.code).toLowerCase();
    if (!isCode(code)) return "주소 코드는 소문자, 숫자, 하이픈으로 2자에서 24자까지 적어 주세요.";
    out.code = code;
  }
  if (!partial || "label" in body) {
    const label = text(body.label);
    if (!label) return "링크 이름을 적어 주세요.";
    if (label.length > MAX_LABEL) return `링크 이름은 ${MAX_LABEL}자까지 적을 수 있어요.`;
    out.label = label;
  }
  const tags = [
    ["source", "utm_source", "출처를", "출처는"],
    ["medium", "utm_medium", "매체를", "매체는"],
    ["campaign", "utm_campaign", "캠페인을", "캠페인은"],
  ] as const;
  for (const [key, col, object, topic] of tags) {
    if (partial && !(key in body)) continue;
    const v = text(body[key]) || (key === "medium" ? "qr" : "");
    if (!v) return `${object} 적어 주세요.`;
    if (!SAFE.test(v)) return `${topic} 영문, 숫자, 하이픈(-), 밑줄(_), 마침표(.)만 써 주세요.`;
    out[col] = v;
  }
  if (!partial || "content" in body) {
    const v = text(body.content);
    if (v && !SAFE.test(v)) return "구분은 영문, 숫자, 하이픈(-), 밑줄(_), 마침표(.)만 써 주세요.";
    out.utm_content = v || null;
  }
  if (!partial || "eventId" in body) {
    const v = body.eventId;
    if (v === null || v === undefined || v === "") out.event_id = null;
    else if (Number.isInteger(Number(v)) && Number(v) > 0) out.event_id = Number(v);
    else return "연결할 일정을 다시 골라 주세요.";
  }
  const source = out.utm_source ?? current?.utm_source ?? "";
  const campaign = out.utm_campaign ?? current?.utm_campaign ?? "";
  const content = out.utm_content !== undefined ? out.utm_content : (current?.utm_content ?? null);
  if (source && campaign && campaignToken(source, campaign, content).length > CT_MAX) {
    return `출처, 캠페인, 구분을 합쳐 ${CT_MAX - 2}자 안으로 줄여 주세요. App Store 가 그보다 긴 이름은 잘라요.`;
  }
  return out;
}

/** /q/<코드> 가 보낼 곳. 꼬리표 순서는 campaign.ts 의 UTM_KEYS 와 같다 */
export function downloadPath(link: Pick<MetricsLink, "source" | "medium" | "campaign" | "content">): string {
  const q = new URLSearchParams();
  q.set("utm_source", link.source);
  q.set("utm_medium", link.medium);
  q.set("utm_campaign", link.campaign);
  if (link.content) q.set("utm_content", link.content);
  return `/download?${q.toString()}`;
}

/** 링크별 결과를 찾는 열쇠. GA4 키(출처|매체|캠페인)와 같은 모양, 대소문자는 GA4 가 그대로 두므로 그대로 비교한다 */
export const linkKey = (l: { source: string; medium: string; campaign: string }) => `${l.source}|${l.medium}|${l.campaign}`;

export type LinkResult = { visits: number; storeMoves: number; androidFirstOpens: number };

/**
 * 기간 합에서 링크의 꼬리표와 같은 줄만 더한다. 화면이 이미 받은 캠페인 표를 그대로 쓴다.
 * - 방문: 사이트 세션(webCampaigns). 구분(content)이 달라도 같은 링크다
 * - 스토어로 이동: 다운로드 버튼과 /download 로 넘어간 수(downloadCampaigns)
 * - Android 첫 실행: Play referrer 로 갈린 앱 신규 사용자(appCampaigns). iOS 는 앱이 어느 링크로 왔는지 모른다
 */
export function linkResult(
  link: { source: string; medium: string; campaign: string },
  d: {
    webCampaigns: { source: string; medium: string; campaign: string; sessions: number }[];
    appCampaigns: { source: string; medium: string; campaign: string; sessions: number }[];
    downloadCampaigns: { source: string; medium: string; campaign: string; clicks: number }[];
  },
): LinkResult {
  const k = linkKey(link);
  const sum = <T,>(rows: T[], pick: (r: T) => number, keyOf: (r: T) => string) => rows.reduce((n, r) => (keyOf(r) === k ? n + pick(r) : n), 0);
  return {
    visits: sum(d.webCampaigns, (r) => r.sessions, linkKey),
    storeMoves: sum(d.downloadCampaigns, (r) => r.clicks, linkKey),
    androidFirstOpens: sum(d.appCampaigns, (r) => r.sessions, linkKey),
  };
}
