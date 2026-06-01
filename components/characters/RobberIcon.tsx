import Image from "next/image";

type Props = {
  className?: string;
};

export default function RobberIcon({ className }: Props) {
  return (
    <Image
      src="/characters/robber.svg"
      alt="도둑 캐릭터"
      width={160}
      height={145}
      priority
      unoptimized
      className={`object-contain ${className ?? ""}`}
    />
  );
}
