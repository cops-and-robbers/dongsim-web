/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { EVENT, isEventOpen, isEventOver } from "@/components/event/schedule";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "황금 치즈 도난 사건 — 경찰과 도둑 이벤트",
  description:
    "500년의 봉인이 풀린 밤, 전설의 치즈 레시피가 사라졌다. 흩어진 단서를 쫓아 도둑 '도둥이'를 잡아라. 경찰과 도둑 앱 이벤트.",
  alternates: { canonical: "/event" },
};

export default function EventPage() {
  if (isEventOpen()) return <EventStory />;
  return isEventOver() ? <EventThanks /> : <EventTeaser />;
}

// 행사가 끝난 뒤 — 사건 종결 + 감사 인사.
function EventThanks() {
  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex items-end justify-center gap-3">
        <img
          src="/photobooth/cop-search.svg"
          alt=""
          className="h-24 w-auto drop-shadow-md sm:h-32"
        />
        <img
          src="/photobooth/thief-flee.svg"
          alt=""
          className="h-20 w-auto drop-shadow-md sm:h-28"
        />
      </div>
      <span className="rounded-full border border-brand-blue/30 bg-white px-4 py-1 text-xs font-bold tracking-wider text-brand-blue dark:border-brand-green/40 dark:bg-app-black dark:text-brand-green">
        사건 종결
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
        도둥이, 검거 완료!
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        {EVENT.venue}을 찾아주신 모든 시민 여러분,
        <br />
        덕분에 황금 치즈 레시피를 되찾았어요. 감사합니다.
      </p>
      <p className="mt-6 text-slate-500 dark:text-slate-400">
        경찰과 도둑의 추격전은 앱에서 계속돼요.
      </p>
      <Link
        href="/download"
        className="mt-5 inline-block rounded-full bg-brand-blue px-9 py-3.5 text-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 dark:bg-brand-green dark:text-app-black"
      >
        앱 다운로드
      </Link>
    </main>
  );
}

// 행사 당일이 아닐 때 — "곧 공개" 티저.
function EventTeaser() {
  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex items-end justify-center gap-3">
        <img
          src="/photobooth/cop-search.svg"
          alt=""
          className="h-24 w-auto drop-shadow-md sm:h-32"
        />
        <img
          src="/photobooth/thief-flee.svg"
          alt=""
          className="h-20 w-auto drop-shadow-md sm:h-28"
        />
      </div>
      <span className="rounded-full border border-brand-blue/30 bg-white px-4 py-1 text-xs font-bold tracking-wider text-brand-blue dark:border-brand-green/40 dark:bg-app-black dark:text-brand-green">
        미해결 사건
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
        곧 공개됩니다
      </h1>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
        {EVENT.venue}에서 만나요
      </p>
      <p className="mt-1 text-xl font-bold text-brand-blue dark:text-brand-green">
        {EVENT.dateLabel}
      </p>
    </main>
  );
}

