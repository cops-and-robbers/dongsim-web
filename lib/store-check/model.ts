/**
 * 어드민 스토어 점검의 항목과 규칙 (docs/admin-ui.md "스토어 점검"). 순수 함수만 둔다.
 * 콘솔마다 흩어진 경고를 "지금 할 일"로 모은다. API 로 읽히는 건 자동으로, 못 읽는 건 날짜와 함께 사람이 체크한다.
 */
export type Level = "todo" | "watch" | "ok";
export type Store = "ios" | "android" | "both";
export type Link = { href: string; label: string; external?: boolean };

export type Check = { id: string; store: Store; level: Level; title: string; detail: string; link?: Link; due?: string; manual?: boolean; doneBy?: string; doneAt?: string };

export type StoreCheck = { checks: Check[]; readAt: string; writable: boolean; readOnlyReason?: string };

const LANG_NAME: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語" };
const names = (langs: string[]) => langs.map((l) => LANG_NAME[l] ?? l).join(", ");

// 유럽연합 27개국. 판매자 상태를 신고하지 않으면 애플이 이 나라들에서 앱을 내린다
export const EU_TERRITORIES = "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE".split(" ");

export type Territory = { code: string; available: boolean; statuses: string[] };
export const sellable = (t: Territory) => t.available && t.statuses.includes("AVAILABLE");

export function territoryChecks(list: Territory[], link: Link): Check[] {
  const byCode = new Map(list.map((t) => [t.code, t]));
  const euBlocked = EU_TERRITORIES.filter((c) => !byCode.get(c) || !sellable(byCode.get(c)!));
  const blocked = list.filter((t) => !sellable(t) && !EU_TERRITORIES.includes(t.code));
  const out: Check[] = [
    euBlocked.length
      ? { id: "ios-eu", store: "ios", level: "todo", title: `유럽 ${euBlocked.length}개 나라에서 앱을 받을 수 없어요`, detail: "App Store Connect 앱 정보의 EU 디지털서비스법 판매자 상태를 확인해 주세요. 계정 소유자만 고칠 수 있어요.", link }
      : { id: "ios-eu", store: "ios", level: "ok", title: "유럽 27개 나라 모두에서 받을 수 있어요", detail: "판매자 상태 신고가 반영돼 있어요." },
  ];
  if (blocked.length) out.push({ id: "ios-territories", store: "ios", level: "watch", title: `${blocked.length}개 나라에서는 앱을 받을 수 없어요`, detail: `${blocked.map((t) => t.code).join(", ")}. 애플이 그 나라에서 판매를 막은 상태예요.`, link });
  return out;
}

export type NextVersion = { version: string; build: string | null; hasReviewContact: boolean; emptyWhatsNew: string[]; noScreenshots: string[]; changedFields: number; drafts: number };

export function versionChecks(next: NextVersion | null, links: { console: Link; page: Link }): Check[] {
  if (!next) return [{ id: "ios-next", store: "ios", level: "ok", title: "준비 중인 다음 버전이 없어요", detail: "새 버전을 만들면 심사에 필요한 것들을 여기서 확인해요." }];
  const v = next.version;
  const out: Check[] = [
    next.build ? { id: "ios-build", store: "ios", level: "ok", title: `${v}에 빌드가 연결돼 있어요`, detail: `빌드 ${next.build}이에요.` } : { id: "ios-build", store: "ios", level: "todo", title: `${v}에 빌드를 연결해 주세요`, detail: "빌드가 없으면 심사에 낼 수 없어요.", link: links.console },
    next.emptyWhatsNew.length ? { id: "ios-whatsnew", store: "ios", level: "todo", title: `${v}의 새로운 기능이 비어 있어요`, detail: `${names(next.emptyWhatsNew)} 칸을 채워야 심사에 낼 수 있어요.`, link: links.page } : { id: "ios-whatsnew", store: "ios", level: "ok", title: `${v}의 새로운 기능을 모두 썼어요`, detail: "세 언어 모두 채워져 있어요." },
    next.noScreenshots.length ? { id: "ios-shots", store: "ios", level: "todo", title: "iPhone 스크린샷이 없는 언어가 있어요", detail: `${names(next.noScreenshots)} 칸에 스크린샷이 필요해요.`, link: links.page } : { id: "ios-shots", store: "ios", level: "ok", title: "iPhone 스크린샷이 세 언어 모두 있어요", detail: "다음 버전 기준이에요." },
    next.hasReviewContact ? { id: "ios-review", store: "ios", level: "ok", title: "심사 연락처가 있어요", detail: "애플이 심사 중에 연락할 곳이에요." } : { id: "ios-review", store: "ios", level: "todo", title: "심사 연락처를 채워 주세요", detail: "이름, 전화번호, 이메일이 있어야 심사에 낼 수 있어요.", link: links.console },
  ];
  if (next.changedFields) out.push({ id: "ios-pending", store: "ios", level: "watch", title: `${v}에 지금과 다른 문구가 ${next.changedFields}칸 있어요`, detail: "심사에 내면 함께 나가요.", link: links.page });
  if (next.drafts) out.push({ id: "ios-drafts", store: "ios", level: "watch", title: `보내지 않은 App Store 초안이 ${next.drafts}칸 있어요`, detail: "어드민에만 저장돼 있어요. 보내야 스토어가 바뀌어요.", link: links.page });
  return out;
}

