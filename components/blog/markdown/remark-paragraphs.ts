/**
 * 노션 블록 하나를 문단 하나로 되살리는 remark 플러그인 (#349).
 *
 * 노션의 마크다운 엔드포인트는 블록과 블록 사이를 빈 줄 없이 줄바꿈 한 번으로
 * 잇는다. 동기화는 그 본문을 그대로 Supabase(posts.content)에 저장하는데,
 * 마크다운은 빈 줄이 있어야 문단을 나누므로 이어진 블록들이 띄어쓰기 하나로
 * 합쳐져 한 문단이 됐다(실측: 영어 글 25곳, 한국어 글 한 편 58곳).
 *
 * 노션에서 블록 안 줄바꿈(Shift+Enter)은 `<br>` 로 오고, Markdown.tsx 가
 * 이를 하드 브레이크로 바꿔 `break` 노드가 된다. 그래서 문단 안 글자에 남은
 * 줄바꿈은 전부 블록 경계다 - 그 자리에서 문단을 나눈다.
 *
 * 저장 단계(동기화)가 아니라 여기서 고치는 이유: 글자 단계에서 줄바꿈을 빈 줄로
 * 늘리면 목록 항목 사이가 벌어지고 표가 줄마다 끊긴다. 파싱이 끝난 트리에서는
 * 일반 문단만 골라 나눌 수 있고, 배포만으로 저장된 글 전체에 적용된다.
 *
 * 맨 위와 인용(콜아웃·토글이 인용으로 온다) 바로 아래 문단만 나눈다. 목록 항목
 * 안 문단을 나누면 촘촘한 목록에서 <p> 없이 이어 붙어 오히려 경계가 사라진다.
 * 콜아웃·토글 플러그인보다 먼저 돌아야 토글 제목 줄이 내용과 떨어진다.
 */

/* unist 타입은 package.json 에 없어 필요한 모양만 적는다 (remark-highlight 와 같다) */
type Node = { type: string; value?: string; children?: Node[]; [key: string]: unknown };

const SPLIT_IN = new Set(["root", "blockquote"]);

function splitParagraph(p: Node): Node[] {
  const out: Node[] = [];
  let current: Node[] = [];
  const flush = () => {
    if (current.length > 0) out.push({ type: "paragraph", children: current });
    current = [];
  };

  for (const child of p.children ?? []) {
    if (child.type !== "text" || !child.value?.includes("\n")) {
      current.push(child);
      continue;
    }
    child.value.split("\n").forEach((part, i) => {
      if (i > 0) flush();
      if (part) current.push({ type: "text", value: part });
    });
  }
  flush();

  // 나눌 자리가 없었으면 원래 노드를 그대로 둔다 (위치 정보 등 보존)
  return out.length === 1 && out[0].children?.length === p.children?.length ? [p] : out;
}

function walk(node: Node): void {
  if (!node.children) return;
  if (SPLIT_IN.has(node.type)) {
    node.children = node.children.flatMap((c) => (c.type === "paragraph" ? splitParagraph(c) : [c]));
  }
  node.children.forEach(walk);
}

export const remarkParagraphs = () => (tree: Node) => {
  walk(tree);
};

const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(```|~~~)/;
const QUOTE = /^(\s*>\s?)*/;
const DIVIDER = /^ {0,3}(?:(?:- *){3,}|(?:\* *){3,}|(?:_ *){3,})$/;

/**
 * 목록 바로 다음 블록과 구분선을 앞 블록에서 떼어 낸다 (#349).
 *
 * 같은 이유(블록 사이 줄바꿈 한 번)로, 목록 바로 다음 문단은 마크다운의
 * "게으른 이어 쓰기" 규칙에 걸려 목록 마지막 항목 안으로 들어간다
 * (실측: "- 2026년 … 특별상" 다음 문단이 그 항목 글자에 붙었다). 트리에서는
 * 이미 항목 문단의 일부가 돼 들여 쓴 자식 블록과 구분이 안 되므로, 파싱 전에
 * 원문에서 목록 줄 다음의 들여 쓰지 않은 줄 앞에 빈 줄을 넣는다.
 *
 * 노션 구분선(`---`)도 같다. 문단 바로 다음 줄에 오면 마크다운은 그 문단을
 * 제목으로 읽는다(setext 제목, 실측: 시험 글의 코드 줄이 h2 가 됐다). 그래서
 * 구분선 앞에도 빈 줄을 넣는다.
 *
 * 들여 쓴 줄(노션 목록의 자식 블록), 다음 목록 항목, 하드 브레이크로 끝난 줄
 * (블록 안 줄바꿈) 다음 줄은 건드리지 않는다. 인용 안에서는 같은 깊이의 `>` 빈
 * 줄을 넣어 인용이 끊기지 않게 하고, 코드 블록 안은 건너뛴다.
 */
export function separateBlocks(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inFence = false;
  let inList = false;

  lines.forEach((line, i) => {
    const prefix = line.match(QUOTE)?.[0] ?? "";
    const body = line.slice(prefix.length);
    const depth = (prefix.match(/>/g) ?? []).length;
    const prev = i > 0 ? lines[i - 1] : "";
    const prevDepth = ((prev.match(QUOTE)?.[0] ?? "").match(/>/g) ?? []).length;
    // 앞줄이 하드 브레이크로 끝났으면 이 줄은 같은 블록의 다음 줄이다
    const sameBlock = / {2,}$|\\$/.test(prev);

    if (FENCE.test(body)) {
      inFence = !inFence;
      inList = false;
    } else if (!inFence) {
      const plain = body.trim() !== "" && !/^\s/.test(body) && !LIST_ITEM.test(body);
      const prevBody = prev.slice((prev.match(QUOTE)?.[0] ?? "").length);
      if (DIVIDER.test(body) && prevBody.trim() !== "" && depth === prevDepth) {
        // 문단 바로 다음 `---` 는 구분선이 아니라 그 문단을 제목으로 바꾼다(setext 제목)
        out.push(prefix.trimEnd());
        inList = false;
      } else if (inList && plain && depth === prevDepth && !sameBlock) {
        out.push(prefix.trimEnd());
        inList = false;
      } else if (body.trim() === "") {
        inList = false;
      } else if (LIST_ITEM.test(body)) {
        inList = true;
      } else if (depth !== prevDepth) {
        inList = false;
      }
      // 들여 쓴 줄과 하드 브레이크 다음 줄은 목록 항목 안이므로 inList 를 그대로 둔다
    }
    out.push(line);
  });

  return out.join("\n");
}
