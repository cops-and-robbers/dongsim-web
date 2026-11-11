/**
 * 화면에 보일 페이지 이름 (#309). 주소(/blog/honey-tips) 대신 사람이 부르는 이름을 쓴다.
 * 블로그 글은 글 제목, 고정 페이지는 사이트 메뉴와 같은 이름, 모집글은 번호.
 */

import type { Locale } from "./status.ts";

const PAGES: Record<string, string> = {
  "/": "홈",
  "/game": "하는 법",
  "/play": "체험",
  "/online": "온라인 게임",
  "/team": "팀 소개",
  "/team/members": "구성원",
  "/blog": "이야기 목록",
  "/community": "모임",
  "/download": "다운로드",
  "/event": "행사",
  "/terms": "이용약관",
  "/privacy": "개인정보 처리방침",
  "/location": "위치정보 이용약관",
  "/marketing": "마케팅 수신 동의",
  "/licenses": "오픈소스 라이선스",
};

export const LANGUAGE: Record<Locale, string> = { ko: "한국어", en: "영어", ja: "일본어" };

/** 언어 접두어를 뗀 경로 */
export function basePath(path: string): string {
  const p = path.replace(/^\/(en|ja)(?=\/|$)/, "");
  return p === "" ? "/" : p;
}

/**
 * titles 의 키는 "언어/슬러그"(ko/honey-tips). 모르는 주소는 경로를 그대로 둔다
 */
export function pageName(path: string, locale: Locale, titles: Map<string, string> = new Map()): string {
  const base = basePath(path);
  const blog = base.match(/^\/blog\/(.+)$/);
  if (blog) return titles.get(`${locale}/${blog[1]}`) ?? decodeURIComponent(blog[1]).replace(/-/g, " ");
  const meetup = base.match(/^\/g\/(\d+)$/);
  if (meetup) return `모집글 ${meetup[1]}`;
  return PAGES[base] ?? path;
}
