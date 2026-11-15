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
import { BiteScene, ShrinkScene, VanScene } from "@/components/online/modeScenes";
import { ChapterHead, MODE_STYLE, ModeArt, type ModeId } from "@/components/online/ModeParts";
import { readWebgameStatus, webgamePlayUrl } from "@/lib/webgame";
import type { WebgameStatus } from "@/lib/admin/webgame";

// 경찰과 도둑 온라인 게임 입구. 어떤 게임인지는 실제 판의 순간을 게임 재료로 그린 장면으로 보여 주고,
// 놀이 방식은 경도 → 구역 축소 → 좀비 모드 순서의 세 장으로 읽히게 한다.
// 버튼은 게임의 운영 상태(공개 전, 누구나, 점검 중)를 30초마다 읽어 바꾼다. 근거는 docs/online-game.md
// 한국어(/online), 영어(/en/online), 일본어(/ja/online)가 같이 쓴다. 문구는 messages.ts 의 online
type OnlineCopy = ReturnType<typeof getMessages>["online"];

const SCENES = [<LobbyScene key="lobby" />, <HideScene key="hide" />, <RevealScene key="reveal" />, <JailScene key="jail" />];
const ZOMBIE_SCENES = [<BiteScene key="bite" />, <VanScene key="van" />];
const INTL = { ko: "ko-KR", en: "en-US", ja: "ja-JP" } as const;

/** 예정 시각을 "11월 7일 오후 9:30" 처럼(한국 시간). 지났으면 보여 주지 않는다 */
function untilText(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime()) || t.getTime() < Date.now()) return "";
  return new Intl.DateTimeFormat(INTL[locale], { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t);
}

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
            {/* 제목 위 상태 알약은 두지 않는다(#321). 열려 있는지는 버튼이 눌리는지로, 못 누르는 까닭은 버튼 옆 안내로 이미 보인다 */}
            <div className="flex flex-col items-start">
              <h1 className="text-balance text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl dark:text-white">
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

      {/* 놀이 방식 셋. 경도에서 시작해 구역 축소, 좀비 모드로 넘어가는 순서로 읽히게 번호를 붙이고, 누르면 그 장으로 내려간다 */}
      <section className="py-16 sm:py-20">
        <Container>
          <ScrollReveal animation="fadeInUp">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{copy.modes.title}</h2>
          </ScrollReveal>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {copy.modes.items.map((m, i) => (
              <li key={m.id}>
                <ScrollReveal animation="fadeInUp" delayMs={i * 80} className="h-full">
                  <a href={`#${m.id}`} className={`group flex h-full items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-0.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5 ${MODE_STYLE[m.id as ModeId].card}`}>
                    <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl sm:w-full">
                      <ModeArt id={m.id as ModeId} />
                    </div>
                    <div className="min-w-0 sm:mt-4">
                      <p className={`font-mono text-xs font-bold tabular-nums ${MODE_STYLE[m.id as ModeId].accent}`}>{pad(i + 1)}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-white">{m.name}</p>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">{m.line}</p>
                    </div>
                  </a>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 01 경도: 실제 판에서 나오는 순간 네 개 */}
      <section id="classic" className="scroll-mt-20 border-t border-slate-200 pt-20 sm:pt-28 dark:border-white/10">
        <Container>
          <ChapterHead n={1} id="classic" name={copy.modes.items[0].name} title={copy.classic.title} lead={copy.classic.lead} />
        </Container>
        {copy.features.map((f, i) => {
          const reversed = i % 2 === 1;
          return (
            <div key={f.title} className="py-12 sm:py-20">
              <Container>
                <div className={`grid items-center gap-8 lg:gap-14 ${reversed ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"}`}>
                  <ScrollReveal animation={reversed ? "fadeInRight" : "fadeInLeft"} className={reversed ? "lg:order-2" : ""}>
                    <p className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                      {pad(i + 1)}  /  {pad(copy.features.length)}
                    </p>
                    <h3 className="mt-4 text-balance text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">{f.title}</h3>
                    <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">{f.body}</p>
                  </ScrollReveal>
                  <ScrollReveal animation={reversed ? "fadeInLeft" : "fadeInRight"} delayMs={100} className={reversed ? "lg:order-1" : ""}>
                    <LandscapeFrame>{SCENES[i]}</LandscapeFrame>
                  </ScrollReveal>
                </div>
              </Container>
            </div>
          );
        })}
      </section>

      {/* 02 구역 축소: 한 장면에 줄어드는 순간을 담고, 옆에 알아 둘 세 가지 */}
      <section id="shrink" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28 dark:bg-white/[0.03]">
        <Container>
          <ChapterHead n={2} id="shrink" name={copy.modes.items[1].name} title={copy.shrink.title} lead={copy.shrink.lead} />
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
            <ScrollReveal animation="fadeInLeft">
              <LandscapeFrame>
                <ShrinkScene />
              </LandscapeFrame>
            </ScrollReveal>
            <ScrollReveal animation="fadeInRight" delayMs={100}>
              <ol className="space-y-6">
                {copy.shrink.points.map((p, i) => (
                  <li key={p.title} className="flex gap-4">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${MODE_STYLE.shrink.dot}`}>{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
                      <p className="mt-1 text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* 03 좀비 모드: 물리는 순간과 구조차 탈출, 그리고 누가 이기는지와 판 균형 */}
      <section id="zombie" className="scroll-mt-20 bg-[#F6F3FD] py-20 sm:py-28 dark:bg-[#13111c]">
        <Container>
          <ChapterHead n={3} id="zombie" name={copy.modes.items[2].name} title={copy.zombie.title} lead={copy.zombie.lead} />
          {copy.zombie.steps.map((st, i) => {
            const reversed = i % 2 === 1;
            return (
              <div key={st.title} className={`mt-14 grid items-center gap-8 sm:mt-20 lg:gap-14 ${reversed ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"}`}>
                <ScrollReveal animation={reversed ? "fadeInRight" : "fadeInLeft"} className={reversed ? "lg:order-2" : ""}>
                  <h3 className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">{st.title}</h3>
                  <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">{st.body}</p>
                </ScrollReveal>
                <ScrollReveal animation={reversed ? "fadeInLeft" : "fadeInRight"} delayMs={100} className={reversed ? "lg:order-1" : ""}>
                  <LandscapeFrame>{ZOMBIE_SCENES[i]}</LandscapeFrame>
                </ScrollReveal>
              </div>
            );
          })}
          <ScrollReveal animation="fadeInUp">
            <div className="mt-16 grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-black/5 sm:mt-24 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-10 dark:bg-white/[0.04] dark:ring-white/10">
              <div className="flex items-center gap-4">
                <div className="flex shrink-0 -space-x-3" aria-hidden>
                  <img src="/online/zombie-police-front.svg" alt="" width={56} height={62} className="h-14 w-auto" />
                  <img src="/online/robber-front.svg" alt="" width={56} height={62} className="h-12 w-auto self-end" />
                </div>
                <p className="text-pretty text-base font-semibold leading-relaxed text-slate-900 sm:text-lg dark:text-white">{copy.zombie.win}</p>
              </div>
              <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0 dark:border-white/10">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.zombie.balance.label}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {copy.zombie.balance.options.map((o) => (
                    <li key={o} className="rounded-full bg-[#EEE9FB] px-3.5 py-1.5 text-sm font-semibold text-[#5B41AE] dark:bg-white/10 dark:text-[#C9B6FF]">
                      {o}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{copy.zombie.balance.note}</p>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
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
