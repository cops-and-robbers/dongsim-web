// 어드민 "앱 설정"이 다루는 Firebase Remote Config 값과 규칙. 화면, 서버 경로, 목 데이터가 함께 쓴다.
// 값 이름은 앱의 lib/core/services/remote_config/remote_config_keys.dart 와 같아야 한다.
// 설계와 근거는 docs/admin-ui.md "앱 설정"

export const APP_CONFIG_KEYS = [
  "maintenance",
  "maintenance_message",
  "latest_version",
  "minimum_version",
  "force_update",
  "ads_enabled",
  "community_ads_enabled",
  "game_end_ads_enabled",
  "banner_enabled",
  "banner_image_url",
  "banner_link_url",
  "event_evidence_image_1_url",
  "event_evidence_image_2_url",
  "event_evidence_image_3_url",
] as const;

export type AppConfigKey = (typeof APP_CONFIG_KEYS)[number];
/** Remote Config 값은 true, false 까지 전부 글자로 오간다. */
export type AppConfigValues = Record<AppConfigKey, string>;
export type AppConfigChanges = Partial<AppConfigValues>;

export const EVIDENCE_KEYS = ["event_evidence_image_1_url", "event_evidence_image_2_url", "event_evidence_image_3_url"] as const;
const isEvidenceKey = (key: AppConfigKey) => (EVIDENCE_KEYS as readonly string[]).includes(key);

const BOOLEAN_KEYS: AppConfigKey[] = ["maintenance", "force_update", "ads_enabled", "community_ads_enabled", "game_end_ads_enabled", "banner_enabled"];
const isBooleanKey = (key: AppConfigKey) => BOOLEAN_KEYS.includes(key);
export const isAppConfigKey = (key: string): key is AppConfigKey => (APP_CONFIG_KEYS as readonly string[]).includes(key);

// 콘솔에 값이 없을 때 앱이 쓰는 기본값(RemoteConfigDefaults)과 같다
const APP_DEFAULTS: AppConfigValues = {
  maintenance: "false",
  maintenance_message: "",
  latest_version: "1.0.0",
  minimum_version: "1.0.0",
  force_update: "false",
  ads_enabled: "false",
  community_ads_enabled: "true",
  game_end_ads_enabled: "true",
  banner_enabled: "false",
  banner_image_url: "",
  banner_link_url: "",
  event_evidence_image_1_url: "",
  event_evidence_image_2_url: "",
  event_evidence_image_3_url: "",
};

const LABELS: Record<AppConfigKey, string> = {
  maintenance: "점검",
  maintenance_message: "끝나는 시각",
  latest_version: "최신 버전",
  minimum_version: "최소 버전",
  force_update: "강제 업데이트",
  ads_enabled: "전체 광고",
  community_ads_enabled: "커뮤니티 광고",
  game_end_ads_enabled: "게임 종료 광고",
  banner_enabled: "배너",
  banner_image_url: "배너 이미지",
  banner_link_url: "배너 링크",
  event_evidence_image_1_url: "증거 사진 1번",
  event_evidence_image_2_url: "증거 사진 2번",
  event_evidence_image_3_url: "증거 사진 3번",
};

// 한 카드에서 함께 저장하는 묶음. 고친 묶음의 규칙만 본다. 콘솔에서 넣어 둔 다른 묶음의 값 때문에 저장이 막히면 안 된다
const GROUPS: AppConfigKey[][] = [
  ["maintenance", "maintenance_message"],
  ["latest_version", "minimum_version", "force_update"],
  ["ads_enabled", "community_ads_enabled", "game_end_ads_enabled"],
  ["banner_enabled", "banner_image_url", "banner_link_url"],
  ["event_evidence_image_1_url", "event_evidence_image_2_url", "event_evidence_image_3_url"],
];

type Parameter = {
  defaultValue?: { value?: string; useInAppDefault?: boolean };
  conditionalValues?: Record<string, unknown>;
  [key: string]: unknown;
};
export type RemoteConfigTemplate = {
  parameters?: Record<string, Parameter>;
  [key: string]: unknown;
};

