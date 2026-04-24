import Image from "next/image";

type Props = {
  className?: string;
};

export default function CopIcon({ className }: Props) {
  return (
    <Image
      src="/characters/police.svg"
      alt="경찰 캐릭터"
      width={213}
      height={219}
      priority
      className={`object-contain ${className ?? ""}`}
    />
  );
}
