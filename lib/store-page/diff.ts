/**
 * 문구가 어디서 달라졌는지 낱말 단위로 찾는다 (docs/admin-ui.md "스토어 페이지"). 순수 함수만 둔다.
 */
export type Part = { kind: "same" | "add" | "del"; text: string };

const tokens = (s: string) => s.match(/\s+|\S+/g) ?? [];
/** 타자마다 도는 계산이라 표가 이보다 커지면 낱말을 맞춰 보지 않고 통째로 바뀐 것으로 본다 */
const MAX_CELLS = 4_000_000;

function push(out: Part[], kind: Part["kind"], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.kind === kind) last.text += text;
  else out.push({ kind, text });
}

export function diffText(before: string, after: string): Part[] {
  const a = tokens(before);
  const b = tokens(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out: Part[] = [];
  push(out, "same", a.slice(0, start).join(""));
  const n = endA - start;
  const m = endB - start;
  if (n * m > MAX_CELLS) {
    push(out, "del", a.slice(start, endA).join(""));
    push(out, "add", b.slice(start, endB).join(""));
  } else {
    const w = m + 1;
    const table = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * w + j] = a[start + i] === b[start + j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        push(out, "same", a[start + i]);
        i++;
        j++;
      } else if (j >= m || (i < n && table[(i + 1) * w + j] >= table[i * w + j + 1])) {
        push(out, "del", a[start + i++]);
      } else {
        push(out, "add", b[start + j++]);
      }
    }
  }
  push(out, "same", a.slice(endA).join(""));
  return out;
}

/** 바뀌지 않은 긴 글은 앞뒤만 남겨 바뀐 곳이 바로 보이게 한다 */
export function shorten(parts: Part[], keep = 30): Part[] {
  return parts.map((p, i) => {
    const chars = [...p.text];
    if (p.kind !== "same" || chars.length <= keep * 2 + 1) return p;
    const head = i === 0 ? "" : chars.slice(0, keep).join("");
    const tail = i === parts.length - 1 ? "" : chars.slice(-keep).join("");
    return { ...p, text: `${head}...${tail}` };
  });
}
