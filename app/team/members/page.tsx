import type { Metadata } from "next";
import Link from "next/link";
import TeamGridSection from "@/components/team/TeamGridSection";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "구성원",
  description:
    "동심지키미를 함께 만드는 사람들. 경찰과 도둑을 기획·개발·운영하는 여덟 명의 구성원과 도움 주신 분들을 소개합니다.",
  alternates: { canonical: "/team/members" },
  openGraph: {
    title: "구성원 | 경찰과 도둑",
    description: "동심지키미를 함께 만드는 여덟 명의 구성원을 소개합니다.",
    url: "/team/members",
    type: "profile",
    locale: "ko_KR",
  },
};

export default function TeamMembersPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "팀 소개", path: "/team" },
          { name: "구성원", path: "/team/members" },
        ]}
      />
      <section className="bg-white pt-16 transition-colors duration-500 sm:pt-24 dark:bg-app-black">
        <Container>
          <ScrollReveal animation="fadeInUp">
            <Link
              href="/team"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-green"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              팀 소개
            </Link>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              구성원
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              경찰과 도둑을 함께 만드는 여덟 명, 그리고 곁에서 도움 주신 분들이에요.
            </p>
          </ScrollReveal>
        </Container>
      </section>
      <TeamGridSection />
    </>
  );
}
