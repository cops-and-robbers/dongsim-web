"use client";

import Link from "next/link";
import { useListView } from "@/components/admin/ListViewProvider";
import { BackIcon } from "@/components/admin/split/SplitParts";
import { rememberedListHref } from "@/lib/admin/useListParams";

// 두 칸 보기에서 고른 항목(u, room, h)은 표에서는 뜻이 없고, 남아 있으면 표가 다시 전체 화면으로 넘겨 버린다
const SELECTION = ["u", "room", "h"];
function tableHref(list: string): string {
  const url = new URL(rememberedListHref(list), "http://x");
  for (const k of SELECTION) url.searchParams.delete(k);
  const q = url.searchParams.toString();
  return q ? `${list}?${q}` : list;
}

/**
 * 전체 화면 상세 위의 "목록으로" (docs/admin-ui.md "목록 보기 고르기").
 * 표로 보는 사람은 보던 표(검색어, 거르기, 쪽)로 돌아가고, 두 칸으로 보는 사람은 이 항목을 고른 두 칸 화면으로 간다.
 * 표에서 고른 항목 주소(?u=)로 돌아가면 다시 전체 화면으로 넘어와 버려서 보기에 따라 갈 곳을 나눈다
 */
export function BackToList({ list, selectedHref, label }: { list: string; selectedHref: string; label: string }) {
  const { view } = useListView();
  return (
    <Link
      href={view === "table" ? tableHref(list) : selectedHref}
      className="-ml-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-[13.5px] font-semibold text-sd-fg-subtle hover:bg-sd-pressed hover:text-sd-fg"
    >
      <BackIcon />
      {label}
    </Link>
  );
}
