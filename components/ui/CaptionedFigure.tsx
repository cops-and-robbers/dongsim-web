/* eslint-disable @next/next/no-img-element */

// 캡션 달린 삽화 박스 - 고정 높이 카드 안에 이미지를 세로 중앙 정렬한다.
// 비율이 다른 이미지들도 중심점과 아래 캡션 위치가 맞는다. (행사 스토리의 단서 등)

type Props = {
  src: string;
  label: string;
  className?: string;
};

export default function CaptionedFigure({ src, label, className = "" }: Props) {
  return (
    <figure className={`mx-auto w-full max-w-sm ${className}`}>
      <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black/5 sm:h-64 dark:border-white/10 dark:bg-app-black">
        <img src={src} alt={label} className="max-h-full w-auto rounded-lg" />
      </div>
      <figcaption className="mt-4 text-center font-mono text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </figcaption>
    </figure>
  );
}
