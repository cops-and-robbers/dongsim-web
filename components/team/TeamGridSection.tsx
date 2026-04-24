"use client";

import Image from "next/image";
import { useState } from "react";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  FOUNDER,
  TEAM_MEMBERS,
  QA_MEMBERS,
  type TeamMember,
} from "@/lib/constants";

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .5C5.73.5.77 5.47.77 11.74c0 4.94 3.2 9.13 7.65 10.61.56.1.77-.24.77-.54 0-.26-.01-1.14-.02-2.06-3.11.68-3.77-1.32-3.77-1.32-.51-1.29-1.25-1.63-1.25-1.63-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.72-1.5-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.41.11-2.94 0 0 .94-.3 3.08 1.14.89-.25 1.85-.37 2.8-.38.95.01 1.91.13 2.8.38 2.13-1.44 3.08-1.14 3.08-1.14.61 1.53.23 2.66.11 2.94.72.78 1.15 1.77 1.15 2.99 0 4.29-2.61 5.23-5.1 5.51.4.34.76 1.02.76 2.07 0 1.5-.01 2.7-.01 3.07 0 .3.2.65.78.54 4.44-1.49 7.64-5.68 7.64-10.61C23.23 5.47 18.27.5 12 .5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.81-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.81 3.81 0 01-1.38-.9 3.81 3.81 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.14 0-3.51.01-4.75.07-1.01.05-1.56.21-1.93.35-.48.19-.83.41-1.19.77-.36.36-.58.71-.77 1.19-.14.37-.3.92-.35 1.93-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.01.21 1.56.35 1.93.19.48.41.83.77 1.19.36.36.71.58 1.19.77.37.14.92.3 1.93.35 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.01-.05 1.56-.21 1.93-.35.48-.19.83-.41 1.19-.77.36-.36.58-.71.77-1.19.14-.37.3-.92.35-1.93.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.01-.21-1.56-.35-1.93a3.21 3.21 0 00-.77-1.19 3.21 3.21 0 00-1.19-.77c-.37-.14-.92-.3-1.93-.35C15.51 4.01 15.14 4 12 4zm0 3.06a4.94 4.94 0 110 9.88 4.94 4.94 0 010-9.88zm0 1.8a3.14 3.14 0 100 6.28 3.14 3.14 0 000-6.28zm5.14-2.09a1.15 1.15 0 110 2.3 1.15 1.15 0 010-2.3z" />
    </svg>
  );
}

const ALL_MEMBERS: TeamMember[] = [FOUNDER, ...TEAM_MEMBERS];
const SATELLITE_COUNT = ALL_MEMBERS.length - 1;
const RADIUS = 34;

const SLOT_POSITIONS = Array.from({ length: SATELLITE_COUNT }, (_, i) => {
  const angle = (i * 360) / SATELLITE_COUNT;
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: Math.cos(rad) * RADIUS, y: Math.sin(rad) * RADIUS };
});

const roleAccent: Record<TeamMember["role"], string> = {
  Frontend: "text-brand-blue dark:text-brand-green",
  Backend: "text-slate-700 dark:text-slate-300",
  Design: "text-emerald-700 dark:text-brand-green",
};

function SocialLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-900 hover:text-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white dark:hover:text-app-black"
    >
      {children}
    </a>
  );
}

