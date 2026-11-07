import type { ReactNode } from "react";
import { COPY, slotsOf, type CopyKey, type KioskConfig } from "@/lib/event/kiosk";

// 부스 문구 한 줄을 그린다(#221). 서버 화면(닫힘 화면)과 클라이언트 화면이 같이 써서 "use client" 를 붙이지 않는다.
// 어드민 미리보기가 "여기가 바뀌어요"를 그리게 문구 자리에 data-copy, 행사 이름이 들어간 자리에 data-spot="name" 을 붙인다.
export function renderCopy(v: { kiosk: KioskConfig; name: string }, key: CopyKey, cuts?: number): ReactNode {
  const raw = (v.kiosk.copy[key] ?? COPY[key].text).replaceAll("{컷 수}", String(cuts ?? slotsOf(v.kiosk)));
  return (
    <span data-copy={key}>
      {raw.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line.split("{행사 이름}").map((part, j) => (
            <span key={j}>
              {j > 0 && <span data-spot="name">{v.name}</span>}
              {part}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
