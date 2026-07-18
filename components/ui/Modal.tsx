"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

// 모달 오버레이 골격 - 포털 + 백드롭(클릭 시 닫기) + ESC 닫기 + 가운데 정렬.
// 카드 모양·애니메이션은 children이 결정한다 (백드롭 클릭과 분리하기 위해
// children 래퍼에서 클릭 전파를 막는다).

type Props = {
  onClose: () => void;
  children: ReactNode;
  /** 스크린리더용 라벨. 내부에 제목 요소가 있으면 labelledBy로 그 id를 넘긴다. */
  label?: string;
  labelledBy?: string;
  /** 카드 래퍼 클래스 - 최대 폭 등 (기본 max-w-sm w-full) */
  contentClassName?: string;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function Modal({
  onClose,
  children,
  label,
  labelledBy,
  contentClassName = "w-full max-w-sm",
}: Props) {
  const isClient = useIsClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className={contentClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
