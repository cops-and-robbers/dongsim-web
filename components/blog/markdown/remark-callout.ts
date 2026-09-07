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
 * 동기화가 노션 콜아웃을 `> [!callout]` 마커 줄 + 내용으로 내보낸다. 여기서
 * 마커를 걷어내고 blockquote 노드에 data-callout 을 심으면, 렌더가 인용(왼쪽 선)과
 * 콜아웃(옅은 면 상자)을 가를 수 있다 - 화면에서 둘은 다른 요소다.
 *
 * 마커는 첫 문단의 첫 글자 노드에 있다. 내용이 헤딩으로 시작하는 콜아웃은
 * 마커가 문단 하나를 통째로 차지하므로, 걷어낸 뒤 빈 문단을 지운다 -
 * 남겨두면 콜아웃 상자 첫머리에 빈 줄이 하나 생긴다.
 */
export const remarkCallout = () => (tree: Parent) => {
  visit(tree, "blockquote", (node: Parent) => {
    const first = node.children?.[0];
    if (first?.type !== "paragraph") return;
    const text = first.children?.[0];
    if (text?.type !== "text" || !text.value?.startsWith("[!callout]")) return;

    text.value = text.value.slice("[!callout]".length).replace(/^\s+/, "");
    if (!text.value) {
      first.children?.shift();
      if (first.children?.length === 0) node.children?.shift();
    }
    node.data ??= {};
    /*
      hProperties 는 이름 정규화 없이 hast 로 그대로 넘어간다. 렌더 컴포넌트가
      받는 node.properties 의 키도 여기 적은 그대로다 - "data-callout" 으로 적으면
      dataCallout 으로 읽는 쪽과 영영 어긋난다 (실측: 콜아웃이 전부 인용으로 렌더).
      두 표기를 모두 심어 읽는 쪽 표기에 매이지 않게 한다.
    */
    node.data.hProperties = {
      ...node.data.hProperties,
      dataCallout: "true",
      "data-callout": "true",
    };
  });
};
