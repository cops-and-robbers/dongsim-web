// 로컬에서 앱 설정 화면을 만져 보는 가짜 Firebase. dev 에서는 MSW 가 이 값으로 답해 실제 Remote Config 에 닿지 않는다.
// 값은 2026-11-02 콘솔의 실제 구조와 같다.
import {
  describeForHistory,
  diffAppConfig,
  mergeTemplate,
  readAppConfig,
  validateChanges,
  type AppConfigChanges,
  type AppConfigHistoryItem,
  type AppConfigState,
  type BannerImage,
  type RemoteConfigTemplate,
} from "@/lib/admin/appConfig";

const value = (v: string) => ({ defaultValue: { value: v } });

const banner = (name: string): BannerImage => ({ name, url: `https://copsandrobbers.app/brand/${name}`, updated: "2026-09-21T00:00:00Z" });

/** 로컬에서는 실제로 올리지 않고 이미 있는 그림을 올린 것처럼 돌려준다. */
export const mockUploadBanner = (): BannerImage => ({ ...banner("icon-512.png"), name: `upload-${Date.now()}` });

let version = 92;
let template: RemoteConfigTemplate = {
  parameters: {
    maintenance: value("false"),
    maintenance_message: value("2026-09-17 : 13:00"),
    latest_version: value("3.2.6"),
    minimum_version: value("3.2.1"),
    force_update: value("true"),
    ads_enabled: value("true"),
    community_ads_enabled: value("true"),
    game_end_ads_enabled: value("true"),
    banner_enabled: value("true"),
    banner_image_url: value(banner("header-logo.svg").url),
    banner_link_url: value("https://www.instagram.com/dongsim_protector"),
    event_evidence_image_1_url: value(""),
    event_evidence_image_2_url: value(""),
    event_evidence_image_3_url: value(""),
  },
};
const history: AppConfigHistoryItem[] = [
  { number: "92", updateTime: "2026-11-01T15:00:00Z", description: "", email: "console@example.com" },
  { number: "91", updateTime: "2026-11-01T14:37:00Z", description: "", email: "console@example.com" },
];

const etag = () => `etag-mock-${version}`;

export const mockAppConfig = (): AppConfigState => ({
  ...readAppConfig(template),
  etag: etag(),
  history: history.slice(0, 5),
  appStoreVersion: "3.2.6",
  writable: true,
  source: "mock",
});

export type MockResult = { status: number; body: unknown };

export function mockApplyAppConfig(sentEtag: string, requested: AppConfigChanges): MockResult {
  if (sentEtag !== etag()) return { status: 409, body: { error: "다른 사람이 먼저 바꿨어요. 최신 값을 불러왔으니 다시 확인해 주세요." } };
  const { values } = readAppConfig(template);
  const changes = diffAppConfig(values, requested);
  const errors = validateChanges(values, changes);
  const first = Object.values(errors)[0];
  if (first) return { status: 400, body: { error: first, errors } };
  if (Object.keys(changes).length > 0) {
    const description = describeForHistory("로컬 관리자", values, changes);
    template = mergeTemplate(template, changes, description);
    version += 1;
    history.unshift({ number: String(version), updateTime: new Date().toISOString(), description, email: "" });
  }
  return { status: 200, body: mockAppConfig() };
}
