"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";

// 카드형 / 목록형 전환.
//
// 고른 값은 <html data-blog-view> 로 심고 CSS가 어느 쪽을 보여줄지 정한다(globals.css).
// 이 컴포넌트는 목록을 직접 그리지 않는다. 목록을 React 상태로 고르면
// 서버가 그린 카드형이 먼저 보였다가 목록형으로 튀기 때문.
// 첫 페인트 값은 app/layout.tsx 의 <head> 스크립트가 이미 심어둔다.
//
// 그래서 여기서는 <html> 속성을 하나의 외부 저장소로 보고 구독한다.
// React 상태를 따로 두면 진짜 값(DOM)과 두 벌이 되어 어긋날 수 있다.

export type BlogView = "card" | "list";

const STORAGE_KEY = "blog-view";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): BlogView {
  return document.documentElement.dataset.blogView === "list" ? "list" : "card";
}

// 서버에는 저장값이 없다. 기본값은 카드형.
function getServerSnapshot(): BlogView {
  return "card";
}

function writeView(next: BlogView) {
  const root = document.documentElement;
  if (next === "list") root.dataset.blogView = "list";
  else delete root.dataset.blogView;
  // 전환 애니메이션은 한 번이라도 누른 뒤부터. 첫 로딩부터 걸면 표지가
  // 투명하게 시작해 가장 큰 요소가 늦게 그려진 것으로 잡힌다(LCP).
  root.dataset.blogAnimate = "";

  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 사생활 보호 모드 등 저장이 막힌 환경. 이번 방문에만 적용되면 충분하다.
  }

  listeners.forEach((notify) => notify());
}

type Labels = { label: string; card: string; list: string };

export default function BlogViewToggle({ labels }: { labels: Labels }) {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // 저장값을 반영하느라 알약이 움직이는 것과, 눌러서 움직이는 것을 구분한다.
  // 누르지도 않았는데 미끄러지면 오작동처럼 보인다.
  const [pressed, setPressed] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  // 같은 페이지에 토글이 둘 이상 있어도 알약이 서로 넘어가지 않게 id를 나눈다.
  const pillId = useId();

  const change = (next: BlogView, moveFocus = false) => {
    setPressed(true);
    writeView(next);
    if (moveFocus) {
      groupRef.current
        ?.querySelectorAll<HTMLButtonElement>("button")
        [next === "card" ? 0 : 1]?.focus();
    }
  };

  const options: { value: BlogView; label: string; icon: React.ReactNode }[] = [
    { value: "card", label: labels.card, icon: <CardViewIcon /> },
    { value: "list", label: labels.list, icon: <ListViewIcon /> },
  ];

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={labels.label}
      onKeyDown={(e) => {
        // 라디오 그룹은 화살표로 옮기는 게 표준 동작이다.
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          change("list", true);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          change("card", true);
        }
      }}
      className="inline-flex gap-0.5 rounded-full bg-slate-100 p-1 dark:bg-app-black-900"
    >
      {options.map((option) => {
        const active = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            tabIndex={active ? 0 : -1}
            onClick={() => change(option.value)}
            className={`relative rounded-full px-3.5 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:focus-visible:ring-brand-green ${
              active
                ? "text-brand-ink dark:text-white"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={
                  pressed
                    ? { type: "spring", stiffness: 400, damping: 32 }
                    : { duration: 0 }
                }
                className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-app-black-800"
              />
            )}
            <span className="relative z-10 block">{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}

function CardViewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

// 썸네일(사각형) + 제목·요약(두 줄) 구조라 목록형 한 줄과 모양이 같다.
function ListViewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <path d="M14 4h7" />
      <path d="M14 9h7" />
      <path d="M14 15h7" />
      <path d="M14 20h7" />
    </svg>
  );
}
