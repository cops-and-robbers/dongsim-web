import CharacterDuo from "@/components/ui/CharacterDuo";
import type { KioskConfig } from "@/lib/event/kiosk";
import AutoRefresh from "./AutoRefresh";
import Backdrop from "./Backdrop";
import { renderCopy } from "./copy";

// 운영 시간이 아닐 때 부스에 뜨는 화면 - 행사 전엔 "준비중" 안내, 끝난 뒤엔 감사 인사.
// 값은 서버가 지금 행사에서 골라 넘긴다(#219, #221). data-spot, data-copy 는 어드민 미리보기가 "여기가 바뀌어요"를 그릴 자리다.
// live 는 실제 부스에서만 켠다. 30초마다 다시 읽어 열릴 때가 되면 촬영 화면으로 바뀐다(어드민 미리보기에서는 끈다)
export type ClosedScreenProps = { name: string; dateLabel: string; location: string; over: boolean; kiosk: KioskConfig; live?: boolean };

export default function ClosedScreen({ name, dateLabel, location, over, kiosk, live = false }: ClosedScreenProps) {
  const t = (k: Parameters<typeof renderCopy>[1]) => renderCopy({ kiosk, name }, k);
  if (over) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
        <Backdrop />
        {live && <AutoRefresh ms={60_000} />}

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <CharacterDuo size="xl" className="mb-8" />

          <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
            {t("over.title")}
          </h1>

          <p className="mt-5 text-xl leading-relaxed text-slate-600 sm:text-2xl dark:text-slate-300">
            {t("over.body")}
          </p>
          <p className="mt-2 text-lg text-slate-500 sm:text-xl dark:text-slate-400">
            {t("over.sub")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-linear-to-b from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black">
      <Backdrop />
      {live && <AutoRefresh ms={30_000} />}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <CharacterDuo size="xl" className="mb-8" />

        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
          {t("closed.title")}
        </h1>

        <p className="mt-5 text-xl text-slate-600 sm:text-2xl dark:text-slate-300">
          {t("closed.body")}
        </p>

        {dateLabel && (
          <p data-spot="dateLabel" className="mt-3 text-2xl font-bold text-brand-blue sm:text-3xl">
            {dateLabel}
          </p>
        )}

        {location && (
          <p data-spot="location" className="mt-2 text-base text-slate-500 sm:text-lg dark:text-slate-400">
            {location}
          </p>
        )}
      </div>
    </div>
  );
}
