// 로컬에서 변경 기록 화면(#313)을 만져 보는 가짜 기록. 칸 모양(값, 긴 문구, 목록, 그림, 그림 목록, 실행)을 하나씩 담는다.
import type { Change } from "@/lib/changes/model";

const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

const DESCRIPTION_BEFORE = "경찰과 도둑은 친구와 함께 동네를 뛰어다니는 GPS 술래잡기예요.\n방을 만들고 링크를 보내면 바로 시작해요.";
const DESCRIPTION_AFTER = "경찰과 도둑은 친구와 같이 동네를 뛰어다니는 GPS 술래잡기예요.\n방을 만들고 링크나 QR 을 보내면 바로 시작해요. 최대 50명까지 함께해요.";

const CHANGES: Change[] = [
  {
    id: "m1",
    at: ago(1),
    actor: "찬빈",
    area: "app-config",
    target: "앱 설정",
    action: "edit",
    fields: [
      { kind: "value", label: "점검", before: "꺼짐", after: "켜짐" },
      { kind: "value", label: "점검 안내 문구", before: null, after: "서버 점검 중이에요. 오후 3시에 다시 만나요." },
    ],
    impact: true,
  },
  {
    id: "m2",
    at: ago(2),
    actor: "상희",
    area: "store-page",
    target: "App Store 한국어 설명 초안",
    action: "edit",
    fields: [{ kind: "value", label: "설명", before: DESCRIPTION_BEFORE, after: DESCRIPTION_AFTER }],
    href: "/admin/store-page",
  },
  {
    id: "m3",
    at: ago(3),
    actor: "상희",
    area: "store-page",
    target: "App Store 한국어 iPhone 스크린샷 초안",
    action: "edit",
    fields: [
      {
        kind: "images",
        label: "iPhone 스크린샷",
        added: [{ id: "n1", url: "/photobooth/frame-green.png", name: "행사 컷.png" }],
        removed: [{ id: "s3", url: "/characters/police-chase.svg", name: "스토어 3번" }],
      },
    ],
    href: "/admin/store-page",
  },
  {
    id: "m4",
    at: ago(5),
    actor: "디자이너",
    area: "assets",
    target: "QR 아이콘 경도 앱 아이콘 (둥근)",
    action: "add",
    fields: [{ kind: "image", label: "그림", before: null, after: "/qr-print/icons/app.png" }],
    href: "/admin/assets",
  },
  {
    id: "m5",
    at: ago(26),
    actor: "찬빈",
    area: "event",
    target: "서울 게임 타운",
    action: "edit",
    fields: [
      { kind: "value", label: "부스 여는 시각", before: "11/22 (일) 낮 12시", after: "11/22 (일) 오전 11시 30분" },
      { kind: "value", label: "장소", before: null, after: "판교 투썸월드 B1" },
      { kind: "list", label: "쓸 프레임", added: ["겨울 프레임"], removed: ["초록 기본"] },
      { kind: "value", label: "부스 닫기", before: "운영 시간대로", after: "닫음" },
      { kind: "value", label: "행사 보기 버튼 주소", before: "https://seoulgametown.com/", after: "https://seoulgametown.com/2026" },
    ],
    href: "/admin/events/7",
    impact: true,
  },
  {
    id: "m6",
    at: ago(27),
    actor: "찬빈",
    area: "release",
    target: "iOS 3.2.9 심사에 내기",
    action: "run",
    fields: [],
    href: "/admin/release",
    status: "done",
  },
  {
    id: "m7",
    at: ago(28),
    actor: "찬빈",
    area: "release",
    target: "Android 3.2.9 출시 비율 바꾸기",
    action: "run",
    fields: [{ kind: "value", label: "출시 비율", before: null, after: "20%" }],
    href: "/admin/release",
    impact: true,
    status: "failed",
    note: "Play 출시 목록 한도에 걸렸어요. 10분 뒤 다시 해 주세요.",
  },
  {
    id: "m8",
    at: ago(50),
    actor: "민지",
    area: "team",
    target: "역할 마케팅",
    action: "edit",
    fields: [
      { kind: "value", label: "설명", before: "유입, 스토어, 인스타", after: "유입, 스토어, 인스타, 당근 광고" },
      { kind: "list", label: "개요 기본 카드", added: ["당근 광고"], removed: ["사이트 방문"] },
    ],
    href: "/admin/team",
  },
  {
    id: "m9",
    at: ago(52),
    actor: "민지",
    area: "schedule",
    target: "11/03 인스타 릴스 광고",
    action: "add",
    fields: [
      { kind: "value", label: "이름", before: null, after: "인스타 릴스 광고" },
      { kind: "value", label: "성격", before: null, after: "홍보" },
    ],
    href: "/admin/schedule?day=2026-11-03",
  },
  {
    id: "m10",
    at: ago(53),
    actor: "민지",
    area: "reviews",
    target: "답변 문구 낮은 별점 사과",
    action: "remove",
    fields: [
      { kind: "value", label: "이름", before: "낮은 별점 사과", after: null },
      { kind: "value", label: "한국어 문구", before: "{이름}님, 불편을 드려 죄송해요.", after: null },
    ],
    href: "/admin/reviews",
  },
  {
    id: "m11",
    at: ago(76),
    actor: "찬빈",
    area: "webgame",
    target: "온라인 게임 입구",
    action: "edit",
    fields: [
      { kind: "value", label: "누가 들어올 수 있나", before: "공개 전", after: "누구나" },
      { kind: "value", label: "안내 문구", before: "곧 열려요", after: null },
    ],
    impact: true,
  },
  { id: "m12", at: ago(80), actor: "상희", area: "company", target: "2026 대학생 창업 아이템 경진대회 대상", action: "add", fields: [], href: "/admin/company" },
  {
    id: "m13",
    at: ago(24 * 12),
    actor: "찬빈",
    area: "store-page",
    target: "iOS 스토어에 보내기 (3칸)",
    action: "run",
    fields: [{ kind: "list", label: "보낸 칸", added: ["한국어 이름", "한국어 부제", "English 이름"], removed: [] }],
    href: "/admin/store-page",
    impact: true,
    status: "done",
  },
];

export function mockChanges(days: number): { days: number; changes: Change[]; missing: string[] } {
  const from = Date.now() - days * 86_400_000;
  return { days, changes: CHANGES.filter((c) => Date.parse(c.at) >= from), missing: [] };
}
