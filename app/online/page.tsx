/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import DownloadButtons from "@/components/ui/DownloadButtons";
import { appIconSrc } from "@/lib/i18n/config";
import LandscapeFrame from "@/components/online/LandscapeFrame";
import { ChaseScene, HideScene, JailScene, RevealScene } from "@/components/online/scenes";
import { LobbyScene } from "@/components/online/LobbyScene";
import { readWebgameStatus, webgamePlayUrl } from "@/lib/webgame";
import type { WebgameStatus } from "@/lib/admin/webgame";

// 경찰과 도둑 온라인 게임 입구. 어떤 게임인지는 실제 판의 순간을 게임 재료로 그린 장면으로 보여 주고,
// 버튼은 게임의 운영 상태(공개 전, 누구나, 점검 중)를 30초마다 읽어 바꾼다. 근거는 docs/online-game.md
export const revalidate = 30;

export const metadata: Metadata = {
  title: "경찰과 도둑 온라인 게임",
  description: "친구에게 링크를 보내 폰이나 컴퓨터에서 같이 하는 경찰과 도둑 온라인 게임이에요. 최대 8명, 한 판 3분이에요.",
  alternates: { canonical: "/online" },
  // 공개 전에는 검색에 내보내지 않는다. 열면 이 줄을 지우고 사이트맵에 넣는다
  robots: { index: false, follow: true },
};

const FEATURES = [
  {
    title: "링크 하나로 모여요",
    body: "방을 만들고 링크나 방 코드를 보내면 친구가 들어와요. 대기실에서 경찰 칸이나 도둑 칸으로 걸어가면 그 편이 돼요. 최대 8명이에요.",
    scene: <LobbyScene />,
  },
  {
    title: "바라보는 쪽만 보여요",
    body: "바라보는 쪽만 멀리 보여요. 도둑은 수풀에 숨고, 경찰은 시야를 돌려 가며 찾아요.",
    scene: <HideScene />,
  },
  {
    title: "35초마다 위치가 드러나요",
    body: "도둑 자리가 지도에 잠깐 빨간 표시로 떠요. 경찰은 그쪽으로 달려가고, 도둑은 얼른 자리를 옮겨요.",
    scene: <RevealScene />,
  },
  {
    title: "같은 편이 감옥에서 꺼내 줘요",
    body: "잡힌 도둑은 감옥으로 가요. 같은 편이 감옥 문 앞에 잠깐 서 있으면 풀려나요. 경찰은 그전에 막아야 해요.",
    scene: <JailScene />,
  },
];

/** 예정 시각을 "11월 7일 오후 9:30쯤" 처럼. 지났으면 보여 주지 않는다 */
function untilText(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime()) || t.getTime() < Date.now()) return "";
  const time = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(t);
  return `${time}쯤`;
}

const BADGE = { soon: "만들고 있어요", open: "지금 할 수 있어요", pause: "점검 중" } as const;
const DOT = { soon: "bg-slate-400", open: "bg-brand-green", pause: "bg-brand-red" } as const;

function Play({ status, medium }: { status: WebgameStatus; medium: string }) {
  if (status.mode === "open") {
    return (
      <a
        href={webgamePlayUrl(medium)}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand-blue px-9 py-3.5 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95 sm:w-auto dark:bg-brand-green dark:text-app-black"
      >
        친구랑 한 판 하기
      </a>
    );
  }
  const until = untilText(status.until);
  const note =
    status.mode === "soon"
      ? "아직 만들고 있어요"
      : status.message || (until ? `${until} 다시 와 주세요` : "점검하고 있어요. 조금 뒤에 다시 와 주세요");
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
        친구랑 한 판 하기
      </span>
      <p id={`play-note-${medium}`} className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {note}
      </p>
    </div>
  );
}

export default async function OnlinePage() {
  const status = await readWebgameStatus();
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
                {BADGE[status.mode]}
              </span>
              <h1 className="mt-5 text-balance text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl dark:text-white">
                경찰과 도둑
                <br />
                온라인 게임
              </h1>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                친구에게 링크를 보내 폰이나 컴퓨터에서 같이 하는 게임이에요.
              </p>
              <div className="mt-8 w-full">
                <Play status={status} medium="online_hero" />
              </div>
              <dl className="mt-10 grid w-full max-w-md grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-4 dark:divide-white/10 dark:border-white/10">
                {[
                  ["인원", "최대 8명"],
                  ["한 판", "3분"],
                  ["설치", "필요 없어요"],
                ].map(([k, v]) => (
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
      {FEATURES.map((f, i) => {
        const reversed = i % 2 === 1;
        return (
          <section key={f.title} className="py-16 sm:py-24">
            <Container>
              <div className={`grid items-center gap-8 lg:gap-14 ${reversed ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"}`}>
                <ScrollReveal animation={reversed ? "fadeInRight" : "fadeInLeft"} className={reversed ? "lg:order-2" : ""}>
                  <p className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                    {pad(i + 1)}  /  {pad(FEATURES.length)}
                  </p>
                  <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">{f.title}</h2>
                  <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">{f.body}</p>
                </ScrollReveal>
                <ScrollReveal animation={reversed ? "fadeInLeft" : "fadeInRight"} delayMs={100} className={reversed ? "lg:order-1" : ""}>
                  <LandscapeFrame>{f.scene}</LandscapeFrame>
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
              <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">친구를 불러 한 판 해요</h2>
              <div className="mt-8 flex justify-center">
                <Play status={status} medium="online_bottom" />
              </div>
            </div>
          )}
          {/* 앱 소개: 실제 앱 아이콘(앱의 한국어 아이콘과 같은 그림)과 스토어 버튼 */}
          <div className="flex flex-col gap-8 rounded-3xl bg-brand-blue-bg px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:gap-12 dark:bg-app-black-900 dark:ring-1 dark:ring-white/10">
            <div className="flex flex-1 items-start gap-5">
              <img
                src={appIconSrc("ko")}
                alt="경찰과 도둑 앱 아이콘"
                width={80}
                height={80}
                className="h-16 w-16 shrink-0 rounded-[22%] shadow-[0_6px_16px_-6px_rgba(15,23,42,0.35)] ring-1 ring-black/5 sm:h-20 sm:w-20"
              />
              <div>
                <h2 className="text-balance text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">오프라인으로 경찰과 도둑 즐기기</h2>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                  공원이나 운동장에서 친구들과 진짜로 뛰어요. 앱이 지도와 감옥을 맡아요.{" "}
                  <Link href="/game" className="whitespace-nowrap font-semibold text-brand-blue underline-offset-4 hover:underline dark:text-brand-green">
                    어떻게 하는지 보기
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
