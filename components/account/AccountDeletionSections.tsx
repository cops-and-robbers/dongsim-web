import Image from "next/image";
import Link from "next/link";
import AccountDeletionAppGuide from "@/components/account/AccountDeletionAppGuide";
import AccountDeletionFlow from "@/components/account/AccountDeletionFlow";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import Container from "@/components/ui/Container";
import { BRAND } from "@/lib/constants";
import {
  BRAND_NAME,
  COMPANY_NAME,
  localizedPath,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

const LINK =
  "font-semibold text-brand-blue underline underline-offset-4 dark:text-brand-green";

export default function AccountDeletionSections({
  locale,
}: {
  locale: Locale;
}) {
  const copy = getMessages(locale).accountDeletion;
  const homeHref = localizedPath("/", locale);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: copy.homeLabel, path: homeHref },
          { name: copy.title, path: localizedPath("/delete-account", locale) },
        ]}
      />

      <section className="py-14 sm:py-20 lg:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:gap-20">
            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-400">
                {BRAND_NAME[locale]} · {COMPANY_NAME[locale]}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {copy.lead}
              </p>
            </div>

            <div className="relative mt-14 lg:mt-0">
              {/* 패널 뒤에서 머리만 빼꼼 - 라이트=냥파, 다크=도둥이 */}
              <div className="pointer-events-none absolute inset-x-0 bottom-full flex translate-y-3 justify-center">
                <Image
                  src="/characters/police-lose-body.svg"
                  alt=""
                  width={120}
                  height={120}
                  className="h-auto w-30 dark:hidden"
                />
                <Image
                  src="/characters/robber-lose-body.svg"
                  alt=""
                  width={112}
                  height={112}
                  className="hidden h-auto w-28 dark:block"
                />
              </div>
              <div className="relative rounded-[1.75rem] bg-slate-100 p-7 sm:p-8 dark:bg-app-black-900">
                <AccountDeletionFlow
                  intro={copy.web}
                  copy={copy.flow}
                  homeHref={homeHref}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-16 sm:py-24 dark:bg-white/3">
        <Container>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-ink dark:text-white">
            {copy.app.title}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
            {copy.app.body}
          </p>
          <AccountDeletionAppGuide copy={copy.app} locale={locale} />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-ink dark:text-white">
            {copy.data.title}
          </h2>
          <dl className="mt-10 border-b border-slate-200 dark:border-white/10">
            {copy.data.groups.map((group) => (
              <div
                key={group.label}
                className="grid gap-2 border-t border-slate-200 py-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8 dark:border-white/10"
              >
                <dt className="font-bold text-slate-900 dark:text-white">
                  {group.label}
                </dt>
                <dd className="max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">
                  {group.body}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6">
            <Link href={localizedPath("/privacy", locale)} className={LINK}>
              {copy.data.privacyLink}
            </Link>
          </p>

          <div className="mt-16 sm:mt-20">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {copy.help.title}
            </h2>
            <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
              {copy.help.body}{" "}
              <a href={`mailto:${BRAND.email}`} className={LINK}>
                {BRAND.email}
              </a>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
