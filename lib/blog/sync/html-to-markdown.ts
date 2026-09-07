/**
 * 노션이 내보내는 "Notion-flavored Markdown"을 우리가 렌더할 수 있는 순수 마크다운으로 되돌린다.
 *
 * 노션의 마크다운 엔드포인트는 표준 마크다운으로 표현할 수 없는 블록을 XML 같은 태그로 낸다.
 * 콜아웃은 `<callout>`, 토글은 `<details>/<summary>`, 컬럼은 `<columns>/<column>`,
 * 동영상·파일은 `<video src>`·`<file src>`, 북마크·임베드는 `<unknown url alt>` 같은 식이다.
 *
 * 렌더러는 원시 HTML을 실행하지 않는다(ADR-0012 — 텍스트를 escape 해 XSS로부터 안전하다).
 * 그래서 이 태그들이 그대로 넘어가면 화면에서 조용히 사라진다. 콜아웃 하나 썼다고
 * 그 문단이 통째로 없어지는데 아무도 모르는 상황이 실제로 가능했다.
 *
 * 그래서 두 가지를 지킨다.
 *
 *   1. 아는 태그는 뜻이 가장 가까운 마크다운으로 바꾼다
 *   2. 모르는 태그는 껍데기만 벗기고 안의 글자는 남긴 뒤, 어떤 태그였는지 보고한다
 *
 * 조용히 버리는 대신 시끄럽게 알리는 쪽을 고른 이유는, 노션이 블록을 새로 추가하면
 * 우리가 모르는 태그가 언젠가 반드시 나오기 때문이다. 그때 글이 깨진 채로 몇 달을 가는 것보다
 * 동기화가 "모르는 태그를 봤다"고 알려 주는 편이 낫다.
 *
 * 코드 블록과 인라인 코드 안은 건드리지 않는다 — 예제로 적어 둔 HTML이 변형되면 안 된다.
 */

export type MarkdownConversion = {
  markdown: string;
  /** 뜻을 아는 짝이 없어 껍데기만 벗긴 태그 이름들 (중복 제거) */
  unknownTags: string[];
};

/**
 * 코드를 잠시 빼 둘 때 쓰는 자리표.
 *
 * 사적 사용 영역(U+E000) 문자를 쓴다. "[[0]]" 이나 " 0 " 처럼 평범한 모양을 쓰면
 * 본문에 우연히 같은 것이 있을 때("값이 3 이다") 그 자리를 코드로 바꿔치기한다.
 * 이 영역의 문자는 사람이 쓴 글에 나오지 않는다.
 */
const MARK = String.fromCharCode(0xe000);

/** 셀 안의 마크다운 표를 깨뜨리는 문자만 최소한으로 처리한다 */
function cell(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

/** <table>…</table> 한 덩어리를 마크다운 표로 */
function tableToMarkdown(html: string): string {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cell(c[1])),
  );
  if (rows.length === 0) return "";

  // 노션은 header-row="true" 로 첫 행이 머리글인지 알려준다.
  // 머리글이 없으면 빈 머리글을 넣는다 — 마크다운 표는 구분선이 필수라
  // 이게 없으면 표로 렌더되지 않는다.
  const hasHeader = /header-row=["']true["']/i.test(html);
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];

  const head = hasHeader ? pad(rows[0]) : Array(width).fill("");
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(Array(width).fill("---")), ...bodyRows.map((r) => line(pad(r)))].join(
    "\n",
  );
}

/** 속성 하나를 읽는다 — src="…" / url='…' 둘 다 */
function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1];
}

/** 여러 줄을 통째로 인용문으로 만든다 */
function asBlockquote(inner: string): string {
  const text = inner.trim();
  if (!text) return "";
  const quoted = text
    .split("\n")
    .map((l) => `> ${l}`.trimEnd())
    .join("\n");
  return `\n\n${quoted}\n\n`;
}

/** 링크 한 줄. 제목이 없으면 주소를 제목으로 쓴다 */
/**
 * 태그에서 주소를 찾는다 (ADR-0046).
 *
 * 이름 하나만 보면 노션이 표기를 바꾸는 순간 조용히 링크가 사라진다.
 * 형광펜을 `_background` 로 짐작했다가 통째로 잃은 것과 같은 함정이라,
 * 있을 법한 이름을 다 본다.
 */
