"use client";

import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
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

export function Tr({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      className="group/row transition-colors hover:bg-sd-pressed active:bg-sd-selected"
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
