/* eslint-disable @next/next/no-img-element */

// 아바타. 기본은 뉴트럴 회색 원(닉네임 첫 글자) 하나로 통일한다.
// 팀 맥락에서만 캐릭터(경찰=냥파/도둑=도둥이)를 쓴다 - 데이터에 의미가 붙는 경우.

export function Avatar({
  name,
  team,
  size = 36,
}: {
  name: string;
  team?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };

  if (team === "POLICE" || team === "ROBBER") {
    const src =
      team === "POLICE" ? "/characters/police.svg" : "/characters/robber.svg";
    const tint =
      team === "POLICE"
        ? "bg-sd-info-weak"
        : "bg-sd-positive-weak";
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${tint}`}
        style={style}
      >
        <img src={src} alt="" className="h-[66%] w-auto" />
      </span>
    );
  }

  const ch = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-sd-gray-200 text-[14px] font-bold text-sd-fg-subtle"
      style={style}
    >
      {ch}
    </span>
  );
}
