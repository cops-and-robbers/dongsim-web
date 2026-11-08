/**
 * 저장소를 못 읽는 빌드와 로컬 개발에서만 쓰는 값 (#250). 운영 사이트는 이 값을 보여 주지 않는다(직전 정상 페이지를 유지한다).
 * 실명 명단은 여기 두지 않는다. 코드에 남기면 본인 요청으로 지운 이름이 되살아난다. 로컬 확인용 이름은 전부 지어낸 것이다.
 */
import type { CompanyRecord, CreditPerson, RecordKind } from "./model.ts";

const row = (id: number, kind: RecordKind, occurredOn: string, precision: "day" | "month", ko: string, en: string, ja: string, badge?: [string, string, string]): CompanyRecord => ({
  id,
  kind,
  occurredOn,
  precision,
  title: { ko, en, ja },
  badge: badge ? { ko: badge[0], en: badge[1], ja: badge[2] } : { ko: "", en: "", ja: "" },
  visible: true,
  eventId: null,
  attendees: [],
  version: 1,
  updatedBy: "",
  updatedAt: "",
});

export const FALLBACK_RECORDS: CompanyRecord[] = [
  row(1, "qa", "2026-03-24", "day", "경찰과 도둑 1차 QA 진행", "Cops and Robbers - first QA round", "ケイドロ 第1回QA実施"),
  row(2, "milestone", "2026-04-08", "day", "동심지키미 설립", "Team Dongsim founded", "チーム・トンシム設立"),
  row(3, "qa", "2026-04-28", "day", "경찰과 도둑 2차 QA 진행", "Cops and Robbers - second QA round", "ケイドロ 第2回QA実施"),
  row(4, "event", "2026-07-04", "day", "서울게임타운 박람회 ‘경찰과 도둑’ 부스 참여", "Seoul Game Town Expo - Cops and Robbers booth", "ソウルゲームタウン博覧会「ケイドロ」ブース出展"),
  row(5, "award", "2026-05-08", "day", "세종 창업 아이디어 리그", "Sejong Startup Idea League", "世宗 創業アイデアリーグ", ["대상", "Grand Prize", "大賞"]),
  row(6, "award", "2026-03-06", "day", "세종대학교 아롬 데모데이", "Sejong University Arom Demo Day", "世宗大学 アロム・デモデー", ["특별상", "Special Award", "特別賞"]),
  row(7, "award", "2026-07-01", "month", "세종대학교 하반기 입주공모전", "Sejong University H2 Residency Contest", "世宗大学 下半期入居コンペ", ["우수 창업 아이템상", "Outstanding Startup Project", "優秀創業アイテム賞"]),
  row(8, "selection", "2026-07-01", "month", "세종대학교 창업 동아리 SSUP", "Sejong University startup club SSUP", "世宗大学 創業サークルSSUP", ["선정", "Accepted", "選定"]),
  row(9, "award", "2026-10-01", "month", "세종대학교 창업아이템 경진대회", "Sejong University Startup Idea Competition", "世宗大学 創業アイデアコンテスト", ["우수상", "Excellence Award", "優秀賞"]),
];

const person = (id: number, name: string, priorCount: number, github = "", role: "qa" | "infra" = "qa"): CreditPerson => ({
  id,
  name,
  role,
  github,
  priorCount,
  visible: true,
  version: 1,
  updatedBy: "",
  updatedAt: "",
});

/** 로컬에서 화면을 보려고 지어낸 이름 */
export const SAMPLE_PEOPLE: CreditPerson[] = [
  person(1, "홍길동", 1, "octocat", "infra"),
  person(2, "박예시", 3, "octocat"),
  person(3, "최샘플", 2, "octocat"),
  person(4, "정가상", 2),
  person(5, "한테스트", 1, "octocat"),
  person(6, "오임시", 1),
  person(7, "윤연습", 1),
  person(8, "강견본", 1),
];
