"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  OverviewIcon,
  UsersIcon,
  GamesIcon,
  ReportIcon,
  BugIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/admin/icons";
import { formatAgo, readRecent, recentHref, type RecentItem } from "@/lib/admin/recentViewed";

type Command = {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  run: () => void;
  /** 구역 이름. 앞 명령과 다를 때 그 위에 한 번 적는다. */
  section?: string;
};

// 메뉴 이동보다 먼저 보이되, 메뉴가 스크롤 아래로 밀려 사라지지 않을 만큼만
const RECENT_LIMIT = 5;

function navCommands(router: ReturnType<typeof useRouter>): Command[] {
  const section = "바로 가기";
  return [
    {
      id: "overview",
      label: "개요",
      hint: "대시보드",
      icon: <OverviewIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin"),
    },
    {
      id: "users",
      label: "유저 목록",
      hint: "가입 유저 조회",
      icon: <UsersIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin/users"),
    },
    {
      id: "games",
      label: "게임 목록",
      hint: "게임 세션 조회",
      icon: <GamesIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin/games"),
    },
    {
      id: "reports",
      label: "신고",
      hint: "신고 확인·처리",
      icon: <ReportIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin/reports"),
    },
    {
      id: "bugs",
      label: "버그 제보",
      hint: "버그 제보 확인·처리",
      icon: <BugIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin/bugs"),
    },
    {
      id: "app-config",
      label: "앱 설정",
      hint: "점검, 버전, 광고, 배너",
      icon: <SlidersIcon className="h-[18px] w-[18px]" />,
      run: () => router.push("/admin/app-config"),
    },
  ].map((c) => ({ ...c, section }));
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [now, setNow] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:open-command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setSel(0);
      // 다른 탭에서 본 것까지 담기게 열 때마다 읽는다
      setRecents(readRecent().slice(0, RECENT_LIMIT));
      setNow(Date.now());
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const commands = useMemo<Command[]>(
    () => [
      ...recents.map((r) => ({
        id: `recent-${r.kind}-${r.id}`,
        label: r.title,
        hint: `${r.detail} · ${formatAgo(r.at, now)}`,
        icon:
          r.kind === "user" ? (
            <UsersIcon className="h-[18px] w-[18px]" />
          ) : (
            <GamesIcon className="h-[18px] w-[18px]" />
          ),
        run: () => router.push(recentHref(r)),
        section: "최근 본 항목",
      })),
      ...navCommands(router),
    ],
    [router, recents, now]
  );

  const filtered = commands.filter((c) =>
    (c.label + c.hint).toLowerCase().includes(query.toLowerCase())
  );

  const runAt = (i: number) => {
    const c = filtered[i];
    if (!c) return;
    setOpen(false);
    c.run();
  };

  // 항목이 늘어 목록이 스크롤된다. 키보드로 옮길 때만 따라간다(마우스로 짚을 때 움직이면 목록이 손 밑에서 도망간다)
  const moveTo = (next: number) => {
    setSel(next);
    listRef.current
      ?.querySelector(`[data-command="${next}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(Math.min(sel + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(Math.max(sel - 1, 0));
    } else if (e.key === "Enter") {
      // 한글 조합 중 Enter 는 신호가 두 번 와서 닫히는 동안 명령이 또 돌 수 있다
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      runAt(sel);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-sd-fg/40 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-sd-line bg-sd-surface shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-sd-hairline px-4">
              <SearchIcon className="h-4 w-4 shrink-0 text-sd-fg-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSel(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="어디로 갈까요? 명령을 검색하세요"
                className="h-12 flex-1 bg-transparent text-[15px] font-medium text-sd-fg outline-none placeholder:text-sd-placeholder"
              />
              <kbd className="rounded-md bg-sd-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-sd-fg-subtle">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-sd-fg-subtle">
                  결과가 없어요
                </p>
              ) : (
                filtered.map((c, i) => (
                  <Fragment key={c.id}>
                    {/* 최근 본 항목이 없으면 구역이 하나뿐이라 이름을 달지 않는다 */}
                    {recents.length > 0 && c.section !== filtered[i - 1]?.section && (
                      <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-sd-fg-subtle">
                        {c.section}
                      </p>
                    )}
                    <button
                      data-command={i}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => runAt(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        i === sel
                          ? "bg-accent/10 text-accent"
                          : "text-sd-fg-muted"
                      }`}
                    >
                      <span
                        className={
                          i === sel
                            ? ""
                            : "text-sd-fg-subtle"
                        }
                      >
                        {c.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[14px] font-semibold">
                          {c.label}
                        </span>
                        <span className="block text-[12px] text-sd-fg-subtle">
                          {c.hint}
                        </span>
                      </span>
                      {i === sel && (
                        <span className="text-[11px] font-semibold text-sd-fg-subtle">
                          Enter
                        </span>
                      )}
                    </button>
                  </Fragment>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