function EventStory() {
  return (
    <main>
      {/* 히어로 — 사건 표지 */}
      <section className="border-b border-slate-200 bg-brand-blue-bg/50 py-20 md:py-28 dark:border-white/10 dark:bg-app-black-900">
        <Container className="text-center">
          <ScrollReveal>
            <span className="inline-block rounded-full border border-brand-blue/30 bg-white px-4 py-1 text-xs font-bold tracking-wider text-brand-blue dark:border-brand-green/40 dark:bg-app-black dark:text-brand-green">
              미해결 사건
            </span>
          </ScrollReveal>
          <ScrollReveal delayMs={80}>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-brand-ink sm:text-6xl dark:text-white">
              황금 치즈 도난 사건
            </h1>
          </ScrollReveal>
          <ScrollReveal delayMs={160}>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
              500년의 봉인이 풀린 밤,
              <br />
              전설의 치즈 레시피가 사라졌다.
            </p>
          </ScrollReveal>
          <ScrollReveal delayMs={240}>
            <div className="mt-10 flex items-end justify-center gap-3">
              <img
                src="/photobooth/cop-search.svg"
                alt=""
                className="h-24 w-auto drop-shadow-md sm:h-32"
              />
              <img
                src="/photobooth/thief-flee.svg"
                alt=""
                className="h-20 w-auto drop-shadow-md sm:h-28"
              />
            </div>
          </ScrollReveal>
          <ScrollReveal delayMs={320}>
            <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-4 py-1.5 text-sm font-bold text-brand-red">
              <span
                className="h-2 w-2 rounded-full bg-brand-red"
                aria-hidden="true"
              />
              용의자 도주 중
            </span>
          </ScrollReveal>
        </Container>
      </section>

      {/* 사건의 시작 — 배경 */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <ScrollReveal animation="fadeInLeft">
              <SectionTag>사건의 시작</SectionTag>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
                500년 만의 개봉
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                치즈 마을은 500년간 봉인돼 있던 황금 치즈를 열고, 그 안에 담긴
                전설의 레시피를 공식 기록물로 남기는 행사를 준비하고 있었다.
                마을의 모든 치즈가 시작된, 바로 그 레시피를.
              </p>
            </ScrollReveal>
            <ScrollReveal animation="fadeInRight">
              <Clue src="/event/cheese.svg" label="봉인된 황금 치즈" />
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* 용의자 — 지명수배 */}
      <section className="bg-slate-50 py-16 md:py-24 dark:bg-app-black-900">
        <Container>
          <ScrollReveal className="mx-auto max-w-2xl">
            <SectionTag center>용의자</SectionTag>
            <div className="mt-6 flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed border-brand-blue/30 bg-white p-8 text-center dark:border-brand-green/30 dark:bg-app-black md:flex-row md:gap-8 md:text-left">
              <img
                src="/event/wanted.svg"
                alt="도둥이 지명수배"
                className="w-44 shrink-0 drop-shadow-md sm:w-52"
              />
              <div>
                <h3 className="text-2xl font-extrabold text-brand-ink dark:text-white">
                  도둥이{" "}
                  <span className="text-lg font-bold text-slate-400">
                    (회색 쥐)
                  </span>
                </h3>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  “쥐는 치즈를 좋아한다”는 세상의 고정관념을 견딜 수 없었다.
                  레시피가 공개되면 그 편견이 영원히 이어질 거라 믿었고 — 그래서
                  모든 걸 없애기로 했다.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>

      {/* 그날 밤 — 사건 전말 */}
      <section className="py-16 md:py-24">
        <Container>
          <ScrollReveal className="text-center">
            <SectionTag center>그날 밤</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
              행사 전날, 박물관에서
            </h2>
          </ScrollReveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-12 md:grid-cols-2">
            <ScrollReveal>
              <Clue src="/event/diary.svg" label="남겨진 일기장" />
              <p className="mt-6 text-center leading-relaxed text-slate-600 dark:text-slate-300">
                현장엔 도둥이의 일기장이 떨어져 있었다. 페이지마다 레시피를 향한
                분노가 빼곡했다.
              </p>
            </ScrollReveal>
            <ScrollReveal delayMs={120}>
              <Clue src="/event/cctv.svg" label="그날의 CCTV" />
              <p className="mt-6 text-center leading-relaxed text-slate-600 dark:text-slate-300">
                카메라엔 황금 치즈를 부수고 레시피를 챙긴 뒤, 어둠 속으로
                사라지는 회색 그림자가 잡혔다.
              </p>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* CTA — 당신의 차례 */}
      <section className="bg-brand-blue py-16 md:py-24 dark:bg-app-black-900 dark:ring-1 dark:ring-white/10">
        <Container className="text-center text-white">
          <ScrollReveal>
            <img
              src="/photobooth/cop-search.svg"
              alt=""
              className="mx-auto h-24 w-auto drop-shadow-lg sm:h-28"
            />
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              사건은, 아직 미해결.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/90 dark:text-slate-300">
              흩어진 단서를 모아 도둥이를 검거하라.
              <br />
              경찰과 도둑 앱 이벤트 방에서 직접 수사에 참여하세요.
            </p>
            <Link
              href="/download"
              className="mt-9 inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-brand-blue shadow-lg transition hover:-translate-y-0.5 dark:text-app-black"
            >
              앱 다운로드하고 수사 시작
            </Link>
          </ScrollReveal>
        </Container>
      </section>
    </main>
  );
}

function SectionTag({
  children,
  center = false,
}: {
  children: string;
  center?: boolean;
}) {
  return (
    <p
      className={`text-sm font-bold tracking-wider text-brand-blue dark:text-brand-green ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </p>
  );
}

// 스토리 삽화 — 고정 높이 박스 + 세로 중앙 정렬(비율 달라도 중심점·아래 텍스트 정렬).
function Clue({ src, label }: { src: string; label: string }) {
  return (
    <figure className="mx-auto w-full max-w-sm">
      <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black/5 sm:h-64 dark:border-white/10 dark:bg-app-black">
        <img src={src} alt={label} className="max-h-full w-auto rounded-lg" />
      </div>
      <figcaption className="mt-4 text-center font-mono text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </figcaption>
    </figure>
  );
}
