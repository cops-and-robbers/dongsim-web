/**
 * 발자국 아이콘 - 동물 발바닥(중앙 패드 + 발가락 4개) 모양. 경찰(고양이)·도둑(생쥐)
 * 캐릭터에 맞춘 모티프로, currentColor 기반이라 부모 텍스트 색상을 따라감.
 *
 * 동일 SVG가 여러 곳(HeroSection, CharactersSection, FeaturesSection, PhoneMockup,
 * TeamGridSection)에서 쓰이므로 path 문자열을 단일 원본으로 export 해 재사용한다.
 * 한 화면에서 다수 렌더할 땐 이 문자열을 `<symbol>+<use>`로 정의·참조하면 효율적이다.
 */

export const SHOEPRINT_PATH =
  "M14 14.5C17.2 14.5 19.8 16 20.6 18.3C21.3 20.3 20.8 22.6 19.2 24.1C17.8 25.4 16 26 14 26C12 26 10.2 25.4 8.8 24.1C7.2 22.6 6.7 20.3 7.4 18.3C8.2 16 10.8 14.5 14 14.5ZM5.2 9a2.3 2.6 0 1 0 4.6 0a2.3 2.6 0 1 0 -4.6 0ZM11.7 6.5a2.3 2.6 0 1 0 4.6 0a2.3 2.6 0 1 0 -4.6 0ZM18.2 9a2.3 2.6 0 1 0 4.6 0a2.3 2.6 0 1 0 -4.6 0Z";

type Props = {
  size?: number;
  rotate?: number;
  className?: string;
};

export default function Footprint({ size, rotate = 0, className }: Props) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 fill-current ${className ?? ""}`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path d={SHOEPRINT_PATH} />
    </svg>
  );
}
