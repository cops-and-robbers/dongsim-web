// 크레딧 정본 접근(#82). 인원·기여가 바뀌면 content/credits/credits.json 만
// 고친다 - 앱은 웹뷰로 가져가므로 재배포·심사가 필요 없다 (FE #519).
// 도와준 분들 명단은 웹 고마운 분들과 같은 어드민 "동심지키미 소개" 값을 쓴다(#250).
//
// 원본: FE lib/features/credits/domain/credit_member.dart 의 creditMembers.
// 앱 크레딧에 없는 마케팅(최유정)은 웹 정본에서 합류한다.

import credits from "@/content/credits/credits.json";

export type CreditRole = "Frontend" | "Backend" | "Design" | "Marketing";
export type SocialType = "github" | "instagram" | "linkedin" | "blog";

export type CreditMember = {
  name: string;
  role: CreditRole;
  /** 두 장 이상이면 화면에서 은은히 교차한다 */
  photos: string[];
  links: { type: SocialType; url: string }[];
};

export type CreditsData = {
  members: CreditMember[];
};

export const CREDITS: CreditsData = credits as CreditsData;
