import { visit } from "unist-util-visit";

type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: { hProperties?: Record<string, unknown> };
};
type Parent = Node;

/**
 * 콜아웃 표시 (#109).
 *
 * 동기화가 노션 콜아웃을 `> [!callout] 내용` 으로 내보낸다. 여기서 마커를
 * 걷어내고 blockquote 노드에 data-callout 을 심으면, 렌더가 인용(왼쪽 선)과
 * 콜아웃(옅은 면 상자)을 가를 수 있다 - 화면에서 둘은 다른 요소다.
 */
export const remarkCallout = () => (tree: Parent) => {
  visit(tree, "blockquote", (node: Parent) => {
    const firstParagraph = node.children?.find((c) => c.type === "paragraph");
    const firstText = firstParagraph?.children?.find((c) => c.type === "text");
    if (!firstText?.value?.startsWith("[!callout]")) return;

    firstText.value = firstText.value.slice("[!callout]".length).replace(/^\s+/, "");
    node.data ??= {};
    node.data.hProperties = { ...node.data.hProperties, "data-callout": "true" };
  });
};
