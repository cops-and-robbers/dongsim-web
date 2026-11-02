"use client";

import { appColors } from "@/lib/app-tokens";

/** 마스크로 색을 입히는 앱 아이콘 (flutter_svg colorFilter 대응). */
export function TintIcon({ src, size, color }: { src: string; size: number; color: string }) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      className="block shrink-0"
      style={{ width: size, height: size, backgroundColor: color, WebkitMask: mask, mask }}
    />
  );
}

/** 앱 공용 토글 (segmented_toggle.dart: 높이 40, 안쪽 5, 알약, 14). */
export function SegmentedToggle({
  labels,
  selected,
  onSelect,
  dark,
}: {
  labels: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
  dark: boolean;
}) {
  return (
    <div
      className="flex h-[40px] rounded-full p-[5px]"
      style={{ backgroundColor: dark ? appColors.black800 : appColors.black100 }}
    >
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i)}
          className="flex-1 rounded-full text-[14px] transition-colors"
          style={{
            backgroundColor: i === selected ? (dark ? appColors.black200 : appColors.white) : "transparent",
            color: i === selected ? appColors.black800 : dark ? appColors.black300 : appColors.black400,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