function urlOf(head: string): string | undefined {
  return attr(head, "src") ?? attr(head, "url") ?? attr(head, "href");
}

/**
 * 독자가 눌러서 갈 수 있는 주소인가 (ADR-0051).
 *
 * 노션이 주는 주소 중 상당수는 **노션 안에서만 열린다.**
 *
 *   file://%7B%22source%22%3A%22attachment%3A...   업로드한 파일·PDF·동영상
 *   https://app.notion.com/p/<페이지>#<블록>        북마크·버튼·하위 페이지·인라인 DB
 *
 * 앞의 것은 노션 앱 내부 참조라 브라우저에서 아예 열리지 않고,
 * 뒤의 것은 그 페이지가 공개가 아니면 로그인 요구나 404 다.
 * 둘 다 **독자에게는 죽은 링크**다.
 */
function reachable(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("file://")) return false;
  return !/^https?:\/\/(app\.)?notion\.(com|so)\//i.test(url);
}

/**
 * `file://` 주소에 박혀 있는 파일 이름을 꺼낸다.
 *
 * `attachment:<uuid>:<파일이름>` 꼴이라 이름은 살릴 수 있다.
 * 파일 자체는 못 주지만 "여기 이 파일이 있었다"는 맥락은 남는다 —
 * 글이 "아래 영상을 보면" 으로 이어지는데 아무것도 없으면 문장이 끊긴다.
 */
