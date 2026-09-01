import CtaSection from "@/components/home/CtaSection";
import { DemoStage } from "./DemoStage";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

// 데모 본문 묶음 - 무대(폰 + 여정) + 다운로드 CTA.
// en/ja 라우트가 locale만 바꿔 그대로 재사용한다.
export default function DemoSections({ locale }: { locale: Locale }) {
  return (
    <main>
      <section className="overflow-x-clip border-b border-slate-200 bg-slate-50 transition-colors duration-500 dark:border-white/10 dark:bg-app-black-900">
        <DemoStage locale={locale} />
      </section>
      <CtaSection copy={getMessages(locale).home.finalCta} locale={locale} demoLink={false} />
    </main>
  );
}
