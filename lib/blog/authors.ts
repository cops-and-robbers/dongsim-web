import { FOUNDER, TEAM_MEMBERS } from "@/lib/constants";

// 블로그 작성자 이름 → 팀 소개의 멤버 프로필 매핑.
// 노션 "작성자" 속성에 팀원 이름을 그대로 쓰면 아바타가 자동으로 붙는다.
// 일치하는 팀원이 없으면 null — 화면에선 이름 텍스트만 보여준다.
export function findAuthorProfile(
  name: string
): { name: string; photo: string } | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const member = [FOUNDER, ...TEAM_MEMBERS].find(
    (m) => m.name.replace(/\s/g, "") === trimmed.replace(/\s/g, "")
  );
  return member ? { name: member.name, photo: member.photo } : null;
}
