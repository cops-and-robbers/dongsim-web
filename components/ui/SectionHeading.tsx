import type { ReactNode } from "react";

// 섹션 머리 - 아이브로(작은 브랜드색 라벨) + 제목 + 설명 조합.
// 사이트 섹션들의 공통 구조를 한 곳으로 모은 프리미티브.

type Props = {
  /** 제목 위의 작은 라벨 (예: "STORY", "사건의 시작") */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  center?: boolean;
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
  className = "",
}: Props) {
  return (
    <div className={`${center ? "text-center" : ""} ${className}`}>
      {eyebrow && (
        <p className="text-sm font-bold tracking-wider text-brand-blue dark:text-brand-green">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300 ${
            center ? "mx-auto max-w-xl" : "max-w-2xl"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
