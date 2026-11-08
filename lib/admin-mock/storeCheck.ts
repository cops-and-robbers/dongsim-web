// 로컬에서 스토어 점검을 보는 가짜 값. 실제 스토어와 Supabase 에 닿지 않는다.
import { manualChecks, playChecks, reviewCheck, sortChecks, territoryChecks, versionChecks, EU_TERRITORIES, type StoreCheck } from "@/lib/store-check/model";

const link = { href: "/admin/store-page", label: "스토어 페이지 열기" };
const outer = { href: "https://appstoreconnect.apple.com", label: "App Store Connect 열기", external: true };
const done = new Map<string, { doneBy: string; doneAt: string }>();

export function mockStoreCheck(): StoreCheck {
  const checks = [
    ...territoryChecks([...EU_TERRITORIES.map((code) => ({ code, available: true, statuses: ["AVAILABLE"] })), { code: "AFG", available: true, statuses: ["CANNOT_SELL", "CANNOT_SELL_CONTESTS"] }], outer),
    ...versionChecks({ version: "3.2.8", build: null, hasReviewContact: true, emptyWhatsNew: ["ko", "en", "ja"], noScreenshots: [], changedFields: 12, drafts: 1 }, { console: outer, page: link }),
    ...playChecks({ pendingLangs: ["en"], drafts: 0, crashRate: null, anrRate: 0.0012, anomalies: 0 }, { publishing: outer, page: link, vitals: outer }),
    ...reviewCheck(2),
    ...manualChecks(
      [
        { id: "apple-license", store: "ios", title: "애플 개발자 프로그램 약관에 동의해 주세요", detail: "계정 소유자만 할 수 있어요.", link: outer },
        { id: "play-trader", store: "android", title: "Google Play 판매자 상태를 신고해 주세요", detail: "기한을 넘기면 업데이트가 막힐 수 있어요.", due: "2027-02-01", link: outer },
        { id: "iphone-duo", store: "ios", title: "iPhone Duo 스크린샷을 준비해 주세요", detail: "2027년 4월부터 필요해요.", due: "2027-04-01", link: outer },
      ],
      done,
      new Date(),
    ),
  ];
  return { checks: sortChecks(checks), readAt: new Date().toISOString(), writable: true };
}

export function mockPatchCheck(body: { id: string; done: boolean }): { ok: true } {
  if (body.done) done.set(body.id, { doneBy: "로컬 관리자", doneAt: new Date().toISOString() });
  else done.delete(body.id);
  return { ok: true };
}
