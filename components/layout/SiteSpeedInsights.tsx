"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { skipAdmin } from "@/lib/speedInsights";

/**
 * 실사용자 속도 측정(Vercel Speed Insights). 어드민 화면은 보내지 않는다(#339).
 * beforeSend 는 함수라 서버 컴포넌트인 루트 문서에서 바로 넘길 수 없어 여기서 감싼다.
 */
export default function SiteSpeedInsights() {
  return <SpeedInsights beforeSend={skipAdmin} />;
}
