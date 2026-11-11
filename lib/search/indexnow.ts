/**
 * IndexNow (#309). 새 주소나 바뀐 주소를 빙, 네이버 등에 바로 알린다.
 *
 * 한 곳에 보내면 참여한 검색엔진끼리 나눠 갖는다(지금: Bing, Yandex, Seznam, Naver, Yep, Internet Archive, Amazonbot,
 * indexnow.org/searchengines.json 2026-11-11 확인). 구글은 참여하지 않는다.
 * 키는 공개되는 값이다(키 파일을 사이트에 올려 소유를 증명한다). 그래도 저장소에는 두지 않고 환경변수로 받는다.
 */

import { INDEXNOW_KEY_URL, SITE } from "./config.ts";

const ENDPOINT = "https://api.indexnow.org/indexnow";
/** 한 번에 보낼 수 있는 주소 수(명세 10,000개) */
const MAX_URLS = 10_000;

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  // 명세: 8~128자, 영문과 숫자, 대시
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

/** 우리 사이트 주소만 남기고 중복을 뺀다. 다른 호스트가 섞이면 요청 전체가 거절된다 */
export function indexNowBody(urls: string[], key: string) {
  const host = new URL(SITE).host;
  const list = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return { host, key, keyLocation: INDEXNOW_KEY_URL, urlList: list.slice(0, MAX_URLS) };
}

/** 200, 202 는 받았다는 뜻이다(202 는 키 확인 전). 그 밖은 실패로 던진다 */
export async function sendIndexNow(urls: string[]): Promise<number> {
  const key = indexNowKey();
  if (!key) throw new Error("INDEXNOW_KEY 환경변수가 없거나 형식이 달라요");
  const body = indexNowBody(urls, key);
  if (body.urlList.length === 0) return 0;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow HTTP ${res.status}`);
  return body.urlList.length;
}
