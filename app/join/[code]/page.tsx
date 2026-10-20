import type { Metadata } from "next";
import { headers } from "next/headers";
import Container from "@/components/ui/Container";
import RobberIcon from "@/components/characters/RobberIcon";
import { AppleIcon, PlayIcon } from "@/components/ui/StoreIcons";
import { APP_LINKS, APP_STORE_PROVIDER_TOKEN } from "@/lib/constants";
import { storeLinksWithUtm } from "@/lib/download/campaign";
import JoinBridge from "./JoinBridge";
import InviteCode from "./InviteCode";

type Platform = "ios" | "android" | "other";

function sanitizeCode(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
}

function detectPlatform(ua: string): Platform {
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const safeCode = sanitizeCode(code);
  const description = safeCode
    ? `초대 코드 ${safeCode}로 친구가 게임에 초대했어요. 앱을 설치하고 함께 뛰어 보세요!`
    : "친구가 게임에 초대했어요. 앱을 설치하고 함께 뛰어 보세요!";

  return {
    title: { absolute: "경찰과 도둑 - 게임 초대" },
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/join/${safeCode}` },
    openGraph: {
      title: "경찰과 도둑 - 게임에 초대받았어요",
      description,
      url: `/join/${safeCode}`,
      type: "website",
      locale: "ko_KR",
    },
  };
}

function StoreButton({
  href,
  kind,
  emphasis,
}: {
  href: string;
  kind: "apple" | "play";
  emphasis: "primary" | "secondary";
}) {
  // data-store 는 JoinBridge 가 눌린 스토어를 세는 데 쓴다(app_download_click)
  const base =
    "inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-bold shadow-sm transition-colors duration-200";
  const styles =
    emphasis === "primary"
      ? "bg-brand-blue text-white hover:bg-brand-blue-light dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light"
      : "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-app-black-900 dark:text-white dark:ring-white/10 dark:hover:bg-white/5";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-store={kind === "apple" ? "appstore" : "googleplay"}
      className={`${base} ${styles}`}
      aria-label={kind === "apple" ? "App Store에서 다운로드" : "Google Play에서 다운로드"}
    >
      {kind === "apple" ? (
        <AppleIcon className="h-6 w-6 fill-current" />
      ) : (
        <PlayIcon className="h-6 w-auto" />
      )}
      <span>{kind === "apple" ? "App Store" : "Google Play"}</span>
    </a>
  );
}

export default async function JoinFallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const ui = typeof query.ui === "string" ? query.ui : undefined;
  // 행사 참가 QR 은 /join/<코드>?utm_... 로 온다. 앱이 없어 스토어로 갈 때 꼬리표를 이어 넘겨
  // 어느 행사 QR 로 와서 설치했는지 센다(/download 와 같은 규칙, lib/download/campaign.ts)
  const search = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === "string" && k.startsWith("utm_") ? [[k, v]] : [])),
  ).toString();
  const stores = storeLinksWithUtm(APP_LINKS, search ? `?${search}` : "", APP_STORE_PROVIDER_TOKEN);
  const preview =
    ui === "open" || ui === "guide" || ui === "store" ? ui : undefined;
  const safeCode = sanitizeCode(code);
  const platform = detectPlatform((await headers()).get("user-agent") ?? "");

  const appStoreButton = (
    <StoreButton
      key="apple"
      href={stores.appStore}
      kind="apple"
      emphasis="secondary"
    />
  );
  const playStoreButton = (
    <StoreButton
      key="play"
      href={stores.googlePlay}
      kind="play"
      emphasis="secondary"
    />
  );

  const buttons =
    platform === "ios"
      ? [appStoreButton, playStoreButton]
      : [playStoreButton, appStoreButton];

  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-white py-16 transition-colors duration-500 sm:py-20 dark:bg-app-black">
      <Container>
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="relative mb-6 h-28 w-28">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-brand-blue/10 blur-2xl dark:bg-brand-green/12"
            />
            <RobberIcon className="relative h-full w-full" />
          </div>

          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            게임에 초대받았어요
          </h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {platform === "other"
              ? "이 링크는 휴대폰에서 열어 주세요. 앱을 설치하면 초대받은 방으로 바로 들어갈 수 있어요."
              : "앱으로 이동하고 있어요. 자동으로 열리지 않으면 아래 버튼을 눌러 주세요."}
          </p>

          {safeCode && <InviteCode code={safeCode} />}

          <JoinBridge
            code={code}
            platform={platform}
            appStore={stores.appStore}
            playStore={stores.googlePlay}
            campaign={stores.campaign}
            preview={preview}
          >
            {buttons}
          </JoinBridge>

          <p className="mt-6 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            앱이 이미 설치되어 있다면 이 링크가 자동으로 앱에서 열려요.
          </p>
        </div>
      </Container>
    </section>
  );
}
