import Image from "next/image";

type Props = {
  className?: string;
};

export default function CopChaseIcon({ className }: Props) {
  return (
    <Image
      src="/characters/police-chase.svg"
      alt="도둑을 쫓는 경찰 캐릭터"
      width={158}
      height={202}
      priority
      unoptimized
      className={`object-contain ${className ?? ""}`}
    />
  );
}
