/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import DownloadButtons from "@/components/ui/DownloadButtons";
import { appIconSrc, localizedPath, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import LandscapeFrame from "@/components/online/LandscapeFrame";
import { ChaseScene, HideScene, JailScene, RevealScene } from "@/components/online/scenes";
import { LobbyScene } from "@/components/online/LobbyScene";
import { readWebgameStatus, webgamePlayUrl } from "@/lib/webgame";
import type { WebgameStatus } from "@/lib/admin/webgame";

// 경찰과 도둑 온라인 게임 입구. 어떤 게임인지는 실제 판의 순간을 게임 재료로 그린 장면으로 보여 주고,
// 버튼은 게임의 운영 상태(공개 전, 누구나, 점검 중)를 30초마다 읽어 바꾼다. 근거는 docs/online-game.md
// 한국어(/online), 영어(/en/online), 일본어(/ja/online)가 같이 쓴다. 문구는 messages.ts 의 online
type OnlineCopy = ReturnType<typeof getMessages>["online"];

const SCENES = [<LobbyScene key="lobby" />, <HideScene key="hide" />, <RevealScene key="reveal" />, <JailScene key="jail" />];
const INTL = { ko: "ko-KR", en: "en-US", ja: "ja-JP" } as const;

/** 예정 시각을 "11월 7일 오후 9:30" 처럼(한국 시간). 지났으면 보여 주지 않는다 */
function untilText(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime()) || t.getTime() < Date.now()) return "";
  return new Intl.DateTimeFormat(INTL[locale], { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t);
}

const DOT = { soon: "bg-slate-400", open: "bg-brand-green", pause: "bg-brand-red" } as const;

function Play({ status, medium, locale, copy }: { status: WebgameStatus; medium: string; locale: Locale; copy: OnlineCopy }) {
  if (status.mode === "open") {
    return (
      <a
        href={webgamePlayUrl(medium, locale)}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand-blue px-9 py-3.5 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95 sm:w-auto dark:bg-brand-green dark:text-app-black"
      >
        {copy.play}
      </a>
    );
  }
  const until = untilText(status.until, locale);
  // 어드민이 적는 안내는 한국어라 영어, 일본어 페이지에서는 정해진 안내만 보여 준다
  const message = locale === "ko" ? status.message : "";
  const note = status.mode === "soon" ? copy.note.soon : message || (until ? copy.note.pauseUntil.replace("{t}", until) : copy.note.pause);
  // 못 누르는 까닭을 바로 옆에 적는다(NN/g 비활성 버튼). 키보드 초점은 닿게 aria-disabled 로 둔다(W3C APG)
  return (
    <div className="flex w-full flex-col items-center gap-2.5 sm:w-auto sm:flex-row sm:gap-4">
      <span
        role="link"
        aria-disabled="true"
        aria-describedby={`play-note-${medium}`}
        tabIndex={0}
        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-9 py-3.5 text-lg font-bold text-slate-400 sm:w-auto dark:bg-white/10 dark:text-slate-500"
      >
        {copy.play}
      </span>
      <p id={`play-note-${medium}`} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {note}
      </p>
    </div>
  );
}

export default async function OnlineSections({ locale }: { locale: Locale }) {
  const status = await readWebgameStatus();
  const copy = getMessages(locale).online;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="bg-white transition-colors duration-500 dark:bg-app-black">
      {/* 첫 화면: 제목과 버튼, 오른쪽에 실제 판의 한 장면 */}
      <section className="border-b border-slate-200 dark:border-white/10">
        <Container className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-14 lg:py-28">
          <ScrollReveal animation="fadeInUp">
            <div className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[status.mode]}`} />
                {copy.badge[status.mode]}
              </span>
              <h1 className="mt-5 text-balance text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl dark:text-white">
                {copy.title[0]}
                <br />
                {copy.title[1]}
              </h1>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-300">{copy.lead}</p>
              <div className="mt-8 w-full">
                <Play status={status} medium="online_hero" locale={locale} copy={copy} />
              </div>
              <dl className="mt-10 grid w-full max-w-md grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-4 dark:divide-white/10 dark:border-white/10">
                {copy.stats.map(([k, v]) => (
                  <div key={k} className="px-4 first:pl-0">
                    <dt className="text-xs font-semibold text-slate-400 dark:text-slate-500">{k}</dt>
                    <dd className="mt-1 text-base font-bold text-slate-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fadeInRight" delayMs={100}>
            <LandscapeFrame>
              <ChaseScene />
            </LandscapeFrame>
          </ScrollReveal>
        </Container>
      </section>

      {/* 어떤 게임인지: 실제 판에서 나오는 순간 네 개 */}
      {copy.features.map((f, i) => {
        const reversed = i % 2 === 1;
        return (
          <section key={f.title} className="py-16 sm:py-24">
            <Container>
              <div className={`grid items-center gap-8 lg:gap-14 ${reversed ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"}`}>
                <ScrollReveal animation={reversed ? "fadeInRight" : "fadeInLeft"} className={reversed ? "lg:order-2" : ""}>
                  <p className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {pad(i + 1)}  /  {pad(copy.features.length)}
                  </p>
                  <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">{f.title}</h2>
                  <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">{f.body}</p>
                </ScrollReveal>
                <ScrollReveal animation={reversed ? "fadeInLeft" : "fadeInRight"} delayMs={100} className={reversed ? "lg:order-1" : ""}>
                  <LandscapeFrame>{SCENES[i]}</LandscapeFrame>
                </ScrollReveal>
              </div>
            </Container>
          </section>
        );
      })}

      {/* 마지막: 다시 버튼, 그리고 막다른 화면이 되지 않게 오프라인 경찰과 도둑 하나(GOV.UK 서비스 중단 페이지 패턴) */}
      <section className="pb-24 pt-8 sm:pb-32">
        <Container>
          {/* 열려 있을 때만 끝에서 다시 부른다. 공개 전에는 같은 누를 수 없는 버튼을 두 번 보여 주지 않는다 */}
          {status.mode === "open" && (
            <div className="mb-20 flex flex-col items-center border-t border-slate-200 pt-16 text-center dark:border-white/10">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{copy.again}</h2>
              <div className="mt-8 flex justify-center">
                <Play status={status} medium="online_bottom" locale={locale} copy={copy} />
              </div>
            </div>
          )}
          {/* 앱 소개: 그 언어의 실제 앱 아이콘과 스토어 버튼 */}
          <div className="flex flex-col gap-8 rounded-3xl bg-brand-blue-bg px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:gap-12 dark:bg-app-black-900 dark:ring-1 dark:ring-white/10">
            <div className="flex flex-1 items-start gap-5">
              <img
                src={appIconSrc(locale)}
                alt={copy.app.iconAlt}
                width={80}
                height={80}
                className="h-16 w-16 shrink-0 rounded-[22%] shadow-[0_6px_16px_-6px_rgba(15,23,42,0.35)] ring-1 ring-black/5 sm:h-20 sm:w-20"
              />
              <div>
                <h2 className="text-balance text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">{copy.app.title}</h2>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                  {copy.app.body}{" "}
                  <Link href={localizedPath("/game", locale)} className="whitespace-nowrap font-semibold text-brand-blue underline-offset-4 hover:underline dark:text-brand-green">
                    {copy.app.link}
                  </Link>
                </p>
              </div>
            </div>
            <DownloadButtons placement="online_page" className="shrink-0" />
          </div>
        </Container>
      </section>
    </div>
  );
}
