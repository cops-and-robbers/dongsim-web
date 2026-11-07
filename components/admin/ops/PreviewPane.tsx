import type { ReactNode } from "react";

// 편집 화면 오른쪽의 "사용자에게 이렇게 보여요" 칸 (docs/admin-ui.md "운영 화면 원칙").
// 저장하기 전 값으로 결과를 그리는 자리다. 넓은 화면에서는 왼쪽을 스크롤해도 따라 내려온다.
export function PreviewPane({ title = "사용자에게 이렇게 보여요", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="self-start lg:sticky lg:top-0">
      <p className="mb-2 text-center text-[13px] font-semibold text-sd-fg-subtle">{title}</p>
      {children}
    </div>
  );
}
