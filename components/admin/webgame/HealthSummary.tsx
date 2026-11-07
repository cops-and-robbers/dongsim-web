import { AlertIcon, CheckIcon, InfoIcon } from "@/components/admin/icons";
import type { Summary } from "@/lib/admin/webgameMonitor";

// 화면 맨 위의 한 줄 답: "지금 괜찮나?". 대시보드는 숫자를 읽기 전에 답부터 보여야 한다(NN/g 대시보드, Grafana 인지 부하 원칙).
// 폰에서는 버튼을 글 아래로 내려 제목이 좁게 꺾이지 않게 한다. 문제가 있으면 종류별 판 수와 "살펴볼 판만 보기"를 함께 둔다. 색만으로 알리지 않게 아이콘과 문장이 같은 뜻을 말한다
const TONE = {
  good: { box: "border-sd-positive/30 bg-sd-positive-weak", icon: "text-sd-positive", Icon: CheckIcon },
  warn: { box: "border-sd-warning/40 bg-sd-warning-weak", icon: "text-sd-warning", Icon: AlertIcon },
  idle: { box: "border-sd-line bg-sd-surface", icon: "text-sd-fg-subtle", Icon: InfoIcon },
} as const;

export function HealthSummary({ summary, onShowFlagged }: { summary: Summary; onShowFlagged: () => void }) {
  const { tone, games, flagged, counts, usageOver } = summary;
  const t = TONE[tone];
  const title =
    tone === "idle"
      ? "최근 24시간 동안 끝난 판이 없어요"
      : flagged
        ? `최근 24시간 판 ${games}개 중 살펴볼 판이 ${flagged}개예요`
        : usageOver
          ? "오늘 사용량이 70%를 넘어 자동 배포가 멈췄어요"
          : `최근 24시간 판 ${games}개, 모두 괜찮았어요`;
  const parts = [
    counts.slow ? `왕복이 느린 판 ${counts.slow}개` : "",
    counts.rejoin ? `끊긴 판 ${counts.rejoin}개` : "",
    counts.lag ? `서버가 밀린 판 ${counts.lag}개` : "",
    flagged && usageOver ? "오늘 사용량이 70%를 넘어 자동 배포가 멈췄어요" : "",
  ].filter(Boolean);
  return (
    <div role="status" className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:gap-4 ${t.box}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <t.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${t.icon}`} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-sd-fg">{title}</p>
          {parts.length > 0 && <p className="mt-0.5 text-[13px] text-sd-fg-muted">{parts.join(", ")}</p>}
        </div>
      </div>
      {flagged > 0 && (
        <button
          type="button"
          onClick={onShowFlagged}
          className="ml-8 self-start rounded-lg bg-sd-surface px-3 py-2 sm:ml-0 sm:self-auto text-[13px] font-semibold text-sd-fg shadow-sm outline-none ring-1 ring-sd-line transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-accent"
        >
          살펴볼 판만 보기
        </button>
      )}
    </div>
  );
}
