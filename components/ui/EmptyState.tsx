import type { ReactNode } from "react";
import CharacterDuo from "./CharacterDuo";

// 빈 목록·준비중·감사 화면의 공통 골격 - 캐릭터 한 쌍 + 제목 + 설명.

type Props = {
  title: string;
  description?: ReactNode;
  pose?: "default" | "search";
  className?: string;
};

export default function EmptyState({
  title,
  description,
  pose = "default",
  className = "",
}: Props) {
  return (
    <div className={`py-16 text-center ${className}`}>
      <CharacterDuo pose={pose} size="md" className="mb-6" />
      <p className="text-lg font-bold text-brand-ink dark:text-white">
        {title}
      </p>
      {description && (
        <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}
