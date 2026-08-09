"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";

// 재사용 확인 모달. 시스템 confirm() 대신 어드민 톤으로 재확인을 받는다.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xs rounded-2xl border border-sd-line bg-sd-surface px-6 py-6 text-center"
      >
        <h2 className="text-[16px] font-bold text-sd-fg">{title}</h2>
        {message && (
          <p className="mt-2 text-[14px] leading-relaxed text-sd-fg-subtle">
            {message}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button
            variant="neutral"
            onClick={onClose}
            disabled={pending}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "brand"}
            onClick={onConfirm}
            disabled={pending}
            className="flex-1"
          >
            {pending ? "처리 중..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