export type PlayState = { pendingLangs: string[]; drafts: number; crashRate: number | null; anrRate: number | null; anomalies: number };

/** 구글이 공개한 나쁜 품질 기준. 넘으면 스토어 노출이 줄 수 있다 */
export const CRASH_LIMIT = 0.0109;
export const ANR_LIMIT = 0.0047;

const percent = (n: number) => `${(n * 100).toFixed(2)}%`;

export function playChecks(s: PlayState, links: { publishing: Link; page: Link; vitals: Link }): Check[] {
  const out: Check[] = [];
  if (s.pendingLangs.length) out.push({ id: "play-pending", store: "android", level: "watch", title: "저장했지만 아직 안 보이는 문구가 있어요", detail: `${names(s.pendingLangs)} 페이지예요. 심사 중이거나 게시를 기다리는 상태예요.`, link: links.publishing });
  if (s.drafts) out.push({ id: "play-drafts", store: "android", level: "watch", title: `보내지 않은 Google Play 초안이 ${s.drafts}칸 있어요`, detail: "어드민에만 저장돼 있어요. 보내야 스토어가 바뀌어요.", link: links.page });
  if (s.anomalies) out.push({ id: "play-anomaly", store: "android", level: "todo", title: `구글이 이상 징후 ${s.anomalies}건을 찾았어요`, detail: "비정상 종료나 응답 없음이 갑자기 늘었을 때 나와요.", link: links.vitals });
  const stable = (id: string, name: string, rate: number | null, limit: number): Check =>
    rate === null
      ? { id, store: "android", level: "ok", title: `${name}은 아직 집계되지 않았어요`, detail: "사용자가 적으면 구글이 숫자를 보여 주지 않아요." }
      : rate > limit
        ? { id, store: "android", level: "todo", title: `${name}이 ${percent(rate)}로 구글 기준을 넘었어요`, detail: `구글 기준은 ${percent(limit)}예요. 넘으면 스토어 노출이 줄 수 있어요.`, link: links.vitals }
        : { id, store: "android", level: "ok", title: `${name}은 ${percent(rate)}예요`, detail: `구글 기준 ${percent(limit)} 아래예요. 최근 28일 값이에요.` };
  out.push(stable("play-crash", "비정상 종료율", s.crashRate, CRASH_LIMIT), stable("play-anr", "응답 없음 비율", s.anrRate, ANR_LIMIT));
  return out;
}

export function reviewCheck(lowWaiting: number): Check[] {
  return lowWaiting ? [{ id: "reviews-low", store: "both", level: "todo", title: `낮은 별점 리뷰 ${lowWaiting}개가 답글을 기다려요`, detail: "3점 이하 리뷰예요. 두 스토어를 합친 수예요.", link: { href: "/admin/reviews", label: "리뷰 열기" } }] : [];
}

export type Manual = Omit<Check, "level" | "manual" | "doneBy" | "doneAt">;

/** 이 안으로 들어오면 지켜볼 것에서 할 일로 올린다 */
const SOON_DAYS = 90;

export const daysLeft = (due: string, now: Date) => Math.ceil((new Date(`${due}T23:59:59+09:00`).getTime() - now.getTime()) / 86_400_000);

export function manualChecks(items: Manual[], done: Map<string, { doneBy: string; doneAt: string }>, now: Date): Check[] {
  return items.map((m) => {
    const d = done.get(m.id);
    if (d) return { ...m, manual: true, level: "ok", doneBy: d.doneBy, doneAt: d.doneAt };
    return { ...m, manual: true, level: !m.due || daysLeft(m.due, now) <= SOON_DAYS ? "todo" : "watch" };
  });
}

const RANK: Record<Level, number> = { todo: 0, watch: 1, ok: 2 };

/** 할 일부터, 같은 무게 안에서는 기한이 가까운 것부터 */
export function sortChecks(list: Check[]): Check[] {
  return [...list].sort((a, b) => RANK[a.level] - RANK[b.level] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
