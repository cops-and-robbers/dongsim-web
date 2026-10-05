/**
 * 인스타 성과 수집에서 쓰는 모양 (#140).
 *
 * 이 폴더의 파일들은 Next 밖에서도(node --test, 수동 실행 스크립트) 그대로
 * 돌아야 해서, 서로를 상대 경로 + `.ts` 확장자로 부르고 타입은 `import type`
 * 으로만 가져온다. 별칭(@/)을 쓰거나 타입을 import type 없이 가져오면
 * node 의 타입 지우기 실행에서 깨진다 (imports.test.mjs 가 잡는다).
 */

export type ProductType = "FEED" | "REELS";

/** 게시물 기본 정보. 인스타 /me/media 응답을 우리 이름으로 옮긴 것. */
export type Media = {
  id: string;
  permalink: string;
  caption: string | null;
  mediaType: string;
  productType: ProductType;
  postedAt: string; // ISO
};

/**
 * 게시물 누적 지표 한 벌. 인스타가 그 종류에 주지 않는 지표는 null 이다
 * (릴스는 프로필 방문, 팔로우, 링크 클릭이 없고, 피드는 시청 지표가 없다).
 */
export type MediaMetrics = {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  totalInteractions: number | null;
  profileVisits: number | null;
  follows: number | null;
  bioLinkClicks: number | null;
  avgWatchMs: number | null;
  totalWatchMs: number | null;
  skipRate: number | null;
};

/** 게시물 + 가장 최근 누적값. 리포트와 순위 계산의 입력이다. */
export type MediaWithLatest = Media & { latest: MediaMetrics | null };

/** 계정 전체 하루 지표. day 는 인스타 기준(미국 서부 시간) 날짜다. */
export type AccountDay = {
  day: string; // YYYY-MM-DD
  dayStart: string; // ISO - 미국 서부 자정
  dayEnd: string; // ISO - 다음 날 미국 서부 자정
  reach: number | null;
  views: number | null;
  profileViews: number | null;
  websiteClicks: number | null;
  accountsEngaged: number | null;
  totalInteractions: number | null;
};

/** 직전 수집 이후 조회가 늘어난 양. 급상승 알림에서 "어느 게시물 때문인지"를 짚는다. */
export type ViewGain = {
  media: Media;
  gained: number;
  /** ISO - 비교한 기준 시각. 그 하루가 시작되기 전 마지막 수집, 그 뒤에 올린 게시물이면 올린 시각 */
  since: string;
};

/** 게시물 누적값 기록 한 줄에서 급상승 판단에 쓰는 부분 */
export type ViewRecord = { capturedOn: string; capturedAt: string; views: number | null };
