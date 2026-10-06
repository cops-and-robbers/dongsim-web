/**
 * 구글 플레이 출시 전 자동 테스트 기기로 보이는 기록 (#157).
 *
 * 새 버전을 플레이에 올릴 때마다 출시 전 보고서가 기기 몇 대로 앱을 연다. 그 기록이 실제 사용자처럼 첫 실행, 로그인에
 * 섞여 2026-09 안드로이드 첫 실행의 3분의 2를 차지했다. 처음엔 한국과 일본만 세서 피했는데, 그러면 진짜 해외 사용자
 * (인도에서 4명 중 3명이 게임했다)까지 빠져서, 나라가 아니라 기기 특징으로 뺀다.
 *
 * 기준(Android 만. iOS 에는 출시 전 자동 테스트가 없다)
 * 1. 나라 미상((not set))
 * 2. 기기 모델 미상이면서 Android 11 (출시 전 테스트 기기가 Android 11 로 돈다)
 * 6/12~10/5 에 두 기준에 걸린 첫 실행 199명 중 방에 들어간 사람은 0명이었다(진짜 사용자를 잃지 않는다).
 * "기기 모델 미상"만으로 빼면 한국의 진짜 사용자 9명이 같이 빠져서 Android 11 을 같이 건다.
 *
 * 남은 의심: 미국의 기기 모델 미상(Android 16), Pixel 6 Pro(Android 12) 첫 실행은 로그인이 0명이라 테스트 기기일 수 있지만
 * 위만큼 확실하지 않아 아직 빼지 않는다(9/8~9/21 에 19명). 계속 쌓이면 기준을 더한다.
 */

const eq = (fieldName: string, value: string) => ({ filter: { fieldName, stringFilter: { matchType: "EXACT", value } } });

/** GA4 Data API FilterExpression: 테스트 기기로 보이는 기록 */
export const TEST_DEVICE = {
  andGroup: {
    expressions: [
      eq("platform", "Android"),
      { orGroup: { expressions: [eq("countryId", "(not set)"), { andGroup: { expressions: [eq("mobileDeviceModel", "(not set)"), eq("operatingSystemVersion", "11")] } }] } },
    ],
  },
};

/** 테스트 기기가 아닌 기록 */
export const NOT_TEST_DEVICE = { notExpression: TEST_DEVICE };

/** 화면과 리포트에 밝히는 기준 */
export const TEST_DEVICE_RULE =
  "구글 플레이는 새 버전을 올릴 때마다 자동 테스트 기기로 앱을 열어요. Android 에서 나라를 알 수 없거나, 기기 모델을 알 수 없으면서 Android 11 인 기록이 그 기기라 뺐어요. 이 기록 중 방에 들어간 사람은 한 명도 없었어요.";
