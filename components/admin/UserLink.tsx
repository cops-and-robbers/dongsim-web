"use client";

import Link from "next/link";

// 탈퇴하면 유저 행이 지워지고 신고에는 번호만 남는다. 서버는 닉네임을 이 값으로 내려 준다(BE User.UNKNOWN_NICKNAME)
const WITHDRAWN_NICKNAME = "알수없음";

// 신고, 버그 상세의 닉네임. 처리 메모를 쓰다 확인하러 가는 링크라 새 탭으로 열어 쓰던 내용을 지킨다.
// 탈퇴한 유저는 갈 화면이 없어 글자로만 둔다.
export function UserLink({ userId, nickname }: { userId: string; nickname: string }) {
  if (nickname === WITHDRAWN_NICKNAME) return <>{nickname}</>;
  return (
    <Link
      href={`/admin/users/${userId}`}
      target="_blank"
      rel="noopener"
      aria-label={`${nickname} 유저 상세 (새 탭에서 열려요)`}
      className="rounded outline-none transition hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
    >
      {nickname}
    </Link>
  );
}
