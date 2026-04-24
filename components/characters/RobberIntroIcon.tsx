import Image from "next/image";

type Props = {
  className?: string;
};

export default function RobberIntroIcon({ className }: Props) {
  return (
    <Image
      src="/characters/robber-intro.svg"
      alt="도둑 캐릭터 인트로 포즈"
      width={159}
      height={237}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
