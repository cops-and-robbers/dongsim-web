import Footprint from "@/components/icons/Footprint";
import type { PublicHelper } from "@/lib/company/model";

// 구성원 페이지의 고마운 분들 (#250). 어드민 미리보기도 이 카드를 그대로 그린다. data-spot-id 는 미리보기가 방금 고친 분을 짚는 자리다.

function FootprintGroup({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count}회 참여`}
      className="flex items-center gap-0.5 text-slate-400 transition-colors group-hover:text-brand-blue dark:text-slate-500 dark:group-hover:text-brand-green"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Footprint key={i} size={12} rotate={i % 2 === 0 ? -12 : 12} />
      ))}
    </span>
  );
}

function SparkleGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-2.5 w-2.5 fill-current ${className ?? ""}`}
    >
      <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8Z" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 text-brand-blue dark:text-brand-green">
      <SparkleGlyph />
      <p className="text-[10px] font-bold uppercase tracking-[0.32em]">
        {children}
      </p>
      <SparkleGlyph />
    </div>
  );
}

function BackerEntry({ helper }: { helper: PublicHelper }) {
  const name = (
    <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
      {helper.name}
    </p>
  );

  return (
    <div data-spot-id={helper.id} className="flex flex-col items-center gap-2">
      {helper.github ? (
        <a
          href={helper.github}
          target="_blank"
          rel="noreferrer"
          aria-label={`${helper.name} GitHub`}
          className="rounded-md outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue dark:focus-visible:outline-brand-green"
        >
          {name}
        </a>
      ) : (
        name
      )}
      <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
        <span className="h-px w-6 bg-current" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
          인프라 제공
        </span>
        <span className="h-px w-6 bg-current" aria-hidden="true" />
      </div>
    </div>
  );
}

function HelperItem({ helper }: { helper: PublicHelper }) {
  const nameClass =
    "text-base font-semibold text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-100 dark:group-hover:text-white";

  const inner = (
    <>
      <FootprintGroup count={helper.participationCount} />
      <span className={nameClass}>{helper.name}</span>
    </>
  );

  if (helper.github) {
    return (
      <li data-spot-id={helper.id}>
        <a
          href={helper.github}
          target="_blank"
          rel="noreferrer"
          aria-label={`${helper.name} GitHub`}
          className="group inline-flex items-center justify-center gap-2 rounded-md outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue dark:focus-visible:outline-brand-green"
        >
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li data-spot-id={helper.id} className="group flex cursor-default items-center justify-center gap-2 transition-transform duration-200 hover:-translate-y-0.5">
      {inner}
    </li>
  );
}

function SparkleDivider() {
  return (
    <div className="mx-auto flex max-w-xl items-center" aria-hidden="true">
      <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
      <svg
        viewBox="0 0 12 12"
        className="mx-4 h-3 w-3 fill-current text-brand-blue/50 dark:text-brand-green/50"
      >
        <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8Z" />
      </svg>
      <div className="flex-1 border-t border-dashed border-slate-300 dark:border-white/15" />
    </div>
  );
}

export default function CreditsCard({
  helpers,
}: {
  helpers: readonly PublicHelper[];
}) {
  const backers = helpers.filter((h) => h.role === "infrastructure");
  const playtesters = helpers.filter((h) => h.role === "qa");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center sm:px-12 sm:py-16 dark:border-white/10 dark:bg-app-black-900">
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
        고마운 분들
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        이 게임을 만드는 데 도움 주신 분들이에요.
      </p>

      {backers.length > 0 && (
        <>
          <div className="mx-auto mt-12">
            <SparkleDivider />
          </div>

          <div className="mt-10 flex flex-col items-center gap-5">
            <SectionLabel>Backed By</SectionLabel>
            <div className="flex flex-col items-center gap-6">
              {backers.map((h) => (
                <BackerEntry key={h.id} helper={h} />
              ))}
            </div>
          </div>
        </>
      )}

      {playtesters.length > 0 && (
        <>
          <div className="mx-auto mt-12">
            <SparkleDivider />
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <SectionLabel>Playtesters</SectionLabel>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              함께 뛰며 게임을 다듬어주신 분들
            </p>
          </div>

          <ul className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
            {playtesters.map((h) => (
              <HelperItem key={h.id} helper={h} />
            ))}
          </ul>
        </>
      )}

      <div className="mx-auto mt-12">
        <SparkleDivider />
      </div>
    </div>
  );
}
