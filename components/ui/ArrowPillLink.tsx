import Link from "next/link";

// 화살표가 붙은 알약 링크. 사이트 공통 Button 의 outline 모양과 같다.
// Button 은 inline-block 이라 글자와 화살표를 나란히 두려면 따로 그린다.
// 홈의 "이야기 모두 보기", "어떤 게임인지 보기"처럼 다음 페이지로 넘어가는 보조 동작에 쓴다.
// 보일 자리(폰에서만, 넓은 화면에서만)와 폭은 className 의 display 로 정한다(inline-flex 또는 flex)
export default function ArrowPillLink({
  href,
  label,
  className = "inline-flex",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group items-center justify-center gap-1.5 rounded-full border border-slate-300 px-7 py-3 text-base font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-blue hover:text-brand-blue active:scale-95 dark:border-white/15 dark:text-slate-200 dark:hover:border-brand-green dark:hover:text-brand-green ${className}`}
    >
      {label}
      <svg viewBox="0 0 16 16" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
        <path
          d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </Link>
  );
}
