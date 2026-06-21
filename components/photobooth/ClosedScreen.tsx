/* eslint-disable @next/next/no-img-element */
import Backdrop from "./Backdrop";
import { PHOTOBOOTH_EVENT } from "./schedule";

// 운영 시간이 아닐 때 부스에 뜨는 "준비중" 화면 — 다음 행사를 안내한다.
export default function ClosedScreen() {
  const { venue, dateLabel, location } = PHOTOBOOTH_EVENT;
  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
      <Backdrop />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 flex items-end justify-center gap-3">
          <img
            src="/photobooth/cop.png"
            alt=""
            className="h-28 w-auto drop-shadow-md sm:h-36"
          />
          <img
            src="/photobooth/thief.png"
            alt=""
            className="h-24 w-auto drop-shadow-md sm:h-32"
          />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
          지금은 준비 중이에요
        </h1>

        <p className="mt-5 text-xl text-slate-600 sm:text-2xl dark:text-slate-300">
          {venue}에서 만나요
        </p>

        {dateLabel && (
          <p className="mt-3 text-2xl font-bold text-brand-blue sm:text-3xl">
            {dateLabel}
          </p>
        )}

        {location && (
          <p className="mt-2 text-base text-slate-500 sm:text-lg dark:text-slate-400">
            {location}
          </p>
        )}
      </div>
    </div>
  );
}