/**
 * 앱이 켜짐으로 읽는 값. 앱이 쓰는 Flutter SDK 의 RemoteConfigValue.asBool 과 같다(대소문자 무시, true 와 1 만).
 * 네이티브 SDK 문서는 yes, on 도 켜짐이라고 적지만 Flutter 는 꺼짐으로 읽는다. 화면은 앱이 실제로 보는 상태를 보여 줘야 한다.
 */
const appReadsTrue = (raw: string) => ["true", "1"].includes(raw.toLowerCase());

/**
 * 템플릿에서 14개 값을 읽는다. 조건이 걸린 값(conditioned)은 사람마다 다르게 내려가서 한 값으로 보여 줄 수 없다.
 * 지금은 조건이 없지만, 콘솔에서 걸면 화면은 그 값을 잠근다.
 */
export function readAppConfig(template: RemoteConfigTemplate) {
  const values = { ...APP_DEFAULTS };
  const conditioned: AppConfigKey[] = [];
  for (const key of APP_CONFIG_KEYS) {
    const parameter = template.parameters?.[key];
    const raw = parameter?.defaultValue?.value;
    if (typeof raw === "string") values[key] = isBooleanKey(key) ? String(appReadsTrue(raw)) : raw;
    if (parameter?.conditionalValues && Object.keys(parameter.conditionalValues).length > 0) conditioned.push(key);
  }
  return { values, conditioned };
}

const VERSION = /^\d+\.\d+\.\d+$/;

// ── 점검이 끝나는 시각 ──
// maintenance_message 는 번역되지 않고 모든 언어 사용자에게 그대로 나간다. 그래서 글을 받지 않고 시각을 고르게 해 한 형식으로 적는다.
// 사용자가 어느 나라에 있든 기준이 보이게 한국 시간이라고 함께 적는다.

export type MaintenanceEnd = { date: string; time: string };

const END_FORMAT = /^~ \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(KST\)$/;
const KST_OFFSET = 9 * 60 * 60_000;

export const formatMaintenanceEnd = ({ date, time }: MaintenanceEnd) => `~ ${date} ${time} (KST)`;

