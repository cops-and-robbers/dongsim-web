/**
 * 쉐브론(아래 화살표) 아이콘 - currentColor 기반이라 부모 텍스트 색상을 따라감.
 * FAQ 아코디언 등에서 펼침 표시로 사용.
 */

type Props = {
  className?: string;
};

export default function Chevron({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className ?? ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
