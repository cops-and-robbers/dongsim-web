import Image from "next/image";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { FOUNDER, TEAM_MEMBERS } from "@/lib/constants";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

const MEMBERS = [FOUNDER, ...TEAM_MEMBERS];

// 회사 소개 페이지 하단의 구성원 미리보기 - 얼굴만 겹쳐 보여주고 상세는 /team/members로.
export default function TeamPreviewSection({
  copy,
  locale,
}: {
  copy: Messages["team"]["preview"];
  locale: Locale;
}) {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {copy.heading}
            </h2>

            {/* 호버하면 겹쳐 있던 아바타가 자연스럽게 펼쳐진다. */}
            <div className="group mt-8 flex justify-center">
              {MEMBERS.map((m, i) => (
                <div
                  key={m.name}
                  className={`relative h-14 w-14 overflow-hidden rounded-full ring-3 ring-white transition-all duration-300 ease-out hover:z-10 hover:scale-110 sm:h-16 sm:w-16 dark:ring-app-black ${
                    i === 0 ? "" : "-ml-4 group-hover:ml-1.5"
                  }`}
                >
                  <Image
                    src={m.photo}
                    alt={m.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <p className="mt-8 leading-relaxed text-slate-600 dark:text-slate-300">
              {copy.origin}
            </p>

            <Button
              href={localizedPath("/team/members", locale)}
              variant="outline"
              className="mt-8"
            >
              {copy.membersButton}
            </Button>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
