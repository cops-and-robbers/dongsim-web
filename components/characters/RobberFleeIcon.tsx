import Image from "next/image";

type Props = {
  className?: string;
};

export default function RobberFleeIcon({ className }: Props) {
  return (
    <Image
      src="/characters/robber-flee.svg"
      alt="경찰을 피해 도망가는 도둑 캐릭터"
      width={144}
      height={164}
      priority
      unoptimized
      className={`object-contain ${className ?? ""}`}
    />
  );
}
