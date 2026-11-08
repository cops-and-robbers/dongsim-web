import TeamHeroSection from "@/components/team/TeamHeroSection";
import TeamRecordsSection from "@/components/team/TeamRecordsSection";
import TeamMomentsSection from "@/components/team/TeamMomentsSection";
import TeamPreviewSection from "@/components/team/TeamPreviewSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";
import { companyRecords } from "@/lib/company/server";

const HOME_LABEL: Record<Locale, string> = {
  ko: "홈",
  en: "Home",
  ja: "ホーム",
};

// 회사 소개 본문 묶음. 구성원 미리보기만 한국어 전용이고, 이력은 그 언어로 번역한 줄만 나온다.
export default async function TeamSections({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).team;
  const records = await companyRecords(locale);
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
      <TeamHeroSection copy={copy} locale={locale} />
      <TeamRecordsSection copy={copy.records} records={records} />
      <TeamMomentsSection copy={copy.moments} />
      {locale === "ko" && (
        <TeamPreviewSection copy={copy.preview} locale={locale} />
      )}
    </>
  );
}
