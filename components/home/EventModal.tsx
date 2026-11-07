"use client";

import { useEffect, useState } from "react";
import CharacterDuo from "@/components/ui/CharacterDuo";
import Modal from "@/components/ui/Modal";

// 홈 첫 진입 시 "OO에서 만나요" 행사 안내 모달.
// 어느 행사를 언제까지 띄울지는 어드민 "행사"에서 정하고, 홈 서버가 지금 띄울 행사를 골라 넘긴다(#219).
// 홈에서만 렌더하는 순수 클라이언트 오버레이라 딥링크(/join/*)와 무관하다.
// 노출 정책: 행사마다 세션당 1회 + "다시 보지 않기"로 그 행사만 영구 opt-out.
// 저장 키에 행사 id 를 넣는다. 예전엔 행사 이름이 박혀 있어, 다음 행사에 지난번에 닫은 사람에겐 안 떴다.

export type EventPopup = { eventId: number; name: string; dateLabel: string; location: string; url: string; until: number };

export default function EventModal({ popup }: { popup: EventPopup | null }) {
  const [open, setOpen] = useState(false);
  const dismissKey = popup ? `event-modal:${popup.eventId}` : "";
  const sessionKey = `${dismissKey}:session`;

  useEffect(() => {
    // 홈은 몇십 초 묶어 그려 두니, 내릴 시각이 지났으면 브라우저에서 한 번 더 막는다
    if (!popup || Date.now() >= popup.until) return;
    try {
      if (localStorage.getItem(dismissKey)) return;
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [popup, dismissKey, sessionKey]);

  if (!open || !popup) return null;

  // 그냥 닫기 - 이번 세션만, 다음 방문 땐 다시 노출.
  const closeForSession = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(sessionKey, "1");
    } catch {}
  };

  // 다시 보지 않기 - 이 행사만 영구 opt-out.
  const dismissForever = () => {
    setOpen(false);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {}
  };

  return (
    <Modal onClose={closeForSession} labelledBy="event-modal-title">
      <EventModalCard popup={popup} onClose={closeForSession} onDismiss={dismissForever} />
    </Modal>
  );
}

/** 팝업 카드. 어드민 미리보기도 이 카드를 그대로 그린다. data-spot 은 미리보기가 "여기가 바뀌어요"를 그릴 자리 */
export function EventModalCard({
  popup,
  onClose,
  onDismiss,
}: {
  popup: Pick<EventPopup, "name" | "dateLabel" | "location" | "url">;
  onClose?: () => void;
  onDismiss?: () => void;
}) {
  const { name, dateLabel, location, url } = popup;
  return (
    <div
      style={{ animation: "scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }}
      className="relative rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-app-black-900"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-3 text-3xl leading-none text-slate-300 transition hover:text-slate-500 dark:hover:text-slate-200"
      >
        &times;
      </button>

      <CharacterDuo size="md" />

      <h2 id="event-modal-title" className="mt-4 text-2xl font-extrabold text-brand-ink dark:text-white">
        <span data-spot="name">{name}</span>에서 만나요
      </h2>
      <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
        경찰과 도둑이 이번 행사에 나가요.
        <br />
        부스에서 다양한 이벤트를 즐겨보세요.
      </p>

      {(dateLabel || location) && (
        <div className="mt-5 rounded-2xl bg-brand-blue-bg px-5 py-4 dark:bg-app-black">
          {dateLabel && (
            <p data-spot="dateLabel" className="font-bold text-brand-ink dark:text-white">
              {dateLabel}
            </p>
          )}
          {location && (
            <p data-spot="location" className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {location}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-12 flex-1 rounded-full bg-slate-100 text-base font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-app-black dark:text-slate-300"
        >
          닫기
        </button>
        {url && (
          <a
            data-spot="popupUrl"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white transition hover:opacity-90"
          >
            행사 보기
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-sm text-slate-400 underline-offset-2 transition hover:text-slate-500 hover:underline dark:hover:text-slate-300"
      >
        다시 보지 않기
      </button>
    </div>
  );
}
