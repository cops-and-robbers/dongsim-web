"use client";

import { ReactNode } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

type Animation = "fadeInUp" | "fadeInLeft" | "fadeInRight" | "scaleIn";

type Props = {
  children: ReactNode;
  animation?: Animation;
  delayMs?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li";
};

export default function ScrollReveal({
  children,
  animation = "fadeInUp",
  delayMs = 0,
  className = "",
  as: Tag = "div",
}: Props) {
  const { ref, visible } = useScrollAnimation<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      className={`scroll-animate anim-${animation} ${visible ? "visible" : ""} ${className}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
