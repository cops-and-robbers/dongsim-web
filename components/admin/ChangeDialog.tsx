"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";

// 앱 설정을 적용하기 전 확인창. 무엇이 어떻게 바뀌는지, 사용자에게 어떤 일이 생기는지 보여 준다.
// 위험한 변경은 버튼이 빨개지고, 처음 초점은 취소에 둔다(엔터로 넘겨 버리지 않게).
export function ChangeDialog({
  title,
  items,
  warnings = [],
  note,
  children,
  danger = false,
  confirmText = "앱에 적용",
  confirmDisabled = false,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  items?: { key: string; label: string; before: string; after: string }[];
  warnings?: string[];
  note?: ReactNode;
  children?: ReactNode;
  danger?: boolean;
  confirmText?: string;
  confirmDisabled?: boolean;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button type="button" aria-label="닫기" onClick={() => !pending && onClose()} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-sd-line bg-sd-surface p-6"
      >
        <h2 className="text-[16px] font-bold text-sd-fg">{title}</h2>

        {warnings.map((w) => (
          <p key={w} className="mt-3 text-[14px] font-semibold leading-relaxed text-sd-critical">
            {w}
          </p>
        ))}

        {items && items.length > 0 && (
          <dl className="mt-4 space-y-2.5 rounded-xl bg-sd-fill px-4 py-3">
            {items.map((item) => (
              <div key={item.key}>
                <dt className="text-[12px] font-medium text-sd-fg-subtle">{item.label}</dt>
                <dd className="mt-0.5 break-all text-[14px] text-sd-fg">
                  <span className="text-sd-fg-subtle">{item.before}</span>
                  <span aria-hidden className="mx-1.5 text-sd-fg-subtle">
                    →
                  </span>
                  <span className="sr-only">새 값 </span>
                  <span className="font-semibold">{item.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children}

        {note && <p className="mt-3 text-[13px] leading-relaxed text-sd-fg-subtle">{note}</p>}

        {error && (
          <p role="alert" className="mt-3 text-[13px] leading-relaxed text-sd-critical">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose} disabled={pending} autoFocus={danger}>
            취소
          </Button>
          <Button variant={danger ? "danger" : "brand"} onClick={onConfirm} disabled={pending || confirmDisabled}>
            {pending ? "적용하는 중..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
