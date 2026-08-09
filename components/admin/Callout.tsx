import type { ReactNode } from "react";
import { InfoIcon } from "@/components/admin/icons";

// 인라인 알림 배너 - 상황을 알려줘요. 색은 우리 톤(info=액센트).
type Variant = "neutral" | "info" | "warning" | "danger" | "success";

const V: Record<Variant, { box: string; icon: string }> = {
  neutral: {
    box: "bg-sd-fill",
    icon: "text-sd-fg-subtle",
  },
  info: {
    box: "bg-accent-weak",
    icon: "text-accent",
  },
  warning: {
    box: "bg-sd-warning-weak",
    icon: "text-sd-warning",
  },
  danger: {
    box: "bg-sd-critical-weak",
    icon: "text-sd-critical",
  },
  success: {
    box: "bg-sd-positive-weak",
    icon: "text-sd-positive",
  },
};

export function Callout({
  variant = "neutral",
  title,
  children,
  icon,
}: {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  const v = V[variant];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${v.box}`}>
      <span className={`mt-px shrink-0 ${v.icon}`}>
        {icon ?? <InfoIcon className="h-[18px] w-[18px]" />}
      </span>
      <div className="text-[13px] leading-relaxed">
        {title && (
          <p className="font-bold text-sd-fg">{title}</p>
        )}
        {children && (
          <div
            className={`text-sd-fg-subtle ${title ? "mt-0.5" : ""}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
