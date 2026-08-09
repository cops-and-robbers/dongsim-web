// 어드민 표시용 포맷·라벨. enum 값을 한국어 라벨로, ISO 문자열을 KST로.

const KST = "Asia/Seoul";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const total = Math.round(seconds); // BE 평균(AVG)은 소수라 먼저 정수 초로 반올림
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

export const SOCIAL_LABEL: Record<string, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  APPLE: "애플",
};

export const ROLE_LABEL: Record<string, string> = {
  USER: "일반",
  ADMIN: "운영자",
};

export const DEVICE_LABEL: Record<string, string> = {
  IOS: "iOS",
  ANDROID: "안드로이드",
};

export const TEAM_LABEL: Record<string, string> = {
  POLICE: "경찰",
  ROBBER: "도둑",
};

export const PARTICIPANT_STATUS_LABEL: Record<string, string> = {
  WAITING: "대기",
  ALIVE: "생존",
  JAILED: "수감",
  POLICE_WAITING: "경찰 대기",
};

export const GAME_STATUS_LABEL: Record<string, string> = {
  WAITING: "대기중",
  IN_PROGRESS: "진행중",
  FINISHED: "종료",
  CANCELED: "취소",
};

export const END_REASON_LABEL: Record<string, string> = {
  ALL_ARRESTED: "전원 체포",
  TIME_OVER: "시간 종료",
  POLICE_FORFEITED: "경찰 기권", // 경찰이 다 나가서 도둑 승
  ROBBER_FORFEITED: "도둑 기권", // 생존 도둑이 다 나가서 경찰 승
};

export const REPORT_TYPE_LABEL: Record<string, string> = {
  FISHING: "낚시/놀람/도배",
  VERBAL_ABUSE: "욕설/비하",
  IMPERSONATION: "사칭/사기",
  SPAM: "광고/스팸",
  CHEATING: "부정행위/버그악용",
  DEMORALIZATION: "팀 사기 저하",
  ETC: "기타",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: "미처리",
  RESOLVED: "처리 완료",
  DISMISSED: "반려",
};

export const BUG_STATUS_LABEL: Record<string, string> = {
  PENDING: "미처리",
  RESOLVED: "처리 완료",
};

export function labelOf(
  map: Record<string, string>,
  value: string | null | undefined
): string {
  if (!value) return "-";
  return map[value] ?? value;
}
