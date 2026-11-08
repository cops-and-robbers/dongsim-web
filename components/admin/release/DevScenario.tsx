"use client";

import { MOCK_SCENARIOS } from "@/lib/admin-mock/release";

// 로컬 개발 서버에서만: 출시 보드를 상황마다 바꿔 본다. 운영 빌드에는 들어가지 않는다(page.tsx 가 개발일 때만 불러온다)
export default function DevScenario({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-sd-line px-4 py-3 text-[13px] text-sd-fg-muted">
      <span className="font-semibold">로컬 가짜 상황</span>
      {MOCK_SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          aria-pressed={value === s.id}
          className={`rounded-full px-3 py-1 transition ${value === s.id ? "bg-sd-inverted-bg text-sd-inverted-fg" : "bg-sd-fill hover:bg-sd-gray-300"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
