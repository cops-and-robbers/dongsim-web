/* eslint-disable @next/next/no-img-element */

// 냥파(경찰)와 도둥이(도둑) 한 쌍 - 대등 원칙에 따라 "함께 등장"이 기본형이다.
// 히어로·빈 상태·행사·포토부스 등 사이트 전반에서 재사용한다.
// pose "search"는 수사 무드(돋보기 든 냥파 + 도망가는 도둥이).

type Props = {
  pose?: "default" | "search";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
};

const SRC = {
  default: { cop: "/photobooth/cop.svg", thief: "/photobooth/thief.svg" },
  search: {
    cop: "/photobooth/cop-search.svg",
    thief: "/photobooth/thief-flee.svg",
  },
} as const;

// 냥파를 반 단계 크게 - 원본 비율상 이렇게 두어야 눈높이가 맞는다.
// lg부터는 화면 폭에 따라 한 단계 커진다(히어로·키오스크용).
const SIZE = {
  sm: { cop: "h-16", thief: "h-14" },
  md: { cop: "h-20", thief: "h-16" },
  lg: { cop: "h-24 sm:h-32", thief: "h-20 sm:h-28" },
  xl: { cop: "h-28 sm:h-36", thief: "h-24 sm:h-32" },
  "2xl": { cop: "h-32 sm:h-44", thief: "h-28 sm:h-40" },
} as const;

export default function CharacterDuo({
  pose = "default",
  size = "md",
  className = "",
}: Props) {
  return (
    <div className={`flex items-end justify-center gap-3 ${className}`}>
      <img
        src={SRC[pose].cop}
        alt=""
        className={`w-auto drop-shadow-md ${SIZE[size].cop}`}
      />
      <img
        src={SRC[pose].thief}
        alt=""
        className={`w-auto drop-shadow-md ${SIZE[size].thief}`}
      />
    </div>
  );
}
