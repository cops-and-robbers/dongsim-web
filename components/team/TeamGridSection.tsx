import Image from "next/image";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  FOUNDER,
  TEAM_MEMBERS,
  type TeamMember,
} from "@/lib/constants";
import CreditsCard from "@/components/team/CreditsCard";
import type { PublicHelper } from "@/lib/company/model";

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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-900 hover:text-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white dark:hover:text-app-black"
    >
      {children}
    </a>
  );
}

const ALL_MEMBERS: TeamMember[] = [FOUNDER, ...TEAM_MEMBERS];

const roleAccent: Record<TeamMember["role"], string> = {
  Frontend: "text-brand-blue dark:text-brand-green",
  Backend: "text-rose-500 dark:text-rose-400",
  Design: "text-emerald-700 dark:text-brand-green",
  Marketing: "text-amber-600 dark:text-amber-400",
};

function MemberCard({
  member,
  isFounder,
}: {
  member: TeamMember;
  isFounder: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-app-black-900">
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-app-black-800">
        <Image
          src={member.photo}
          alt={`${member.name} 프로필 사진`}
          fill
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        {isFounder && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue backdrop-blur dark:bg-app-black/80 dark:text-brand-green">
            Founder
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
            {member.name}
          </h3>
          <p className={`text-sm font-medium ${roleAccent[member.role]}`}>
            {member.role}
          </p>
        </div>
        {(member.github || member.instagram) && (
          <div className="flex shrink-0 items-center gap-1.5">
            <SocialLink href={member.github} label={`${member.name} GitHub`}>
              <GithubIcon />
            </SocialLink>
            <SocialLink
              href={member.instagram}
              label={`${member.name} Instagram`}
            >
              <InstagramIcon />
            </SocialLink>
          </div>
        )}
      </div>
    </article>
  );
}

export default function TeamGridSection({
  helpers,
}: {
  helpers: readonly PublicHelper[];
}) {
  return (
    <section className="bg-white pb-24 pt-10 transition-colors duration-500 sm:pb-32 sm:pt-14 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {ALL_MEMBERS.map((m, i) => (
              <li key={m.name}>
                <MemberCard member={m} isFounder={i === 0} />
              </li>
            ))}
          </ul>
        </ScrollReveal>

        {helpers.length > 0 && (
          <ScrollReveal animation="fadeInUp" delayMs={200} className="mt-24">
            <CreditsCard helpers={helpers} />
          </ScrollReveal>
        )}
      </Container>
    </section>
  );
}
