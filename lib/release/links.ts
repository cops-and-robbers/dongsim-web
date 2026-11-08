/**
 * 출시 보드에서 단계마다 여는 콘솔 화면. 비밀이 아닌 식별자라 코드에 둔다.
 *
 * Play 주소에는 계정 번호(/u/1) 대신 authuser=팀 계정 이메일을 붙인다. 계정 번호는 사람마다 로그인 순서가 달라 틀리고,
 * 아무것도 안 붙이면 첫 번째 구글 계정(개인 계정)으로 열려 "개발자 계정 만들기"가 뜬다(2026-11-08 확인).
 * authuser 를 붙이면 구글이 그 계정의 번호로 바꿔 열고, 로그인돼 있지 않으면 그 계정으로 로그인하라고 한다
 */
import { APPSTORE_APP_ID } from "../metrics/config.ts";

/** Play Console 개발자 계정과 앱 번호(콘솔 주소에 보이는 숫자) */
export const PLAY_DEVELOPER_ID = "4626757952381400177";
export const PLAY_CONSOLE_APP_ID = "4973545352049158991";
/** Play Console 을 쓰는 팀 구글 계정. 사이트 법적 문서의 연락처로 이미 공개된 주소다 */
export const PLAY_ACCOUNT = "copsnro66ers@gmail.com";

export function consoleLinks() {
  const asc = `https://appstoreconnect.apple.com/apps/${APPSTORE_APP_ID}/distribution`;
  const play = `https://play.google.com/console/developers/${PLAY_DEVELOPER_ID}/app/${PLAY_CONSOLE_APP_ID}`;
  return {
    /** 진행 중인 iOS 버전 화면(빌드 붙이기, 제출, 출시) */
    iosInflight: `${asc}/ios/version/inflight`,
    /** 나가 있는 iOS 버전 화면(단계적 출시) */
    iosVersions: `${asc}/ios/version/deliverable`,
    /** Play 게시 개요(검토로 보내기, 관리형 게시의 게시) */
    playPublishing: `${play}/publishing?authuser=${PLAY_ACCOUNT}`,
    /** Play 프로덕션 트랙(새 버전 만들기, 단계적 출시 비율) */
    playProduction: `${play}/tracks/production?authuser=${PLAY_ACCOUNT}`,
  };
}
