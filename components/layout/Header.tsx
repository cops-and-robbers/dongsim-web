import Image from "next/image";
import Link from "next/link";
import { BRAND, NAV_ITEMS } from "@/lib/constants";
import NavLink from "./NavLink";
import DownloadCTAButton from "./DownloadCTAButton";
import MobileMenu from "./MobileMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors duration-500 dark:border-white/10 dark:bg-app-black/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-white"
        >
          <Image
            src="/brand/logo-v5.png"
            alt="경찰과 도둑 로고"
            width={32}
            height={32}
            priority
            className="h-7 w-7 rounded-md md:h-8 md:w-8 md:rounded-lg"
          />
          <span className="text-sm md:text-base">{BRAND.game}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
          <DownloadCTAButton />
        </nav>

        <div className="flex items-center gap-1.5 md:hidden">
          <DownloadCTAButton />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
