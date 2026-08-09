// 게임 상태 색 - 배지·도넛·지도 마커·범례가 공유하는 단일 출처.
// 여기만 바꾸면 전 화면 상태 색이 일관되게 바뀐다.
export const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: "#12b886", // 진행중 - 초록
  WAITING: "#f08c00", // 대기중 - 앰버
  FINISHED: "#868e96", // 종료 - 회색
  CANCELED: "#f03e3e", // 취소 - 빨강
};

export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? STATUS_COLOR.FINISHED;
}
