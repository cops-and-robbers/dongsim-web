// 오늘 사용량 막대. 무료 한도를 100% 로 두고, 자동 배포가 멈추는 선(70%)을 막대 위에 이름과 함께 긋는다.
// 넘으면 색과 함께 글자로 알린다. 숫자는 큰 % 를 먼저, 실제 수와 한도는 그 아래 작게(먼저 읽을 것을 크게)
export function UsageMeter({ label, value, limit, stopAt, unit, digits = 0, resetIn }: { label: string; value: number; limit: number; stopAt: number; unit: string; digits?: number; resetIn: string }) {
  const ratio = value / limit;
  const over = ratio >= stopAt;
  const fmt = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const pct = Math.round(ratio * 1000) / 10;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-sd-fg-muted">{label}</span>
        <span className={`text-[20px] font-bold leading-none tabular-nums ${over ? "text-sd-warning" : "text-sd-fg"}`}>{pct}%</span>
      </div>
      <div className="relative mt-5 h-2.5 rounded-full bg-sd-gray-200">
        <div className={`h-full rounded-full ${over ? "bg-sd-warning" : "bg-accent"}`} style={{ width: `${Math.max(1, Math.min(100, ratio * 100))}%` }} />
        <div className="absolute -top-4 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-sd-fg-subtle" style={{ left: `${stopAt * 100}%` }} aria-hidden>
          {Math.round(stopAt * 100)}%
        </div>
        <div className="absolute -bottom-1 -top-1 w-[2px] -translate-x-1/2 rounded-full bg-sd-fg-muted" style={{ left: `${stopAt * 100}%` }} aria-hidden />
      </div>
      <p className="mt-2 text-[12px] tabular-nums text-sd-fg-subtle">
        {fmt(value)} / {limit.toLocaleString("ko-KR")} {unit}
      </p>
      <p className={`mt-1 text-[12px] ${over ? "font-semibold text-sd-warning" : "text-sd-fg-subtle"}`}>
        {over ? `자동 배포가 멈췄어요. ${resetIn} 뒤 다시 배포할 수 있어요` : `${Math.round(stopAt * 100)}%를 넘으면 자동 배포가 멈춰요`}
      </p>
    </div>
  );
}
