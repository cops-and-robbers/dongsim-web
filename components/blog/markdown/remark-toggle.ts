import { visit } from "unist-util-visit";

type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};
type Parent = Node;

/**
 * 토글 (#109).
 *
 * 동기화가 노션 토글을 `> [!toggle] 제목` + 내용 인용으로 내보낸다. 여기서
 * 그 인용을 <details> 로, 제목 문단을 <summary> 로 바꿔 접는 동작을 살린다 -
 * 원시 HTML 을 렌더하지 않는 원칙(ADR-0012) 아래에서 details 를 만드는 길은
 * 노드 이름을 바꾸는 것뿐이다. 실제 생김새는 Markdown.tsx 의
 * details/summary 컴포넌트가 입힌다.
 */
export const remarkToggle = () => (tree: Parent) => {
  visit(tree, "blockquote", (node: Parent) => {
    const first = node.children?.[0];
    if (first?.type !== "paragraph") return;
    const text = first.children?.[0];
    if (text?.type !== "text" || !text.value?.startsWith("[!toggle]")) return;

    text.value = text.value.slice("[!toggle]".length).replace(/^\s+/, "");
    if (!text.value) first.children?.shift();

    node.data ??= {};
    node.data.hName = "details";
    first.data ??= {};
    first.data.hName = "summary";
  });
};
