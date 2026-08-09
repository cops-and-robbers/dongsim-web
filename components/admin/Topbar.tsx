"use client";

import { SearchIcon } from "@/components/admin/icons";

function openCommand() {
  window.dispatchEvent(new CustomEvent("admin:open-command"));
}

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sd-line bg-sd-fill/80 px-6 backdrop-blur-md">
      <button
        type="button"
        onClick={openCommand}
        className="group flex h-9 max-w-sm flex-1 items-center gap-2.5 rounded-xl border border-sd-line bg-sd-surface px-3 text-left transition hover:border-sd-line"
      >
        <SearchIcon className="h-4 w-4 text-sd-fg-subtle" />
        <span className="flex-1 text-[13px] font-medium text-sd-fg-subtle">
          빠른 검색·이동
        </span>
        <kbd className="rounded-md bg-sd-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-sd-fg-subtle">
          ⌘K
        </kbd>
      </button>

      <span className="ml-auto flex items-center gap-1.5 rounded-xl bg-sd-positive-weak px-2.5 py-1.5 text-[12px] font-semibold text-sd-positive">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sd-positive" />
        목 데이터
      </span>
    </header>
  );
}
