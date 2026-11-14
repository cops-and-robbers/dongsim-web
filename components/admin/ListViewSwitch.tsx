"use client";

import { motion } from "motion/react";
import { useListView } from "@/components/admin/ListViewProvider";
import { SplitViewIcon, TableViewIcon } from "@/components/admin/icons";
import type { ListView } from "@/lib/admin/listView";

const OPTIONS: { value: ListView; label: string; hint: string; Icon: typeof SplitViewIcon }[] = [
  { value: "split", label: "두 칸으로 보기", hint: "목록 옆에 상세가 열려요", Icon: SplitViewIcon },
  { value: "table", label: "표로 보기", hint: "줄을 누르면 전체 화면으로 열려요", Icon: TableViewIcon },
];

/**
 * 목록 보기 고르기(docs/admin-ui.md "목록 보기 고르기"). 유저, 게임 목록 머리에 둔다.
 * 고르면 내 계정에 남아 두 화면 모두 그 모양으로 열린다. 표가 들어갈 폭이 아니면(폰) 숨긴다.
 * 아이콘만 두되 마우스를 올리면 무엇이 바뀌는지 말해 주고, 화면 읽기 프로그램에는 이름으로 알린다
 */
export function ListViewSwitch() {
  const { chosen, wide, setView } = useListView();
  if (!wide) return null;
  return (
    <div role="radiogroup" aria-label="목록 보기" className="inline-flex shrink-0 rounded-[10px] bg-sd-gray-200 p-[3px]">
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const on = chosen === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={`${label} · ${hint}`}
            onClick={() => setView(value)}
            className={`relative isolate flex h-7 w-8 items-center justify-center rounded-[8px] transition-colors ${on ? "text-sd-fg" : "text-sd-fg-subtle hover:text-sd-fg-muted"}`}
          >
            {/* 미끄러지는 바탕은 클릭을 받지 않는다(#325) */}
            {on && (
              <motion.span
                layoutId="list-view-switch"
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-[8px] bg-sd-surface shadow-[0_1px_2px_rgba(2,32,71,0.1)]"
                transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
              />
            )}
            <Icon className="h-[16px] w-[16px]" />
          </button>
        );
      })}
    </div>
  );
}
