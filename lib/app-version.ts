// 스토어에 실제로 배포된 앱 버전을 조회하는 서버 전용 유틸.
//
// 레포의 version.yml은 "개발이 어디까지 왔나"라서 심사 통과 시점과 어긋난다.
// 사용자가 지금 받을 수 있는 버전은 iTunes Lookup(공개 API, 키 불필요)이 정본이다.
// 안드로이드는 마땅한 공개 API가 없어 iOS 라이브 버전을 기준으로 삼는다.

const ITUNES_LOOKUP_URL =
  "https://itunes.apple.com/lookup?bundleId=com.elipair.copsandrobbers&country=kr";

/**
 * v3 안내 모달 수동 오버라이드.
 * - "auto": 스토어 라이브 버전이 v3 이상이면 노출 (기본)
 * - "on": 스토어와 무관하게 강제 노출
 * - "off": 킬스위치 - 문제가 생기면 이 값만 바꿔 배포한다
 */
const V3_ANNOUNCEMENT_OVERRIDE: "auto" | "on" | "off" = "auto";

/** 스토어 라이브 버전의 major를 돌려준다. 조회 실패 시 null. */
async function getLiveAppMajor(): Promise<number | null> {
  try {
    // 한 시간 캐시 - 심사 통과 후 최대 한 시간 안에 자동으로 반영된다.
    const res = await fetch(ITUNES_LOOKUP_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { version?: string }[];
    };
    const major = Number(data.results?.[0]?.version?.split(".")[0]);
    return Number.isFinite(major) ? major : null;
  } catch {
    return null;
  }
}

/** v3 안내 모달을 노출할지. 조회 실패 시에는 띄우지 않는 쪽으로 기운다. */
export async function isV3AnnouncementLive(): Promise<boolean> {
  if (V3_ANNOUNCEMENT_OVERRIDE === "on") return true;
  if (V3_ANNOUNCEMENT_OVERRIDE === "off") return false;
  const major = await getLiveAppMajor();
  return major !== null && major >= 3;
}