function TeamNode({
  member,
  isActive,
  isFounder,
  onSelect,
}: {
  member: TeamMember;
  isActive: boolean;
  isFounder: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isActive}
      className="group relative flex flex-col items-center rounded-xl text-center outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue disabled:cursor-default dark:focus-visible:outline-brand-green"
      aria-label={
        isActive ? `${member.name} — 현재 중앙` : `${member.name} 이야기 보기`
      }
    >
      <div
        className={`relative overflow-hidden rounded-full transition-all duration-500 ease-out ${
          isActive
            ? "h-28 w-28 shadow-2xl ring-[6px] ring-brand-blue/25 sm:h-36 sm:w-36 dark:ring-brand-green/30"
            : "h-16 w-16 shadow-md ring-2 ring-white group-hover:scale-105 group-hover:shadow-lg group-hover:ring-brand-blue sm:h-24 sm:w-24 dark:ring-white/25 dark:group-hover:ring-brand-green"
        }`}
      >
        <Image
          src={member.photo}
          alt={`${member.name} 프로필 사진`}
          fill
          sizes="(max-width: 640px) 96px, 144px"
          className="object-cover"
        />
      </div>

      <p
        className={`whitespace-nowrap transition-all duration-500 ${
          isActive
            ? "mt-4 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white"
            : "mt-3 text-xs font-semibold text-slate-700 sm:text-sm dark:text-slate-300"
        }`}
      >
        {member.name}
      </p>

      <div
        aria-hidden={!isActive}
        className={`flex flex-col items-center overflow-hidden transition-all duration-500 ${
          isActive ? "mt-2 max-h-56 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${roleAccent[member.role]}`}>
            {member.role}
          </p>
          {isFounder && (
            <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
              Founder
            </span>
          )}
        </div>
        <p className="mt-3 max-w-64 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {member.bio}
        </p>
        {(member.github || member.instagram) && (
          <div className="mt-4 flex items-center gap-2">
            {member.github && (
              <SocialLink href={member.github} label={`${member.name} GitHub`}>
                <GithubIcon />
              </SocialLink>
            )}
            {member.instagram && (
              <SocialLink
                href={member.instagram}
                label={`${member.name} Instagram`}
              >
                <InstagramIcon />
              </SocialLink>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function TeamWeb() {
  const [activeIndex, setActiveIndex] = useState(0);

  const positions = ALL_MEMBERS.map((_, i) => {
    if (i === activeIndex) return { x: 0, y: 0, isActive: true };
    const slot = i < activeIndex ? i : i - 1;
    const { x, y } = SLOT_POSITIONS[slot];
    return { x, y, isActive: false };
  });

  return (
    <div className="relative mx-auto mt-16 aspect-square w-full max-w-170">
      {/* Subtle dot grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(rgba(15,23,42,0.055)_1px,transparent_1px)] bg-size-[18px_18px] opacity-60 dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)]"
      />
      {/* Soft center glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-green/10"
      />

      <svg
        viewBox="-50 -50 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-brand-blue/25 dark:text-brand-green/25"
        aria-hidden="true"
      >
        {SLOT_POSITIONS.map((p, i) => (
          <line
            key={i}
            x1="0"
            y1="0"
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {ALL_MEMBERS.map((m, i) => {
        const p = positions[i];
        return (
          <div
            key={m.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-500 ease-out"
            style={{
              left: `${50 + p.x}%`,
              top: `${50 + p.y}%`,
            }}
          >
            <TeamNode
              member={m}
              isActive={p.isActive}
              isFounder={i === 0}
              onSelect={() => setActiveIndex(i)}
            />
          </div>
        );
      })}
    </div>
  );
}

function MobileTeamList() {
  return (
    <div className="mt-12 space-y-8 md:hidden">
      <article className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-app-black-900">
        <div className="relative h-28 w-28 overflow-hidden rounded-full shadow-xl ring-[6px] ring-brand-blue/25 dark:ring-brand-green/30">
          <Image
            src={FOUNDER.photo}
            alt={`${FOUNDER.name} 프로필 사진`}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
        <span className="mt-4 inline-flex rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
          Founder
        </span>
        <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
          {FOUNDER.name}
        </h3>
        <p className={`text-sm font-medium ${roleAccent[FOUNDER.role]}`}>
          {FOUNDER.role}
        </p>
        <blockquote className="mt-4 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
          &ldquo;경찰과 도둑 같이 만들래?&rdquo;
        </blockquote>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {FOUNDER.bio}
        </p>
        {(FOUNDER.github || FOUNDER.instagram) && (
          <div className="mt-4 flex items-center gap-2">
            {FOUNDER.github && (
              <SocialLink
                href={FOUNDER.github}
                label={`${FOUNDER.name} GitHub`}
              >
                <GithubIcon />
              </SocialLink>
            )}
            {FOUNDER.instagram && (
              <SocialLink
                href={FOUNDER.instagram}
                label={`${FOUNDER.name} Instagram`}
              >
                <InstagramIcon />
              </SocialLink>
            )}
          </div>
        )}
      </article>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-dashed border-brand-blue/30 dark:border-brand-green/30" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          함께 만드는 사람들
        </span>
        <div className="flex-1 border-t border-dashed border-brand-blue/30 dark:border-brand-green/30" />
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {TEAM_MEMBERS.map((m) => (
          <li key={m.name}>
            <article className="flex h-full flex-col items-center rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200 dark:bg-app-black-900 dark:ring-white/10">
              <div className="relative h-16 w-16 overflow-hidden rounded-full shadow-md ring-2 ring-white dark:ring-white/20">
                <Image
                  src={m.photo}
                  alt={`${m.name} 프로필 사진`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                {m.name}
              </p>
              <p className={`text-xs font-medium ${roleAccent[m.role]}`}>
                {m.role}
              </p>
              {(m.github || m.instagram) && (
                <div className="mt-3 flex items-center gap-1.5">
                  {m.github && (
                    <SocialLink href={m.github} label={`${m.name} GitHub`}>
                      <GithubIcon />
                    </SocialLink>
                  )}
                  {m.instagram && (
                    <SocialLink
                      href={m.instagram}
                      label={`${m.name} Instagram`}
                    >
                      <InstagramIcon />
                    </SocialLink>
                  )}
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TeamGridSection() {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              만드는 사람들
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              여섯 명이 함께 만들어요
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              상희의 &ldquo;경찰과 도둑 같이 만들래?&rdquo; 한마디에서 시작된
              팀이에요.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUp" delayMs={100}>
          <div className="hidden md:block">
            <TeamWeb />
            <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              사진을 눌러 다른 팀원 이야기를 만나보세요
            </p>
          </div>
          <MobileTeamList />
        </ScrollReveal>

        <ScrollReveal animation="fadeInUp" delayMs={200}>
          <div className="relative mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center sm:px-12 sm:py-16 dark:border-white/10 dark:bg-app-black-900">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-blue/50 to-transparent dark:via-brand-green/50"
            />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M12 2l2.6 5.1 5.6.8-4 3.9.9 5.6L12 14.9 6.9 17.4l.9-5.6-4-3.9 5.6-.8L12 2z"
                  fill="currentColor"
                  fillOpacity="0.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-blue dark:text-brand-green">
              Special Thanks
            </p>
            <h3 className="mt-3 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              함께 뛰어준 분들
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              직접 플레이하며 게임을 다듬어 준 {QA_MEMBERS.length}명의 QA
              팀이에요.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl items-center">
              <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
              <svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className="mx-4 h-3 w-3 fill-current text-brand-blue/50 dark:text-brand-green/50"
              >
                <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8Z" />
              </svg>
              <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
            </div>

            <ul className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
              {QA_MEMBERS.map((name) => (
                <li
                  key={name}
                  className="text-base font-semibold text-slate-700 dark:text-slate-100"
                >
                  {name}
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-10 flex max-w-xl items-center">
              <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
              <svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className="mx-4 h-3 w-3 fill-current text-brand-blue/50 dark:text-brand-green/50"
              >
                <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8Z" />
              </svg>
              <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
