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
        <Link href="/" aria-label={`${BRAND.game} 홈`} className="flex items-center">
          <Image
            src="/brand/header-logo.svg"
            alt="경찰과 도둑(경도) - 동심지키미 GPS 술래잡기 게임"
            width={285}
            height={46}
            priority
            unoptimized
            className="h-5 w-auto md:h-6"
          />
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
