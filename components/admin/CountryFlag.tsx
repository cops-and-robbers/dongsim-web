import "flag-icons/css/flag-icons.min.css";
import { countryName } from "@/lib/admin/country";

/**
 * 국기 (#319). 국기 이모지는 윈도우가 못 그려 "JP" 글자로 나와서, OS 마다 같은 모양인 SVG 국기를 쓴다(flag-icons, MIT).
 * CSS 는 나라마다 배경 그림만 걸어 두어 화면에 뜬 나라의 그림만 받는다.
 * 일본처럼 흰 바탕 국기가 흰 카드에서 경계를 잃지 않게 옅은 테두리를 두른다
 */
export function CountryFlag({ code, size = 14 }: { code: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={`fi fi-${code.toLowerCase()} inline-block shrink-0 rounded-[3px] bg-cover bg-center shadow-[0_0_0_1px_rgba(2,32,71,0.12)]`}
      style={{ width: Math.round((size * 4) / 3), height: size, lineHeight: `${size}px` }}
    />
  );
}

/**
 * 국기와 나라 이름. 국기만으로는 낯선 나라를 못 알아보고, 색만으로 뜻을 전하지 않으려고 이름을 함께 쓴다.
 * plain 은 다른 표시(운영자, 위치 미동의)와 같은 회색 칩, inline 은 글자 줄 안에 넣을 때
 */
export function CountryTag({ code, variant = "plain" }: { code: string; variant?: "plain" | "inline" }) {
  const name = countryName(code);
  if (variant === "inline")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap" title={name}>
        <CountryFlag code={code} size={11} />
        {name}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-sd-gray-200 px-[7px] py-0.5 text-[11.5px] font-semibold leading-[1.4] text-sd-fg-muted" title={`주로 ${name}에서 플레이해요`}>
      <CountryFlag code={code} size={11} />
      {name}
    </span>
  );
}
