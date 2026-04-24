"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function NavLink({
  href,
  children,
  className = "",
  onClick,
}: Props) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative text-sm font-medium transition-colors ${
        active
          ? "text-brand-blue dark:text-brand-green"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      } ${className}`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-5.25 h-0.5 rounded-full bg-brand-blue dark:bg-brand-green" />
      )}
    </Link>
  );
}
