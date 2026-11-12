"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { BackIcon } from "./SplitParts";

/**
 * 두 칸 화면(#315, 시안 "경도 어드민 유저와 게임").
 * 왼쪽 목록은 그대로 두고 오른쪽에서 상세가 바뀐다. 여러 명, 여러 판을 이어서 보는 일이 많아서
 * 상세로 들어갔다 돌아오며 목록 위치를 잃는 단계를 없앴다.
 * 넓은 화면(lg 이상)은 두 칸을 나란히, 좁은 화면은 고른 것이 있을 때만 상세가 목록 자리를 차지하고 위에 "목록으로"가 붙는다
 */
export function SplitView({
  list,
  detail,
  selectionKey,
  closeHref,
  listLabel,
  detailLabel,
}: {
  list: ReactNode;
  detail: ReactNode;
  /** 고른 항목. 없으면 null. 바뀌면 상세 칸을 맨 위로 올리고 살짝 올라오며 바뀐다 */
  selectionKey: string | null;
  /** 좁은 화면에서 "목록으로" 갈 주소 */
  closeHref: string;
  listLabel: string;
  detailLabel: string;
}) {
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectionKey]);

  const selected = selectionKey !== null;
  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label={listLabel}
        className={`min-h-0 w-full shrink-0 flex-col border-sd-hairline bg-sd-surface lg:flex lg:w-[396px] lg:border-r ${selected ? "hidden" : "flex"}`}
      >
        {list}
      </section>
      <section
        ref={detailRef}
        aria-label={detailLabel}
        className={`min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-sd-canvas lg:block ${selected ? "block" : "hidden"}`}
      >
        {selected && (
          <div className="sticky top-0 z-10 flex items-center border-b border-sd-hairline bg-sd-surface/95 px-2 py-1.5 backdrop-blur lg:hidden">
            <Link href={closeHref} scroll={false} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[14px] font-semibold text-sd-fg-muted hover:bg-sd-pressed">
              <BackIcon />
              목록으로
            </Link>
          </div>
        )}
        <div key={selectionKey ?? "none"} className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-5 pb-16 motion-safe:animate-[detailenter_0.18s_ease-out] sm:px-7 sm:pt-7">
          {detail}
        </div>
      </section>
    </div>
  );
}

/** 상세 칸만 담는 한 화면(크게 보기, 다른 곳에서 링크로 열 때). 두 칸 화면의 상세와 같은 폭과 바탕 */
export function DetailPage({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-sd-canvas">
      <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-5 pb-16 sm:px-7 sm:pt-7">{children}</div>
    </div>
  );
}
