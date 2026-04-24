"use client";

import { useEffect, useState } from "react";
import GameResultModal from "./GameResultModal";

const INITIAL_SECONDS = 30 * 60;

export default function LiveCountdown() {
  const [seconds, setSeconds] = useState(INITIAL_SECONDS);
  const [modalOpen, setModalOpen] = useState(false);

  if (seconds === 0 && !modalOpen) {
    setModalOpen(true);
  }

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("result") === "open"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeconds(0);
    }
  }, []);

  useEffect(() => {
    if (modalOpen || seconds === 0) return;
    const id = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [modalOpen, seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const handleClose = () => {
    setModalOpen(false);
    setSeconds(INITIAL_SECONDS);
  };

  return (
    <>
      <div className="hero-anim-chip absolute right-5 top-5 rounded-xl bg-white/95 px-3 py-2 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-app-black-900/90 dark:ring-white/10">
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          남은 시간
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
          {mm}:{ss}
        </p>
      </div>
      <GameResultModal open={modalOpen} onClose={handleClose} />
    </>
  );
}
