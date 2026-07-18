"use client";

import { useEffect, useState } from "react";
import { PHOTOBOOTH_EVENT } from "@/components/photobooth/schedule";
import CharacterDuo from "@/components/ui/CharacterDuo";
import Modal from "@/components/ui/Modal";

// 홈 첫 진입 시 "서울 게임 타운에서 만나요" 안내 모달.
// 홈에서만 렌더하는 순수 클라이언트 오버레이라 딥링크(/join/*)와 무관하다.
// 노출 정책: 행사 전까지 세션당 1회 + "다시 보지 않기"로 영구 opt-out.

const DISMISS_KEY = "event-modal:seoul-game-town"; // 영구(localStorage)
const SESSION_KEY = "event-modal:seoul-game-town:session"; // 이번 세션(sessionStorage)
// 행사 종료(KST) 이후엔 더 띄우지 않는다.
const SHOW_UNTIL = new Date("2026-07-05T00:00:00+09:00").getTime();
const EVENT_URL = "https://seoulgametown.com/";

export default function EventModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Date.now() >= SHOW_UNTIL) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, []);

  // 그냥 닫기 - 이번 세션만, 다음 방문 땐 다시 노출.
  const closeForSession = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
  };

  // 다시 보지 않기 - 영구 opt-out.
  const dismissForever = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  if (!open) return null;

  const { venue, dateLabel, location } = PHOTOBOOTH_EVENT;

  return (
    <Modal onClose={closeForSession} labelledBy="event-modal-title">
      <div
        style={{ animation: "scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }}
        className="relative rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-app-black-900"
      >
        <button
          type="button"
          onClick={closeForSession}
          aria-label="닫기"
          className="absolute right-4 top-3 text-3xl leading-none text-slate-300 transition hover:text-slate-500 dark:hover:text-slate-200"
        >
          &times;
        </button>

        <CharacterDuo size="md" />

        <h2
          id="event-modal-title"
          className="mt-4 text-2xl font-extrabold text-brand-ink dark:text-white"
        >
          {venue}에서 만나요
        </h2>
        <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
          경찰과 도둑이 이번 행사에 나가요.
          <br />
          부스에서 다양한 이벤트를 즐겨보세요.
        </p>

        <div className="mt-5 rounded-2xl bg-brand-blue-bg px-5 py-4 dark:bg-app-black">
          {dateLabel && (
            <p className="font-bold text-brand-ink dark:text-white">
              {dateLabel}
            </p>
          )}
          {location && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {location}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={closeForSession}
            className="h-12 flex-1 rounded-full bg-slate-100 text-base font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-app-black dark:text-slate-300"
          >
            닫기
          </button>
          <a
            href={EVENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeForSession}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white transition hover:opacity-90"
          >
            행사 보기
          </a>
        </div>

        <button
          type="button"
          onClick={dismissForever}
          className="mt-3 text-sm text-slate-400 underline-offset-2 transition hover:text-slate-500 hover:underline dark:hover:text-slate-300"
        >
          다시 보지 않기
        </button>
      </div>
    </Modal>
  );
}