/** 저장된 문구에서 시각을 읽는다. 콘솔에서 적은 예전 형식(2026-09-17 : 13:00)도 읽고, 글이면 null 이다. */
export function parseMaintenanceEnd(message: string): MaintenanceEnd | null {
  const m = message.match(/(\d{4}-\d{2}-\d{2})\s*:?\s*(\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : null;
}

const kstIso = (ms: number) => new Date(ms + KST_OFFSET).toISOString();

/** 한국 시간으로 오늘. 관리자 컴퓨터의 시간대와 상관없다. */
export const kstToday = (nowMs: number) => kstIso(nowMs).slice(0, 10);

/** 지금부터 minutes 뒤를 30분 단위로 올린 시각. "1시간 뒤"가 13:07 처럼 나오지 않게 한다. */
export function presetMaintenanceEnd(nowMs: number, minutes: number): MaintenanceEnd {
  const step = 30 * 60_000;
  const iso = kstIso(Math.ceil((nowMs + minutes * 60_000) / step) * step);
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** 끝나는 시각(한국 시간)이 가리키는 순간 */
export const maintenanceEndAt = ({ date, time }: MaintenanceEnd) => Date.parse(`${date}T${time}:00+09:00`);

export const isFutureEnd = (end: MaintenanceEnd, nowMs: number) => maintenanceEndAt(end) > nowMs;

/** a 가 b 보다 낮으면 음수. 앱의 AppVersionChecker 처럼 앞에서부터 세 자리를 숫자로 비교한다. */
export function compareVersions(a: string, b: string) {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

const isHttps = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.includes(".");
  } catch {
    return false;
  }
};

/** 값마다 틀린 까닭. 앱은 틀린 값을 조용히 넘기니(버전의 틀린 자리는 0, 깨진 배너는 숨김) 저장 전에 여기서 막는다. */
export function validateAppConfig(values: AppConfigValues): Partial<Record<AppConfigKey, string>> {
  const errors: Partial<Record<AppConfigKey, string>> = {};

  for (const key of BOOLEAN_KEYS) {
    if (values[key] !== "true" && values[key] !== "false") errors[key] = "켜짐이나 꺼짐으로 골라 주세요.";
  }
  if (values.maintenance_message && !END_FORMAT.test(values.maintenance_message)) errors.maintenance_message = "끝나는 시각을 다시 골라 주세요.";

  const latestOk = VERSION.test(values.latest_version);
  const minimumOk = VERSION.test(values.minimum_version);
  if (!latestOk) errors.latest_version = "세 칸을 모두 채워 주세요.";
  if (!minimumOk) errors.minimum_version = "세 칸을 모두 채워 주세요.";
  if (latestOk && minimumOk && compareVersions(values.minimum_version, values.latest_version) > 0) {
    errors.minimum_version = "최소 버전은 최신 버전보다 높을 수 없어요.";
  }

  if (values.banner_image_url && !isHttps(values.banner_image_url)) errors.banner_image_url = "이 이미지 주소는 쓸 수 없어요. 새로 올려 주세요.";
  else if (values.banner_enabled === "true" && !values.banner_image_url) errors.banner_image_url = "배너를 표시하려면 이미지를 올려 주세요.";
  if (values.banner_link_url && !isHttps(values.banner_link_url)) errors.banner_link_url = "주소를 다시 확인해 주세요.";

  EVIDENCE_KEYS.forEach((key, i) => {
    const previous = EVIDENCE_KEYS[i - 1];
    if (values[key] && !isHttps(values[key])) errors[key] = "이 이미지 주소는 쓸 수 없어요. 새로 올려 주세요.";
    // 앱은 앞에서부터 빈 값을 만나기 전까지만 사진으로 본다. 건너뛴 사진은 말없이 사라진다
    else if (values[key] && previous && !values[previous]) errors[key] = `${i}번 사진을 먼저 올려 주세요.`;
  });

  return errors;
}

/** 실제로 달라진 값만 남긴다. */
export function diffAppConfig(before: AppConfigValues, after: AppConfigChanges): AppConfigChanges {
  const changes: AppConfigChanges = {};
  for (const key of APP_CONFIG_KEYS) {
    const value = after[key];
    if (value !== undefined && value !== before[key]) changes[key] = value;
  }
  return changes;
}

/** 고친 값이 들어 있는 묶음의 오류만 돌려준다. */
export function validateChanges(before: AppConfigValues, changes: AppConfigChanges) {
  const errors = validateAppConfig({ ...before, ...changes });
  const touched = GROUPS.filter((group) => group.some((key) => changes[key] !== undefined)).flat();
  return Object.fromEntries(Object.entries(errors).filter(([key]) => touched.includes(key as AppConfigKey))) as Partial<Record<AppConfigKey, string>>;
}

const showValue = (key: AppConfigKey, value: string, side: "before" | "after") => {
  if (isBooleanKey(key)) return value === "true" ? "켜짐" : "꺼짐";
  // 긴 저장소 주소는 읽어도 알 수 없다. 사진은 옆 폰에서 본다
  if (isEvidenceKey(key)) return !value ? "없음" : side === "before" ? "지금 사진" : "새 사진";
  return value || "없음";
};

/** 확인창의 "이전 값, 새 값" 줄. */
export function describeChanges(before: AppConfigValues, changes: AppConfigChanges) {
  return APP_CONFIG_KEYS.filter((key) => changes[key] !== undefined).map((key) => ({
    key,
    label: LABELS[key],
    before: showValue(key, before[key], "before"),
    after: showValue(key, changes[key] as string, "after"),
  }));
}

/** 사용자가 앱을 못 쓰게 되는 변경인지. 확인창이 빨간 버튼과 이 문장을 보여 준다. */
export function warningsFor(before: AppConfigValues, changes: AppConfigChanges) {
  const after = { ...before, ...changes };
  const warnings: string[] = [];
  const blocks = after.force_update === "true";
  const raised = VERSION.test(after.minimum_version) && VERSION.test(before.minimum_version) && compareVersions(after.minimum_version, before.minimum_version) > 0;
  if (blocks && (raised || (changes.force_update === "true" && before.force_update !== "true"))) {
    warnings.push(`${after.minimum_version}보다 낮은 앱은 업데이트하기 전까지 쓸 수 없어요.`);
  }
  if (changes.ads_enabled === "false") warnings.push("끄면 모든 광고가 사라져요.");
  return warnings;
}

/**
 * 앱스토어에 아직 없는 버전을 고르면 경고한다. 없는 버전으로 업데이트를 권하거나 막게 된다.
 * 앱스토어 조회가 늦거나 플레이 스토어가 먼저일 수 있어서 막지는 않는다.
 */
export function storeWarning(after: AppConfigValues, changes: AppConfigChanges, storeVersion: string | null) {
  if (!storeVersion) return null;
  const ahead = (["latest_version", "minimum_version"] as const).some(
    (key) => changes[key] !== undefined && VERSION.test(after[key]) && compareVersions(after[key], storeVersion) > 0
  );
  return ahead ? `앱스토어에는 아직 ${storeVersion}까지 올라가 있어요. 없는 버전을 안내하게 될 수 있어요.` : null;
}

export type VersionOutcome = "maintenance" | "forceUpdate" | "optionalUpdate" | "recommendUpdate" | "upToDate";

/** 이 버전의 앱을 열면 어떻게 되는지. 앱의 AppVersionChecker.check 와 같은 순서다. 옆 폰이 이 결과로 화면을 고른다. */
export function appVersionOutcome(values: AppConfigValues, appVersion: string): VersionOutcome {
  if (values.maintenance === "true") return "maintenance";
  if (compareVersions(appVersion, values.minimum_version) < 0) return values.force_update === "true" ? "forceUpdate" : "optionalUpdate";
  if (compareVersions(appVersion, values.latest_version) < 0) return "recommendUpdate";
  return "upToDate";
}

function versionBelow(version: string) {
  const [a, b, c] = version.split(".").map(Number);
  if (c > 0) return `${a}.${b}.${c - 1}`;
  if (b > 0) return `${a}.${b - 1}.0`;
  return a > 0 ? `${a - 1}.0.0` : null;
}

/** 폰에서 열어 볼 예시 버전. 최소 버전 아래, 최소 버전, 최신 버전으로 경우마다 하나씩 고른다. */
export function versionSamples(values: AppConfigValues) {
  if (!VERSION.test(values.minimum_version) || !VERSION.test(values.latest_version)) return [];
  const list = [versionBelow(values.minimum_version), values.minimum_version, values.latest_version];
  return [...new Set(list.filter((v): v is string => v !== null))].map((version) => ({ version }));
}

/** Firebase 버전 설명에 남기는 한 줄. 콘솔의 변경 내역과 화면의 이력에 그대로 보인다. */
export function describeForHistory(actor: string, before: AppConfigValues, changes: AppConfigChanges) {
  const lines = describeChanges(before, changes).map((c) => (c.key === "banner_image_url" || c.key === "banner_link_url" || isEvidenceKey(c.key) ? `${c.label} 변경` : `${c.label} ${c.before}→${c.after}`));
  return `${actor}: ${lines.join(", ")}`.slice(0, 200);
}

/**
 * 고친 값만 템플릿에 합친다. Firebase 는 템플릿 전체를 덮어쓰므로 나머지(콘솔에서 더한 값, 설명, 조건)는 그대로 돌려보낸다.
 * version 은 설명만 보낼 수 있고 번호와 시각은 Firebase 가 정한다.
 */
export function mergeTemplate(template: RemoteConfigTemplate, changes: AppConfigChanges, description: string): RemoteConfigTemplate {
  const parameters = { ...template.parameters };
  for (const key of APP_CONFIG_KEYS) {
    const value = changes[key];
    if (value === undefined) continue;
    const existing = parameters[key] ?? { valueType: isBooleanKey(key) ? "BOOLEAN" : "STRING" };
    parameters[key] = { ...existing, defaultValue: { value } };
  }
  return { ...template, parameters, version: { description } };
}

// ── 배너 이미지 ──

export const BANNER_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type BannerImageType = (typeof BANNER_IMAGE_TYPES)[number];
export const MAX_BANNER_BYTES = 2 * 1024 * 1024;
export const BANNER_PREFIX = "banners/";

/**
 * 디자인할 때 볼 배너 크기.
 * 앱은 폭 전체(화면의 361/393)에 높이 68(화면 높이 852 기준 비례)로 그리고 넘치는 쪽을 잘라 낸다(home_banner.dart, BoxFit.cover).
 * 기준 기기(393x852)의 361 x 68 을 4배 한 값이다. 폰 대부분은 비율이 같아(5.17~5.31) 거의 잘리지 않는다.
 * 잘리는 쪽은 넓적한 기기다. iPhone SE 는 위아래 9%, iPad(768x1024)는 위아래 19%씩 잘린다.
 * BANNER_SAFE 는 Galaxy 쪽 좌우 잘림과 iPad 의 위아래 잘림을 모두 피한 영역이다. 앱 코드로 계산한 값이고 기기로 재 본 값은 아니다.
 */
export const BANNER_SIZE = { width: 1444, height: 272 };
export const BANNER_SAFE = { width: 1364, height: 160 };
const BANNER_MIN_WIDTH = 1083; // 기준 폭 361 의 3배. 3배 화면에서 이보다 작으면 흐려 보인다
const BANNER_RATIO_TOLERANCE = 0.08;

/** 올린 이미지가 권장 크기에서 벗어났으면 까닭을 돌려준다. 올리는 걸 막지는 않는다. */
export function checkBannerSize(width: number, height: number) {
  const ratio = width / height;
  const target = BANNER_SIZE.width / BANNER_SIZE.height;
  const size = `${width} × ${height}px`;
  const recommended = `${BANNER_SIZE.width} × ${BANNER_SIZE.height}px`;
  if (Math.abs(ratio - target) / target > BANNER_RATIO_TOLERANCE) {
    return `이 이미지는 ${size}라 ${ratio < target ? "위아래" : "좌우"}가 많이 잘려요. 권장 크기는 ${recommended}예요.`;
  }
  if (width < BANNER_MIN_WIDTH) return `이 이미지는 ${size}라 흐려 보일 수 있어요. 권장 크기는 ${recommended}예요.`;
  return null;
}

export type BannerImage = { name: string; url: string; updated: string };

/** Firebase Storage 내려받기 주소. 앱이 이 주소로 이미지를 읽는다. */
export const bannerImageUrl = (bucket: string, name: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media&token=${token}`;

/** 우리 저장소의 banners 폴더 이미지인가. 서버가 다른 주소를 앱에 내보내지 않게 확인한다. */
export const isOurBannerUrl = (url: string, bucket: string) =>
  url.startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(BANNER_PREFIX)}`);

// ── 이벤트 증거 사진 ─────────────────────────────────────

export const EVIDENCE_PREFIX = "evidence/";
/** 앱은 디스크에 저장하지 않아 켤 때마다 다시 받는다. 현장 통신을 생각해 배너보다 작게 막는다. */
export const MAX_EVIDENCE_BYTES = 1024 * 1024;
/** 비율 범위와 배치 규칙은 앱의 lib/features/game/domain/event_evidence_layout.dart 와 같아야 한다. */
export const EVIDENCE_MIN_RATIO = 9 / 16;
export const EVIDENCE_MAX_RATIO = 16 / 9;
const EVIDENCE_RATIO_TOLERANCE = 0.02;
// 사진 영역이 가장 커지는 1장 배치에서도 흐려 보이지 않을 짧은 변
const EVIDENCE_MIN_SHORT_SIDE = 600;
// 앱은 원본 크기로 펼쳐 메모리에 둔다. 파일이 1MB 아래여도 해상도가 크면 게임 중에 메모리를 크게 쓴다
const EVIDENCE_MAX_LONG_SIDE = 2400;

/** 우리 저장소의 evidence 폴더 이미지인가. 서버가 다른 주소를 앱에 내보내지 않게 확인한다. */
export const isOurEvidenceUrl = (url: string, bucket: string) =>
  url.startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(EVIDENCE_PREFIX)}`);

/** 비율이나 해상도가 범위를 벗어난 사진은 올리기 전에 막는다. 아니면 null. */
export function checkEvidenceImage(width: number, height: number) {
  const ratio = width / height;
  if (ratio < EVIDENCE_MIN_RATIO * (1 - EVIDENCE_RATIO_TOLERANCE) || ratio > EVIDENCE_MAX_RATIO * (1 + EVIDENCE_RATIO_TOLERANCE)) {
    return `이 사진은 ${width} × ${height}px라 너무 길어요. 비율을 9:16에서 16:9 사이로 맞춰 주세요.`;
  }
  if (Math.max(width, height) > EVIDENCE_MAX_LONG_SIDE) {
    return `이 사진은 ${width} × ${height}px라 너무 커요. 긴 쪽을 ${EVIDENCE_MAX_LONG_SIDE}px 아래로 줄여 주세요.`;
  }
  return null;
}

/** 작아서 흐려 보일 수 있으면 까닭을 돌려준다. 올리는 걸 막지는 않는다. */
export function checkEvidenceSharpness(width: number, height: number) {
  if (Math.min(width, height) < EVIDENCE_MIN_SHORT_SIDE) return `이 사진은 ${width} × ${height}px라 흐려 보일 수 있어요.`;
  return null;
}

/** 사진들은 비율이 같아야 칸이 맞는다. */
export const isSameEvidenceRatio = (a: number, b: number) => Math.abs(a - b) / a <= EVIDENCE_RATIO_TOLERANCE;

/** 앞에서부터 빈 값을 만나기 전까지가 사진이다. 앱의 eventEvidenceUrlsFrom 과 같다. */
export function evidenceUrls(values: Pick<AppConfigValues, (typeof EVIDENCE_KEYS)[number]>) {
  const urls: string[] = [];
  for (const key of EVIDENCE_KEYS) {
    if (!values[key]) break;
    urls.push(values[key]);
  }
  return urls;
}

export type EvidenceArrangement = "single" | "sideBySide" | "stacked" | "twoOverOne";

/**
 * 결과 보드 배치. 앱과 같은 계산으로 옆 폰에 그린다. 한 보드의 칸은 모두 같은 크기다.
 * 기본값은 393 x 852 기준의 사진 영역이다(폭 281 = 393 - 팝업 여백 112, 높이 383 = 852 의 45%).
 */
export function evidenceLayout(aspectRatio: number, count: number, maxWidth = 281, maxHeight = 383.4, gap = 16) {
  const ratio = Math.min(Math.max(aspectRatio, EVIDENCE_MIN_RATIO), EVIDENCE_MAX_RATIO);
  const size = (height: number) => ({ width: height * ratio, height });
  if (count <= 1) {
    const width = Math.min(maxWidth, maxHeight * ratio);
    return { arrangement: "single" as EvidenceArrangement, ...size(width / ratio) };
  }
  if (ratio < 1) {
    const width = (maxWidth - gap * (count - 1)) / count;
    return { arrangement: "sideBySide" as EvidenceArrangement, ...size(Math.min(width / ratio, maxHeight)) };
  }
  const height = (count >= 3 ? (maxWidth - gap) / 2 / ratio : maxWidth / ratio);
  return {
    arrangement: (count >= 3 ? "twoOverOne" : "stacked") as EvidenceArrangement,
    ...size(Math.min(height, (maxHeight - gap) / 2)),
  };
}

/** 파일 앞부분으로 실제 이미지 종류를 가린다. 아니면 null. */
export function sniffImageType(b: Uint8Array): BannerImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export type AppConfigHistoryItem = {
  number: string;
  updateTime: string;
  description: string;
  email: string;
};

/** 서버 경로가 화면에 주는 값. */
export type AppConfigState = {
  values: AppConfigValues;
  conditioned: AppConfigKey[];
  etag: string;
  history: AppConfigHistoryItem[];
  /** 앱스토어에 올라간 버전. 읽지 못하면 null */
  appStoreVersion: string | null;
  /** 저장해도 되는 환경인가. 운영 배포에서만 true 다. */
  writable: boolean;
  /** 로컬 목 데이터면 mock. 화면이 실제 값이 아니라고 알려 준다. */
  source: "firebase" | "mock";
};