function fileNameOf(url: string): string | undefined {
  try {
    const m = decodeURIComponent(url).match(/attachment:[^:]+:([^"]+)/);
    return m?.[1];
  } catch {
    return undefined;
  }
}

function asLink(label: string, url?: string): string {
  const text = label
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!url) return text ? `\n\n${text}\n\n` : "";
  return `\n\n[${text || url}](${url})\n\n`;
}

/**
 * 우리가 직접 마크다운으로 바꾸는 태그들.
 * 여기에 없는 태그를 만나면 껍데기만 벗기고 이름을 보고한다.
 */
/** 사람이 붙인 이름이 아니라 블록 종류 이름 — 글자로 남길 값이 없다 */
const BLOCK_NAMES = new Set(["bookmark", "button", "unknown", "page", "database", "embed"]);

const HANDLED = new Set([
  // 내용이 없는 블록. 버려도 잃을 글자가 없으므로 보고하지 않는다
  "empty-block",
  "mention-date",
  "mark",
  "highlight",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "br",
  "callout",
  "details",
  "summary",
  "columns",
  "column",
  "synced_block",
  "table_of_contents",
  "video",
  "audio",
  "pdf",
  "file",
  "page",
  "database",
  "unknown",
]);

export function htmlToMarkdown(md: string): MarkdownConversion {
  const unknown = new Set<string>();

  /*
    다루는 태그인데 주소를 못 찾았을 때 알린다 (ADR-0046).

    형광펜을 잃었을 때 가장 나빴던 것은 잃었다는 사실조차 몰랐다는 점이다.
    `HANDLED` 에 넣어 둔 태그는 "우리가 다룬다"는 뜻이라 보고에서 빠지는데,
    다루는 방법이 틀렸으면 그대로 조용히 사라진다.
    그래서 다루기로 해 놓고 못 다룬 경우를 따로 알린다.
  */
  /*
    다루기로 해 놓았는데 결과를 못 낸 경우를 알린다 (ADR-0046).

    `HANDLED` 에 넣은 태그는 "우리가 다룬다"는 뜻이라 보고에서 빠진다.
    다루는 방법이 틀렸으면 그대로 조용히 사라지므로, 그런 경우를 따로 남긴다.
  */
  const note = (tag: string, why: string) => unknown.add(`${tag}(${why})`);

  /** 글자를 한 문단으로 남긴다. 남길 것이 없으면 아무것도 내지 않는다 */
  const asText = (text: string): string => (text ? `\n\n${text}\n\n` : "");

  /*
    파일·PDF·동영상·소리 (ADR-0051).

    노션에 **올린** 것은 `file://%7B...` 라는 내부 참조로 온다 — 독자는 못 연다.
    그때는 링크를 만들지 않는다. 대신 파일 이름을 글자로 남긴다 —
    글이 "아래 영상을 보면" 으로 이어지는데 아무것도 없으면 문장이 끊긴다.

    주소가 아예 없는 것과 못 여는 주소인 것을 나눠 보고한다.
    앞은 우리가 속성 이름을 못 찾은 것이고, 뒤는 노션이 원래 주지 않는 것이다 —
    고쳐야 할 쪽과 고칠 수 없는 쪽이 다르다.
  */
  const media = (tag: string, head: string, label: string): string => {
    const url = urlOf(head);
    if (reachable(url)) return asLink(label || tag, url);

    const text = label.replace(/<[^>]+>/g, "").trim();
    if (!url) {
      note(tag, "주소 없음");
      return asText(text);
    }
    note(tag, "노션에 올린 것이라 링크를 만들 수 없음");
    return asText(text || fileNameOf(url) || "");
  };

  /*
    하위 페이지·데이터베이스·북마크·버튼.

    전부 `app.notion.com` 주소로 온다. 그 페이지가 공개가 아니면 독자에게는 404 다.
    라벨이 사람이 붙인 이름이면 글자로 남기고, 블록 종류 이름(`bookmark`·`button`)뿐이면
    남길 것이 없으므로 버린다.
  */
  const notionThing = (tag: string, head: string, label: string): string => {
    const url = urlOf(head);
    const text = label.replace(/<[^>]+>/g, "").trim();
    if (reachable(url)) return asLink(text || tag, url);
    note(tag, url ? "노션 안에서만 열림" : "주소 없음");
    return BLOCK_NAMES.has(text.toLowerCase()) ? "" : asText(text);
  };

  // 코드는 통째로 빼 두었다가 마지막에 되돌린다.
  const vault: string[] = [];
  const stash = (text: string) => MARK + (vault.push(text) - 1) + MARK;

  let work = md.replace(/```[\s\S]*?```/g, stash).replace(/`[^`\n]*`/g, stash);

  work = work
    /*
      형광펜 (ADR-0042).

      **노션은 `<span color="blue_bg">` 로 낸다.** 실물을 받아 확인했다.
      처음에는 `_background` 로 짐작해 두었다가 하나도 걸리지 않았고, 그때
      `span` 을 "다루는 태그" 목록에 넣어 둔 탓에 모르는 태그로 보고되지도 않았다 —
      **짐작으로 적은 값이 보고까지 막았다.**

      그래서 뒤가 `_bg` 든 `_background` 든 다 받는다. `<mark>` 와 `<highlight>` 도 함께 받는다 —
      노션이 표기를 바꿔도 한쪽은 걸리게 두는 편이 낫다.
      전부 `==글자==` 로 옮기고, 그 뒤는 remark-highlight 가 `<mark>` 로 되돌린다.

      글자색만 바꾼 것(`color="blue"`)은 형광펜이 아니다. 껍데기만 벗겨 글자를 남긴다.
      배경색 스팬에 `underline="true"` 같은 것이 함께 와도 형광펜으로 본다 —
      마크다운에 밑줄이 없고, 이 사이트의 밑줄은 다른 뜻으로 쓰고 있다(ADR-0030).
    */
    .replace(/<(?:mark|highlight)[^>]*>([\s\S]*?)<\/(?:mark|highlight)>/gi, (_m, inner: string) =>
      inner.trim() ? `==${inner.trim()}==` : "",
    )
    .replace(/<span([^>]*)>([\s\S]*?)<\/span>/gi, (whole: string, head: string, inner: string) => {
      const color = attr(head, "color") ?? "";
      const isHighlight = /_(bg|background)$/i.test(color) || /background/i.test(head);
      if (!isHighlight) return whole;
      return inner.trim() ? `==${inner.trim()}==` : "";
    })

    // 표 — 가장 먼저. 안쪽의 <br> 등은 셀 변환이 직접 처리한다
    .replace(/<table[\s\S]*?<\/table>/gi, (t) => `\n\n${tableToMarkdown(t)}\n\n`)

    /*
      콜아웃 → 인용문. 화면의 인용문이 옅은 면이라 콜아웃과 같은 생김새다.

      아이콘은 실물에서 **내용 안에** 이모지로 온다(`<callout color="blue_bg">🍏</callout>`).
      그래서 내용을 그대로 옮기면 이모지도 같이 온다.

      `icon` 속성 경로도 남겨 둔다. 노션이 그 모양으로 낼 가능성을 버릴 이유가 없고,
      하나만 믿었다가 형광펜을 통째로 잃은 적이 있다.
      속성이 있으면 앞에 붙이고, 없으면 내용만 쓴다.

      내용이 비면 통째로 버린다. 노션에서 콜아웃을 만들고 글을 안 쓰면
      `<empty-block/>` 하나만 들어오는데, 그대로 두면 화면에 빈 인용문 찌꺼기가 남는다.
    */
    .replace(/<callout([^>]*)>([\s\S]*?)<\/callout>/gi, (_m, head: string, inner: string) => {
      const body = inner.replace(/<empty-block\s*\/?>/gi, "").trim();
      if (!body) return "";
      const icon = attr(head, "icon");
      /*
        [!callout] 마커로 인용문과 구분한다 (#109). 우리 화면은 인용(왼쪽 선)과
        콜아웃(옅은 면 상자)이 다른 요소다 - 마커가 없으면 렌더가 둘을 가를 수 없다.

        마커는 **자기 줄**에 둔다. 내용 첫 줄 앞에 인라인으로 붙였더니, 콜아웃이
        헤딩으로 시작하는 글에서 "## 제목"이 헤딩이 아니라 글자로 노출됐다 (실측).
        마커 줄은 remark-callout 이 렌더 시점에 통째로 걷어낸다.

        아이콘도 같은 이유로 첫 줄 앞에 그냥 붙이면 안 된다. 내용이 헤딩이면
        헤딩 글자 안으로 넣는다 - 노션 화면에서도 아이콘은 첫 줄 왼쪽에 붙는다.

        아이콘 표기는 세 가지다 (실물).
          이모지            글자 그대로 둔다
          /icons/xx.svg     노션 내장 아이콘. 절대 주소의 인라인 이미지로 만든다 -
                            그래야 이미지 이관이 R2로 옮겨 우리 주소가 된다.
                            alt "icon" 은 렌더가 본문 그림과 구분하는 표식이다.
          https://…         작성자가 올린 이미지 아이콘. 그대로 인라인 이미지로 -
                            노션 호스팅이면 이관이 알아서 옮긴다.
      */
      const cleanIcon = !icon
        ? ""
        : /^\/icons\//.test(icon)
          ? `![icon](https://www.notion.so${icon})`
          : /^https?:\/\//.test(icon)
            ? `![icon](${icon})`
            : icon;
      let content = body.replace(/^\/icons\/\S+\.(?:svg|png)\s*/, "");

      if (cleanIcon) {
        content = /^#{1,6}\s/.test(content)
          ? content.replace(/^(#{1,6})\s+/, `$1 ${cleanIcon} `)
          : `${cleanIcon} ${content}`;
      }
      // 콜아웃 안의 토글 헤딩({toggle="true"} 줄과 탭 자식)은 이 인용에 담긴 채
      // 아래 구조 정리가 [!toggle] 블록으로 바꾼다 - 노션처럼 접힌 채 상자 안에 남는다
      return asBlockquote(`[!callout]\n${content}`);
    })

    /*
      토글 블록 → [!toggle] 인용 (팀원 요청: 펼쳐 두지 말고 노션처럼 접기).

      제목 줄과 내용을 인용 한 단으로 감싸고 마커를 단다. remark-toggle 이
      렌더 시점에 이 인용을 <details>/<summary> 로 바꾼다 - 원시 HTML 을
      렌더하지 않는 원칙(ADR-0012)을 지키면서 접는 동작을 살리는 길이다.
      제목 뒤에 빈 인용 줄을 넣는 이유는 제목과 내용이 한 문단으로 붙으면
      summary 가 내용까지 삼키기 때문이다.
    */
    .replace(/<details[^>]*>([\s\S]*?)<\/details>/gi, (_m, inner: string) => {
      const summary = inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? "";
      const rest = inner.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, "").trim();
      const title = summary.replace(/<[^>]+>/g, "").trim();
      return asBlockquote(`[!toggle] ${title || "토글"}\n\n${rest}`);
    })

    /*
      콜아웃의 노션 내장 아이콘 — 이모지가 아니라 `/icons/hand_blue.svg` 같은
      경로 문자열로 내용 앞에 온다 (실물). 그대로 두면 화면에 경로가 글자로
      노출된다. 이모지 아이콘은 내용에 섞여 와 그대로 살고, 경로만 걷어낸다.
    */
    .replace(/^(>\s*)\/icons\/\S+\.(?:svg|png)\s*/gm, "$1")

    // 컬럼·동기화 블록 → 껍데기만 벗긴다.
    // 읽는 칸이 한 줄뿐이라 나란한 배치는 어차피 세로로 쌓인다.
    .replace(/<\/?(?:columns|column|synced_block)[^>]*>/gi, "\n\n")

    // 노션 목차 → 없앤다. 목차는 우리가 h2 에서 직접 만든다(ADR-0027)
    .replace(/<table_of_contents\s*\/?>/gi, "")

    // 미디어·파일 → 독자가 갈 수 있으면 링크, 아니면 이름만 (ADR-0051).
    .replace(
      /<(video|audio|pdf|file)([^>]*)>([\s\S]*?)<\/\1>/gi,
      (_m, tag: string, head: string, inner: string) => media(tag, head, inner),
    )
    .replace(/<(video|audio|pdf|file)([^>]*)\/>/gi, (_m, tag: string, head: string) =>
      media(tag, head, attr(head, "alt") ?? ""),
    )

    // 하위 페이지·데이터베이스·북마크·버튼 — 전부 노션 안을 가리킨다
    .replace(
      /<(page|database)([^>]*)>([\s\S]*?)<\/\1>/gi,
      (_m, tag: string, head: string, inner: string) => notionThing(tag, head, inner),
    )
    .replace(/<unknown([^>]*)\/?>/gi, (_m, head: string) =>
      notionThing(attr(head, "alt") ?? "unknown", head, ""),
    )

    /*
      날짜 멘션 (ADR-0047).

      `<mention-date start="2026-09-05"/>` — 자기 닫는 태그이고 **날짜가 속성에만 있다.**
      껍데기를 벗기면 아무것도 남지 않아 "2026-09-05에 있었던 일" 같은 문장이 통째로 깨진다.
      실물을 받아 확인했고, "다루기로 해 놓고 못 다룬 것" 보고가 이걸 잡아 줬다.

      기간이면 `end` 가 붙는다. 물결로 잇는다 — 화면의 날짜 표기와 같은 결이다.

      다른 멘션(사람·페이지)은 손대지 않는다. 실물을 못 봤고, 짐작으로 적으면
      형광펜 때와 같은 일이 벌어진다. 보고에 이름이 뜨면 그때 실물을 보고 정한다.
    */
    .replace(/<mention-date([^>]*)\/?>/gi, (_m, head: string) => {
      const start = attr(head, "start");
      const end = attr(head, "end");
      if (!start) return "";
      return end ? `${start} ~ ${end}` : start;
    })

    /*
      문단 안 줄바꿈 <br>. 마크다운에서 줄바꿈은 "공백 두 개 + 개행"인데,
      무턱대고 바꾸면 두 곳이 깨진다 (실측).

        헤딩 줄 - 헤딩은 한 줄이라, 개행이 들어가면 뒷부분이 헤딩 밖으로
                  떨어져 나간다. 공백으로 잇는다 (화면에서는 자연 줄바꿈).
        인용 줄 - 새로 생긴 줄에 "> " 가 없으면 그 줄부터 인용(콜아웃) 밖으로
                  샌다. 원래 줄의 인용 접두를 이어 붙인다.
    */
    .replace(/^.*<br\s*\/?>.*$/gim, (line: string) => {
      if (/^(?:> ?)*\t*#{1,6}\s/.test(line)) return line.replace(/\s*<br\s*\/?>\s*/gi, " ");
      const quote = line.match(/^((?:> ?)*)/)?.[1] ?? "";
      return line.replace(/<br\s*\/?>/gi, `  \n${quote}`);
    })

    // 남은 태그 — 껍데기만 벗기고 글자는 남긴다. 무엇이었는지는 보고한다.
    .replace(/<\/?([a-zA-Z0-9_-]+)[^>]*>/g, (_m, name: string) => {
      const tag = name.toLowerCase();
      if (!HANDLED.has(tag)) unknown.add(tag);
      return "";
    });

  /*
    구조 정리 (#109, 실물 전수 대조로 확정한 규칙).

    노션은 블록의 부모-자식을 탭 들여쓰기로 내보낸다. 마크다운에서 탭은
    코드 블록이라 그대로 두면 본문이 검은 상자에 갇히는데, 탭의 뜻이 문맥마다
    달라 정규식 한 줄로는 못 벗긴다. 줄 단위로 앞 줄을 보며 정리한다.

      토글 헤딩 줄       `### 제목 {toggle="true"}` (실물). 인용 한 단을 새로
                         열어 `[!toggle] 제목` 마커를 두고, 탭이 더 깊은
                         자식 줄들을 그 인용에 담는다 - remark-toggle 이
                         <details> 로 바꿔 노션처럼 접힌다.
      헤딩 줄            탭을 전부 벗긴다. 들여쓴 헤딩은 마크다운에 없다.
      탭 + 목록 줄       바로 위가 인용이면 인용 자식이 샌 것 → "> " 를 붙여
                         인용으로 되돌린다. 바로 위가 목록이면 중첩 목록 →
                         그대로 둔다. 그 밖이면 부모 잃은 목록 → 탭만 벗긴다.
      그 밖의 탭 줄      인용·문장이 앞에 있으면 그 자식, 아니면 탭만 벗긴다.
      내용 없는 ">" 줄   다음 줄이 빈 줄이면 빈 인용 찌꺼기 → 버린다.
                         (노션이 인용 블록과 그 자식을 따로 내보낼 때 생긴다)
  */
  {
    const lines = work.split("\n");
    const isList = (s: string) => /^(?:[-*+]|\d+\.)\s/.test(s);
    const decompose = (line: string) => {
      const m = line.match(/^((?:> ?)*)(\t*)(.*)$/);
      if (!m) return null;
      return { quote: m[1], q: (m[1].match(/>/g) ?? []).length, t: m[2].length, rest: m[3] };
    };
    /** 다음 내용 있는 줄 - 빈 줄이 토글을 닫아야 하는지 내다볼 때 쓴다 */
    const peek = (from: number) => {
      for (let j = from; j < lines.length; j += 1) {
        const d = decompose(lines[j]);
        if (d && (d.rest.trim() || d.q > 0)) return d;
      }
      return null;
    };
    const TOGGLE_HEAD = /^#{1,6}\s+(.*?)\s*\{toggle="true"\}\s*$/i;

    const out: string[] = [];
    let prevRest = ""; // 마지막 내용 있는 줄의, 인용 접두를 벗긴 내용
    let prevQuoted = false;
    /** 열린 토글: 자식은 같은 인용 깊이(q)에서 더 깊은 탭(> t)으로 온다 */
    const toggles: { q: number; t: number }[] = [];
    const inToggle = (d: { q: number; t: number } | null) =>
      d !== null &&
      toggles.length > 0 &&
      d.q === toggles[toggles.length - 1].q &&
      d.t > toggles[toggles.length - 1].t;

    for (let i = 0; i < lines.length; i += 1) {
      const d = decompose(lines[i]);
      if (!d) {
        out.push(lines[i]);
        continue;
      }
      let { quote, q, t, rest } = d;

      // 빈 줄(맨 빈 줄이든 내용 없는 "> " 줄이든): 토글이 계속되는지 내다보고,
      // 계속되면 인용 빈 줄로 잇는다 - 맨 빈 줄은 인용을 끊어 토글을 조각낸다.
      if (!rest.trim()) {
        const nx = peek(i + 1);
        while (toggles.length && !inToggle(nx)) toggles.pop();
        if (toggles.length) {
          // 빈 줄 자신의 접두가 아니라 토글이 사는 인용 깊이 기준으로 잇는다
          const base = toggles[toggles.length - 1].q;
          out.push("> ".repeat(base + toggles.length).trimEnd());
          prevRest = "";
          prevQuoted = true;
          continue;
        }
        if (!quote) {
          out.push(""); // 탭·공백만 남은 줄(벗겨낸 태그 자리)은 빈 줄로
          /*
            빈 줄은 인용 문맥을 끊는다. 노션 실물에서 인용의 자식은 인용 줄
            **바로 다음** 탭 줄로만 온다 - 빈 줄(벗겨낸 컬럼 태그 자리 포함)
            건너 나온 탭 줄까지 인용에 붙이면, 컬럼에 넣어 둔 그림이 앞 인용
            상자 안으로 끌려 들어간다 (실측: 💡 인용 뒤 역할표 사진 두 장).
          */
          prevRest = "";
          prevQuoted = false;
          continue;
        }
        if (!(lines[i + 1] ?? "").trim()) continue; // 빈 인용 찌꺼기
        out.push(">"); // 인용 안 문단 구분
        prevRest = "";
        prevQuoted = true;
        continue;
      }

      // 이 내용 줄이 담기지 않는 토글은 닫는다
      while (toggles.length && !inToggle(d)) toggles.pop();

      const th = rest.match(TOGGLE_HEAD);
      if (th) {
        toggles.push({ q, t });
        const prefix = quote + "> ".repeat(toggles.length);
        out.push(`${prefix}[!toggle] ${th[1] || "토글"}`);
        out.push(prefix.trimEnd()); // 제목 문단을 끊는 빈 인용 줄
        prevRest = "";
        prevQuoted = true;
        continue;
      }

      // 토글 안에서 소비된 탭(토글 헤딩보다 한 단 깊음)을 뺀 나머지가 실제 들여쓰기
      const consumed = toggles.length ? toggles[toggles.length - 1].t + 1 : 0;
      let tabs = "\t".repeat(Math.max(0, t - consumed));
      if (/^#{1,6}\s/.test(rest)) {
        tabs = "";
      } else if (tabs && !quote && !toggles.length && prevQuoted) {
        // 인용 바로 아래 탭 줄은 인용의 자식이다 - 목록이든 문장이든 인용으로
        // 되돌린다 (실물: 체크리스트, 그리고 "기회는 우연히…" 같은 여러 줄 인용)
        quote = "> ";
        tabs = "";
      } else if (tabs && isList(rest)) {
        if (!isList(prevRest)) tabs = "";
      } else if (tabs) {
        tabs = "";
      }
      /*
        인용 바로 다음의 일반 줄 앞에는 빈 줄을 넣는다. 마크다운은 인용에
        붙은 다음 줄을 인용의 연속으로 삼키는데(lazy continuation), 노션
        실물에서 인용(💡 한 줄)과 뒷문장은 형제 블록이다 - 빈 줄이 없으면
        뒷문장과 이미지까지 인용 안으로 끌려 들어간다 (실측).
      */
      const prefix = quote + "> ".repeat(toggles.length);
      const last = out.length > 0 ? out[out.length - 1] : "";
      if (last.startsWith(">") && !prefix && rest.trim()) out.push("");
      out.push(prefix + tabs + rest);
      prevRest = rest;
      prevQuoted = prefix.length > 0;
    }
    work = out.join("\n");
  }

  // 헤딩이 아닌 곳에 남은 토글 마커는 화면에 글자로 남지 않게 걷어낸다
  work = work.replace(/\s*\{toggle="true"\}/gi, "");

  /*
    이미지 한 장짜리 줄은 자기 문단으로 떼어 놓는다 (실물: "…준비되어 있습니다!"
    바로 다음 줄에 그림). 글 줄에 붙어 한 문단이 되면 렌더가 figure 로 못 키워서
    [작게] 같은 크기 지시어가 죽고, 그림이 원본 크기 그대로 왼쪽에 붙는다.

    인용(콜아웃·토글) 안 그림도 같은 문제가 있어서 같은 처리를 하되,
    빈 줄 대신 빈 인용 줄을 넣는다 - 맨 빈 줄은 인용을 끊어 버린다 (실측:
    토글 속 그림이 글 줄에 붙어 원본 크기로 나왔다).
  */
  work = work
    .replace(/^(!\[(?:\\.|[^\]])*\]\([^)\n]*\))[ \t]*$/gm, "\n$1\n")
    .replace(
      /^((?:> ?)+)(!\[(?:\\.|[^\]])*\]\([^)\n]*\))[ \t]*$/gm,
      (_m, qp: string, img: string) => {
        const bare = qp.trimEnd();
        return `${bare}\n${qp}${img}\n${bare}`;
      },
    );

  /*
    국기 이모지 → 트위모지 그림 (실물: "🇳🇱 네덜란드 이야기…", 팀원 확인).

    국기는 지역 표시 문자 두 개짜리 이모지인데, 윈도우에는 국기 글리프가
    없어서 브라우저가 "NL" 두 글자로 그린다. 노션은 자체 이모지 그림을 쓰니
    노션에서만 보이고 우리 화면에서는 사라진 것처럼 보인다. 그림으로 바꿔
    어느 플랫폼에서나 보이게 한다 - 이 주소도 이미지 이관이 R2로 옮긴다.
    다른 이모지는 손대지 않는다. 국기만 이 구멍이 있다.

    이미지 마크다운을 먼저 자리표로 빼 둔다 - 캡션(alt) 안의 국기까지
    그림으로 바꾸면 이미지 문법 안에 이미지가 중첩돼 둘 다 깨진다.
  */
  work = work
    .replace(/!\[(?:\\.|[^\]])*\]\([^)\n]*\)/g, stash)
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, (flag) => {
      const codes = [...flag].map((ch) => ch.codePointAt(0)!.toString(16)).join("-");
      return `![icon](https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${codes}.svg)`;
    });

  /*
    굵은 글씨 가장자리 공백 (실물: "앱은** '경도를…' **라는").

    노션은 굵은 범위의 안쪽 가장자리에 공백을 붙여 내보내는 일이 잦은데,
    표준 마크다운은 "** 글자"나 "글자 **" 를 여닫이로 인정하지 않아
    별표가 그대로 화면에 찍힌다. 안쪽 가장자리 공백을 걷어낸다.
    (경계에 한글이 붙는 문제는 렌더의 remark-cjk-friendly 가 맡는다)

    코드가 자리표로 빠져 있는 시점이라 코드 안의 별표와 짝지어질 일은 없다.

    정확히 별표 두 개짜리 여닫이만 짝짓는다. 노션은 "****제목****" 처럼
    겹친 굵게도 내보내는데, 이걸 두 개씩 잘라 물면 짝이 한 칸씩 어긋나
    멀쩡한 다음 줄까지 안쪽 공백이라며 잡아먹는다 (실측: 목록 줄이 통째로
    옆 줄에 붙어 버렸다). 겹친 굵게는 그대로 둬도 굵게로 렌더된다.
    문단 경계(빈 줄)를 넘는 짝도 물지 않는다 - 홀로 남은 별표가 있어도
    피해가 그 문단 안에서 끝난다.
  */
  /*
    공백만 굵게 한 것 먼저 걷어낸다 (실물: <span>** **</span>).

    노션에서 스타일 입힌 공백 한 칸이 "** **" 로 나온다. 앞 굵기와 붙으면
    "**글자**** **" 처럼 별표 네 개 런이 생기는데, 이 안의 "** **" 는 어떤
    파서도 못 닫아 별표가 그대로 화면에 찍힌다. 공백 자체로 되돌린다.
  */
  work = work.replace(/\*\*(\s+)\*\*(?!\*)/g, "$1");

  work = work.replace(
    /(?<!\*)\*\*(?!\*)((?:(?!\n\n)[^*])+?)(?<!\*)\*\*(?!\*)/g,
    (_m, inner: string) => {
      const t = inner.replace(/^\s+/, "").replace(/\s+$/, "");
      return t ? `**${t}**` : "";
    },
  );

  // 굵은 기울임(***)의 가장자리 공백도 같은 문제다 (실물: "*** ”대충...” ***포장")
  work = work.replace(
    /(?<!\*)\*\*\*(?!\*)((?:(?!\n\n)[^*])+?)(?<!\*)\*\*\*(?!\*)/g,
    (_m, inner: string) => {
      const t = inner.replace(/^\s+/, "").replace(/\s+$/, "");
      return t ? `***${t}***` : "";
    },
  );

  // 코드를 되돌린다. 펜스 코드 안에 인라인 코드가 들어 있을 수 있어 자리표가 없어질 때까지 돈다.
  const holder = new RegExp(`${MARK}(\\d+)${MARK}`, "g");
  for (let i = 0; i < 5 && work.includes(MARK); i += 1) {
    work = work.replace(holder, (_m, n: string) => vault[Number(n)] ?? "");
  }

  // 인용 끝에 남은 빈 인용 줄(">"만 있는 줄 + 빈 줄)은 빈 문단 찌꺼기다.
  // 인용 그림 분리가 끝에 붙인 것까지 걷어내야 하므로 마지막에 돈다.
  work = work.replace(/^(?:> ?)*>[ \t]*\n(?=\n|$)/gm, "");

  // 줄 끝 공백은 손대지 않는다 — 마크다운에서 공백 두 개는 줄바꿈이다
  const markdown = work.replace(/\n{3,}/g, "\n\n").trim();

  return { markdown, unknownTags: [...unknown] };
}
