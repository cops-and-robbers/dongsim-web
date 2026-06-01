import Image from "next/image";

type Props = {
  className?: string;
};

export default function JailedRobberIcon({ className }: Props) {
  return (
    <Image
      src="/characters/robber-jailed.svg"
      alt="감옥에 갇힌 도둑 캐릭터"
      width={140}
      height={116}
      unoptimized
      className={`object-contain ${className ?? ""}`}
    />
  );
}
