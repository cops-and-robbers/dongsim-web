"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CharacterDuo from "@/components/ui/CharacterDuo";
import DownloadButtons from "@/components/ui/DownloadButtons";
import Modal from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath } from "@/lib/i18n/config";

// 앱 v3 대규모 개편을 알리는 홈 전용 모달 (#99).
// [enabled] 는 서버에서 스토어 라이브 버전을 보고 판단해 내려준다
// (lib/app-version.ts) - 심사 통과 전에는 렌더 자체가 없다.
// 노출 정책: 방문자당 1회(localStorage). 닫은 뒤에는 좌하단
// "v3 새 소식" 배지로 언제든 다시 열 수 있다.

const SEEN_KEY = "v3-notice:seen";

export default function V3AnnouncementModal({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const copy = getMessages(locale).home.v3Notice;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [enabled]);

  if (!enabled) return null;

  // 한 번 보면 자동으로는 다시 뜨지 않는다 - 배지가 재입장 통로.
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-30 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-brand-blue shadow-lg ring-1 ring-brand-blue/20 backdrop-blur transition hover:bg-white dark:bg-app-black-900/90 dark:text-brand-green dark:ring-brand-green/25 dark:hover:bg-app-black-900"
        >
          <span aria-hidden="true">✦</span>
          {copy.badge}
        </button>
      )}

      {open && (
        <Modal
          onClose={close}
          labelledBy="v3-notice-title"
          contentClassName="w-full max-w-lg"
        >
          <div
            style={{ animation: "scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }}
            className="relative rounded-3xl bg-white p-7 shadow-2xl dark:bg-app-black-900"
          >
            <button
              type="button"
              onClick={close}
              aria-label={copy.close}
              className="absolute right-4 top-3 text-3xl leading-none text-slate-300 transition hover:text-slate-500 dark:hover:text-slate-200"
            >
              &times;
            </button>

            <div className="text-center">
              <CharacterDuo size="md" />
              <p className="mt-4 inline-block rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-bold text-brand-blue dark:bg-app-black dark:text-brand-green">
                {copy.tag}
              </p>
              <h2
                id="v3-notice-title"
                className="mt-2 text-2xl font-extrabold text-brand-ink dark:text-white"
              >
                {copy.title}
              </h2>
            </div>

            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {copy.highlights.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl bg-brand-blue-bg px-5 py-4 dark:bg-app-black"
                >
                  <p className="break-keep font-bold text-brand-ink dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col items-center gap-4">
              <DownloadButtons placement="v3_notice" />
              {/* 모바일 엄지가 닿는 우하단에 닫기를 둔다 - 우상단 X만으로는 멀다 */}
              <div className="flex w-full items-center justify-between">
                <Link
                  href={localizedPath("/demo", locale)}
                  onClick={close}
                  className="text-sm font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:hover:text-slate-200"
                >
                  {copy.demoCta}
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-app-black"
                >
                  {copy.close}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
