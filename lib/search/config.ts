/** 검색 색인 현황(#309)에서 쓰는 값. 비밀이 아닌 값만 둔다. 키는 환경변수에 있다 */

/** 서치 콘솔 속성. 도메인 속성이라 sc-domain: 으로 시작한다 */
export const SEARCH_PROPERTY = "sc-domain:copsandrobbers.app";

export const SITE = "https://copsandrobbers.app";
export const SITEMAP_URL = `${SITE}/sitemap.xml`;
/** IndexNow 키 파일 주소. 키는 INDEXNOW_KEY 환경변수, 파일은 app/indexnow-key.txt 라우트가 내준다 */
export const INDEXNOW_KEY_URL = `${SITE}/indexnow-key.txt`;

/** 새로 생긴 주소를 따라가는 기간과, 이만큼 지나도 안 되면 사람을 부르는 날 */
export const TRACK_DAYS = 30;
export const NUDGE_DAYS = 7;

/** 하루에 검사할 주소 수의 상한. 구글 한도(사이트당 하루 2,000건)보다 한참 아래로 둔다 */
export const MAX_INSPECTIONS = 300;

/**
 * 앱 이름으로 찾은 검색. "경찰과 도둑"과 "경도"는 놀이 이름이기도 해서, 그것만으로는 우리를 알고 찾았는지 모른다.
 * 앱, 어플, 다운 같은 말이 같이 있거나 팀 이름, 영문 이름일 때만 센다
 */
export function isBrandQuery(query: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (/동심지키미|copsandrobbers|copsnrobbers/.test(q)) return true;
  const name = /경찰과도둑|경찰도둑|경도|copsandrobber|ケイドロ|けいどろ/.test(q);
  const app = /앱|어플|app|다운|설치|アプリ/.test(q);
  return name && app;
}

/** 평균 게재순위 8~20위. 제목과 내용이 검색어에 맞는지 살펴볼 만한 검색어(위치를 단정하지 않고 숫자로 부른다) */
export const NEAR_PAGE_ONE = { from: 8, to: 20 } as const;
