"use client";

import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/ThemeProvider";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
};

const ROBBER_STATS = [
  { label: "체포 횟수", value: "0회" },
  { label: "남은 도둑", value: "5명" },
  { label: "게임 진행 시간", value: "30분" },
];

const POLICE_STATS = [
  { label: "체포 횟수", value: "12회" },
  { label: "남은 도둑", value: "0명" },
  { label: "게임 진행 시간", value: "25분" },
];

export default function GameResultModal({ open, onClose }: Props) {
  const isClient = useIsClient();
  const { team } = useTheme();
  const isRobber = team === "robber";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !isClient) return null;

  const modal = isRobber ? (
    <RobberWinModal onClose={onClose} />
  ) : (
    <PoliceWinModal onClose={onClose} />
  );

  return createPortal(modal, document.body);
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function RobberWinModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="pointer-events-none absolute left-[calc(50%+6px)] bottom-full z-0 -translate-x-1/2 translate-y-15">
        <Image
          src="/characters/robber-win-body.svg"
          alt=""
          width={171}
          height={144}
          className="h-40 w-auto"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 rounded-3xl bg-[#080A0C] px-3 pb-4 pt-6 shadow-2xl">
        <h3
          id="result-title"
          className="text-center text-2xl font-semibold text-[#38F55B]"
        >
          승리
        </h3>

        <dl className="mt-5 space-y-3 px-3 text-base">
          {ROBBER_STATS.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <dt className="font-medium text-[#93A2B3]">{s.label}</dt>
              <dd className="font-mono font-semibold tabular-nums text-white">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg bg-[#1E232A] text-base font-semibold text-[#93A2B3] transition-opacity hover:opacity-90"
          >
            홈으로
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg bg-[#38F55B] text-base font-semibold text-[#080A0C] transition-opacity hover:opacity-90"
          >
            한 번 더
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute left-12 top-0 z-20 -translate-y-1/2">
        <Image
          src="/characters/robber-win-arm-left.svg"
          alt=""
          width={47}
          height={26}
          className="h-6.5 w-auto"
          aria-hidden="true"
        />
      </div>
      <div className="pointer-events-none absolute right-12 top-0 z-20 -translate-y-1/2">
        <Image
          src="/characters/robber-win-arm-right.svg"
          alt=""
          width={47}
          height={26}
          className="h-6.5 w-auto"
          aria-hidden="true"
        />
      </div>
    </ModalShell>
  );
}

function PoliceWinModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="pointer-events-none absolute left-1/2 bottom-full z-0 -translate-x-1/2 translate-y-15">
        <Image
          src="/characters/police-win-body.svg"
          alt=""
          width={155}
          height={166}
          className="h-44 w-auto"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 rounded-3xl bg-white px-3 pb-4 pt-6 shadow-2xl ring-1 ring-slate-200">
        <h3
          id="result-title"
          className="text-center text-2xl font-semibold text-brand-blue"
        >
          승리
        </h3>

        <dl className="mt-5 space-y-3 px-3 text-base">
          {POLICE_STATS.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <dt className="font-medium text-slate-400">{s.label}</dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-900">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg bg-slate-100 text-base font-semibold text-slate-500 transition-opacity hover:opacity-90"
          >
            한 번 더
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-lg bg-app-black-900 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            홈으로
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute left-12 top-0 z-20 -translate-y-1/2">
        <Image
          src="/characters/police-win-arm-left.svg"
          alt=""
          width={47}
          height={26}
          className="h-6.5 w-auto"
          aria-hidden="true"
        />
      </div>
      <div className="pointer-events-none absolute right-12 top-0 z-20 -translate-y-1/2">
        <Image
          src="/characters/police-win-arm-right.svg"
          alt=""
          width={47}
          height={26}
          className="h-6.5 w-auto"
          aria-hidden="true"
        />
      </div>
    </ModalShell>
  );
}
