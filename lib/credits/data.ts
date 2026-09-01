// 크레딧 정본 접근(#82). 인원·기여가 바뀌면 content/credits/credits.json 만
// 고친다 - 앱은 웹뷰로 가져가므로 재배포·심사가 필요 없다 (FE #519).
//
// 원본: FE lib/features/credits/domain/credit_member.dart 의 creditMembers·
// creditHelpers. 앱 크레딧에 없는 마케팅(최유정)은 웹 정본에서 합류한다.

import credits from "@/content/credits/credits.json";

export type CreditRole = "Frontend" | "Backend" | "Design" | "Marketing";
export type SocialType = "github" | "instagram" | "linkedin" | "blog";

/** 기여 티어 - 앱 ContributionTier 와 같은 다섯 단계다 */
export type ContributionTier = "tier1" | "tier2" | "tier3" | "tier4" | "tier5";

export type CreditMember = {
  name: string;
  role: CreditRole;
  /** 두 장 이상이면 화면에서 은은히 교차한다 */
  photos: string[];
  links: { type: SocialType; url: string }[];
};

export type CreditHelper = {
  name: string;
  role: string;
  tier: ContributionTier;
};

export type CreditsData = {
  members: CreditMember[];
  helpers: CreditHelper[];
};

export const CREDITS: CreditsData = credits as CreditsData;
