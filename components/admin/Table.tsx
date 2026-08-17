"use client";

import type { MouseEvent, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

// 어드민 데이터 테이블. sticky 헤더 지원 + 얇은 행 구분선.
// sticky=true 면 부모 스크롤 컨테이너 안에서 컬럼 헤더가 상단에 고정된다.

export function Table({
  head,
  children,
  sticky = false,
}: {
  head: ReactNode;
  children: ReactNode;
  sticky?: boolean;
}) {
  const table = (
    <table
      className={`w-full border-separate border-spacing-0 text-sm [&_tbody_tr:last-child_td]:border-b-0 ${
        sticky ? "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10" : ""
      }`}
    >
      <thead>
        <tr className="text-left">{head}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );

  // sticky(리스트 페이지): 부모 스크롤 컨테이너가 x/y 스크롤 처리.
  // non-sticky(카드 내 소형 표): 가로 오버플로우 래퍼로 화면 폭 안에 담고 스크롤.
  return sticky ? table : <div className="overflow-x-auto">{table}</div>;
}

export function Th({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={`border-b border-sd-hairline bg-sd-surface px-5 pb-2.5 pt-4 text-[12px] font-medium text-sd-fg-subtle ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * 데이터 한 줄. href 나 onActivate 를 주면 줄 전체가 눌린다.
 *
 * tr 은 초점 대상으로 만들지 않는다. 표를 읽는 도구가 줄과 버튼을 헷갈린다.
 * 키보드로 옮겨 다니는 길은 칸 안의 링크·버튼이 그대로 맡는다.
 */
export function Tr({
  children,
  index = 0,
  href,
  onActivate,
}: {
  children: ReactNode;
  index?: number;
  href?: string;
  onActivate?: () => void;
}) {
  const router = useRouter();
  const clickable = Boolean(href || onActivate);

  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!clickable) return;

    // "삭제"를 눌렀는데 상세로 넘어가면 안 된다
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;

    // 어드민에서는 아이디·닉네임을 끌어서 복사하는 일이 잦다
    if (window.getSelection()?.toString()) return;

    if (!href) {
      onActivate?.();
      return;
    }
    if (event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener");
    else router.push(href);
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      onClick={handleClick}
      className={`group/row transition-colors hover:bg-sd-pressed active:bg-sd-selected ${
        clickable ? "cursor-pointer" : ""
      }`}
    >
      {children}
    </motion.tr>
  );
}

export function Td({
  children,
  className = "",
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...rest}
      className={`border-b border-sd-hairline px-5 py-3 align-middle text-[14px] text-sd-fg-muted ${className}`}
    >
      {children}
    </td>
  );
}
