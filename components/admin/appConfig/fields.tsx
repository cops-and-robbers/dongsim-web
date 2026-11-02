"use client";

import { useRef, type KeyboardEvent } from "react";

// 앱 설정의 입력 부품. 칸 자체가 틀린 값을 받지 않게 만든다. 앱은 틀린 값을 오류 없이 넘겨서 저장 뒤에는 알아채기 어렵다.

const PART_LABELS = ["첫째 자리", "둘째 자리", "셋째 자리"];
const MAX_DIGITS = 3;

/**
 * 버전 입력. 숫자 칸 세 개라 3.2.x 나 3.2 같은 값을 칠 수 없다. 앱의 버전 비교가 세 자리를 숫자로 읽는 것과 같은 모양이다.
 * 점을 치면 다음 칸으로, 위아래 화살표는 1씩, 3.2.7 을 붙여 넣으면 세 칸에 나눠 들어간다.
 */
export function VersionInput({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const parts = [0, 1, 2].map((i) => value.split(".")[i] ?? "");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setPart = (i: number, part: string) => {
    const next = [...parts];
    next[i] = part;
    onChange(next.join("."));
  };
  const focusPart = (i: number) => {
    refs.current[i]?.focus();
    refs.current[i]?.select();
  };

  const onInput = (i: number, raw: string) => {
    const pasted = raw.match(/(\d+)\.(\d+)\.(\d+)/);
    if (pasted) {
      onChange(pasted.slice(1, 4).map(cleanDigits).join("."));
      focusPart(2);
      return;
    }
    setPart(i, cleanDigits(raw));
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (e.key === "." && i < 2) {
      e.preventDefault();
      focusPart(i + 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? 1 : -1;
      setPart(i, String(Math.min(Math.max(Number(parts[i] || 0) + step, 0), 10 ** MAX_DIGITS - 1)));
    } else if (e.key === "Backspace" && parts[i] === "" && i > 0) {
      e.preventDefault();
      focusPart(i - 1);
    } else if (e.key === "ArrowRight" && input.selectionStart === parts[i].length && i < 2) {
      e.preventDefault();
      focusPart(i + 1);
    } else if (e.key === "ArrowLeft" && input.selectionStart === 0 && i > 0) {
      e.preventDefault();
      focusPart(i - 1);
    }
  };

  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-[16px] font-bold text-sd-fg-subtle">
              .
            </span>
          )}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={i === 0 ? id : undefined}
            aria-label={`${label} ${PART_LABELS[i]}`}
            aria-invalid={invalid || undefined}
            value={part}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={`h-10 w-14 rounded-xl border bg-sd-surface text-center text-[14px] font-semibold tabular-nums text-sd-fg outline-none transition focus:border-accent disabled:opacity-50 ${
              invalid ? "border-sd-critical" : "border-sd-line"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// 앞자리 0 은 지운다(앱은 03 도 3 으로 읽지만 콘솔에서 보면 다른 값처럼 보인다)
const cleanDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, MAX_DIGITS).replace(/^0+(?=\d)/, "");

/**
 * https 주소 입력. https:// 는 칸 밖에 고정이라 다른 방식의 주소를 적을 수 없다.
 * 앱이 이 주소를 그대로 외부 브라우저로 여니 http 나 앱 내부 주소가 들어가면 안 된다. 전체 주소를 붙여 넣으면 앞부분을 떼어 낸다.
 */
export function HttpsUrlInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const rest = value.replace(/^https:\/\//, "");
  return (
    <div
      className={`flex items-center rounded-xl border bg-sd-surface transition focus-within:border-accent ${invalid ? "border-sd-critical" : "border-sd-line"} ${disabled ? "opacity-50" : ""}`}
    >
      <span aria-hidden className="pl-3.5 text-[14px] text-sd-fg-subtle">
        https://
      </span>
      <input
        id={id}
        value={rest}
        disabled={disabled}
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = e.target.value.trim().replace(/^https?:\/\//i, "");
          onChange(next ? `https://${next}` : "");
        }}
        className="min-w-0 flex-1 bg-transparent py-2.5 pl-0.5 pr-3.5 text-[14px] text-sd-fg outline-none"
      />
    </div>
  );
}
