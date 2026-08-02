import TeamHeroSection from "@/components/team/TeamHeroSection";
import TeamRecordsSection from "@/components/team/TeamRecordsSection";
import TeamMomentsSection from "@/components/team/TeamMomentsSection";
import TeamPreviewSection from "@/components/team/TeamPreviewSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";

const HOME_LABEL: Record<Locale, string> = {
  ko: "홈",
  en: "Home",
  ja: "ホーム",
};

// 회사 소개 본문 묶음. 연혁·수상·QA 현장(한국 특화 내용)은 한국어에서만 노출한다.
export default function TeamSections({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).team;
  const teamLabel =
    CHROME[locale].nav.find((item) => item.path === "/team")?.label ?? "";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: HOME_LABEL[locale], path: localizedPath("/", locale) },
          { name: teamLabel, path: localizedPath("/team", locale) },
        ]}
      />
      <TeamHeroSection copy={copy} />
      <TeamRecordsSection copy={copy.records} />
      <TeamMomentsSection copy={copy.moments} />
      {locale === "ko" && (
        <TeamPreviewSection copy={copy.preview} locale={locale} />
      )}
    </>
  );
}
