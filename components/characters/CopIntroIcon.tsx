import Image from "next/image";

type Props = {
  className?: string;
};

export default function CopIntroIcon({ className }: Props) {
  return (
    <Image
      src="/characters/police-intro.svg"
      alt="경찰 캐릭터 인트로 포즈"
      width={145}
      height={248}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
