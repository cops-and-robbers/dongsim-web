"use client";

import Link from "next/link";

// 초대코드: 클릭하면 게임 상세로 바로 이동한다.
export function InviteCode({ code, gameId }: { code: string; gameId: string }) {
  return (
    <Link
      href={`/admin/games/${gameId}`}
      className="font-mono text-[13px] font-bold tracking-wide text-sd-fg transition hover:text-accent"
    >
      {code}
    </Link>
  );
}
