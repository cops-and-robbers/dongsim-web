/**
 * 어드민 게임과 유저 화면에 얹는 무전 사용 시간(BE #239)과 동네 이름(BE #241) 규칙 (#315).
 * 화면 밖에서도 테스트할 수 있게 계산만 모아 둔다. 설계는 docs/admin-ui.md "무전 사용 시간과 동네 이름"
 */

/**
 * 무전 사용 시간. 백엔드는 2분마다 오는 토큰 재발급으로 세서 접속마다 최대 2분 적게 나온다.
 * 그래서 초까지 적지 않고 1분이 넘으면 분 단위로 내린다(정확해 보이는 숫자가 오히려 헷갈린다).
 */
export function formatRadio(seconds: number): string {
  if (seconds <= 0) return "안 씀";
  if (seconds < 60) return "1분 미만";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// 시도 이름. 목록 칸이 좁아 이 앞부분을 떼고 보여 준다("서울특별시 강남구 역삼동" -> "강남구 역삼동")
const PROVINCE = /(특별시|광역시|특별자치시|특별자치도|도)$/;

/** 목록에 쓰는 짧은 동네 이름. 시도를 떼도 두 마디 이상 남을 때만 뗀다. 해외 주소는 그대로 둔다 */
export function shortPlaceName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 3 && PROVINCE.test(parts[0])) return parts.slice(1).join(" ");
  return parts.join(" ");
}

// Relay 가 만든 타입은 null 인 칸을 undefined 로도 줄 수 있어 둘 다 받는다
type ParticipantKey = {
  readonly userId?: string | null;
  readonly team: string;
  readonly leftAt?: string | null;
  readonly arrestCount: number;
  readonly arrestedCount: number;
};

// 같은 판에 같은 사람이 두 줄일 수 있고(이벤트 게임 재입장), 탈퇴자는 userId 가 없다.
// 그래서 줄의 값을 모두 묶은 열쇠에 같은 열쇠가 몇 번째인지까지 붙여 짝을 짓는다
function keysOf(rows: readonly ParticipantKey[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((p) => {
    const base = [p.userId ?? "-", p.team, p.leftAt ?? "-", p.arrestCount, p.arrestedCount].join("|");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `${base}#${n}`;
  });
}

/**
 * 지난 게임 참가자 줄마다 무전 시간을 붙인다. 무전은 본 쿼리와 따로 읽어서(운영 배포 전에도 화면이 열리게)
 * 두 응답의 줄을 짝지어야 한다. 순서에 기대지 않고 줄의 값으로 맞춘다. 짝이 없는 줄은 null.
 */
export function attachRadio<T extends ParticipantKey>(
  rows: readonly T[],
  radios: readonly (ParticipantKey & { readonly radioSeconds: number })[] | null | undefined,
): (T & { radioSeconds: number | null })[] {
  const byKey = new Map<string, number>();
  if (radios) keysOf(radios).forEach((k, i) => byKey.set(k, radios[i].radioSeconds));
  return keysOf(rows).map((k, i) => ({ ...rows[i], radioSeconds: radios ? (byKey.get(k) ?? null) : null }));
}

/**
 * 지난 게임 참가자 줄마다 서버가 정한 MVP 여부를 붙인다(BE #243). 무전처럼 따로 읽어 줄의 값으로 짝짓는다.
 * 웹이 직접 고르지 않는 이유: 서버는 동점을 이동 거리와 참가 순서로 갈라 팀마다 한 명만 고르고, 이벤트 게임과 중도 퇴장자는 빼는데
 * 그 값들은 어드민에 내려오지 않아 같은 결과를 낼 수 없다. 앱 결과 화면과 다른 MVP를 보이느니 서버 값이 올 때까지 비워 둔다
 */
export function attachMvp<T extends ParticipantKey>(
  rows: readonly T[],
  mvps: readonly (ParticipantKey & { readonly isMvp: boolean })[] | null | undefined,
): (T & { isMvp: boolean })[] {
  const byKey = new Map<string, boolean>();
  if (mvps) keysOf(mvps).forEach((k, i) => byKey.set(k, mvps[i].isMvp));
  return keysOf(rows).map((k, i) => ({ ...rows[i], isMvp: byKey.get(k) ?? false }));
}

/**
 * 경찰 무전 요약. 몇 명 중 몇 명이 썼고 합해서 얼마인지.
 * 합계는 줄마다 보이는 분(내림)을 더한다. 초를 다 더해 내리면 줄의 합(1분 + 5분)과 합계(7분)가 어긋나 보인다
 */
export function radioSummary(rows: readonly { readonly team: string; readonly radioSeconds: number | null }[]) {
  const police = rows.filter((p) => p.team === "POLICE");
  const used = police.filter((p) => (p.radioSeconds ?? 0) > 0);
  const minutes = used.reduce((sum, p) => sum + Math.floor((p.radioSeconds ?? 0) / 60), 0);
  return {
    police: police.length,
    used: used.length,
    // 쓴 사람이 있는데 모두 1분 미만이면 "1분 미만"으로 보이게 1초로 둔다
    totalSeconds: minutes > 0 ? minutes * 60 : used.length > 0 ? 1 : 0,
  };
}
