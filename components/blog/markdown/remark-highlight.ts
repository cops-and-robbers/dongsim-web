/**
 * `==형광펜==` 을 `<mark>` 로 바꾸는 remark 플러그인 (ADR-0042).
 *
 * 마크다운 표준에는 형광펜이 없다. `==` 는 Pandoc·옵시디언이 쓰는 관례이고,
 * 노션에서 넘어온 하이라이트도 이 모양으로 옮겨 둔다(html-to-markdown).
 *
 * 라이브러리(remark-mark-plus 등)를 쓰지 않고 직접 걷는다. 하는 일이 열 줄이라
 * 의존성 하나와 그 의존성이 끌고 오는 unist 유틸 묶음을 받을 이유가 없다.
 *
 * `text` 노드만 본다. 코드는 `code`·`inlineCode` 라는 다른 노드에 담기므로
 * 코드 안의 `==` 는 애초에 이 함수를 지나가지 않는다 — 따로 막을 필요가 없다.
 *
 * 만든 노드는 `emphasis` 에 `hName` 을 얹는다. mdast 에 없는 타입을 만들면
 * HTML 로 옮기는 단계에서 처리기가 없어 통째로 사라진다. 이미 처리기가 있는 타입에
 * 태그 이름만 바꿔 달면 자식은 그대로 살아서 `<mark>` 안에 들어간다.
 */

/*
  unist 타입을 import 하지 않고 여기서 최소한만 적는다.
  `unist` 는 remark 가 안으로 쓰는 패키지라 우리 package.json 에 없고,
  pnpm 은 남의 의존성을 끌어다 쓰지 못하게 막는다. 필요한 모양은 이게 전부다.
*/
type Node = { type: string; [key: string]: unknown };
type Parent = Node & { children: Node[] };
type TextNode = Node & { type: "text"; value: string };

const PATTERN = /==(?!\s)([^=]+?)(?<!\s)==/g;

function isParent(node: Node): node is Parent {
  return Array.isArray((node as Parent).children);
}

function split(value: string): Node[] | null {
  PATTERN.lastIndex = 0;
  if (!PATTERN.test(value)) return null;
  PATTERN.lastIndex = 0;

  const out: Node[] = [];
  let last = 0;
  for (const m of value.matchAll(PATTERN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: "text", value: value.slice(last, at) } as TextNode);
    out.push({
      type: "emphasis",
      data: { hName: "mark" },
      children: [{ type: "text", value: m[1] } as TextNode],
    } as Node);
    last = at + m[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) } as TextNode);
  return out;
}

export function remarkHighlight() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (!isParent(node)) return;
      const next: Node[] = [];
      let changed = false;
      for (const child of node.children as Node[]) {
        if (child.type === "text") {
          const parts = split((child as TextNode).value);
          if (parts) {
            next.push(...parts);
            changed = true;
            continue;
          }
        } else {
          walk(child);
        }
        next.push(child);
      }
      if (changed) node.children = next;
    };
    walk(tree);
  };
}
