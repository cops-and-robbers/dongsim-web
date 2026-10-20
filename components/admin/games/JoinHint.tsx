import { InfoIcon } from "@/components/admin/icons";

/**
 * 지금 이 방에 QR 로 들어올 수 있는지. 들어올 수 없을 때만 보인다.
 * - 일반 게임은 대기 중에만 들어온다. 진행 중이면 새 사람이 못 들어온다
 * - 이벤트 게임은 진행 중에만 들어온다(DOC-0008). 대기 중에 QR 을 보여 주면 찍어도 못 들어온다
 */
export function joinBlocked(status: string, isEventGame: boolean): string | null {
  if (status === "IN_PROGRESS" && !isEventGame) return "진행 중인 일반 게임에는 새로 들어올 수 없어요. 이벤트 게임으로 바꾸면 들어올 수 있어요.";
  if (status === "WAITING" && isEventGame) return "이벤트 게임에는 진행 중에만 들어올 수 있어요. 앱에서 게임을 시작한 다음 QR을 보여 주세요.";
  return null;
}

export function JoinHint({ status, isEventGame }: { status: string; isEventGame: boolean }) {
  const text = joinBlocked(status, isEventGame);
  if (!text) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-sd-warning-weak px-3.5 py-2.5 text-[13px] leading-relaxed text-sd-warning">
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}
