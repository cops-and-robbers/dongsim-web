import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
/*
  CJK 플랭킹 보정. 표준 마크다운은 굵게·취소선의 여닫이 판정을 서구권
  구두점 기준으로 해서, `**굵게**도` 처럼 닫는 표시에 한글이 붙으면
  별표가 그대로 화면에 찍힌다 (실측: "**`줌바댄스 클럽`**도"). 이 두 플러그인이
  그 판정을 한중일 글자에 맞게 고친다.
*/
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import rehypeHighlight from "rehype-highlight";
import { remarkCallout } from "./remark-callout";
import { remarkHighlight } from "./remark-highlight";
import { CodeBlock } from "./CodeBlock";
/*
  파서는 YouTube.tsx 가 아니라 순수 함수 파일에서 직접 가져온다.
  YouTube.tsx 는 "use client" 라서, 거기서 다시 내보낸 함수를 서버가 가져오면
  함수가 아니라 클라이언트 참조가 넘어와 서버에서 부르는 순간 터진다.
  타입 검사는 이 경계를 보지 못한다 - pnpm build 만 잡는다. (개인 블로그 실측)
*/
import { YouTube } from "./YouTube";
import { youTubeId } from "@/lib/blog/sync/youtube-id";
import { plainText, slugify } from "./headings";

/** hast 노드에서 사람이 읽는 글자만 모은다 - 앵커 id 와 복사 버튼에 넘길 원문 */
type HastNode = { type?: string; value?: string; children?: HastNode[] };
function textOf(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/**
 * 마크다운 본문 렌더 (#109 2단계).
 *
 * NotionBlocks(블록 트리 렌더)를 대체한다. 스타일 클래스는 NotionBlocks 의 것을
 * 그대로 옮겼다 - 렌더러가 바뀌어도 글은 같아 보여야 한다. 본문 타이포 규칙
 * (18px + 행간 1.6 + 문단 12px, 이미지 라운드 없음)은 docs/blog-system.md 참조.
 *
 * react-markdown 은 원시 HTML 을 렌더하지 않아 XSS 에 안전하다(rehype-raw 미사용).
 * 노션이 내는 <br> 만 하드 브레이크로 되살린다.
 */
export function Markdown({ children }: { children: string }) {
  const normalized = children.replace(/<br\s*\/?>\n?/gi, "  \n");

  // 같은 제목이 두 번 나와도 앵커 id 가 겹치지 않게 이 렌더 안에서만 센다
  const seen = new Map<string, number>();

  const components: Components = {
    /*
      노션 heading 1~3 은 마크다운 #~### 으로 온다. 문서의 h1 은 글 제목이
      이미 쓰고 있으므로 본문 제목은 h2~h4 로 한 단계 내린다.
      앵커 id 는 최상위 제목에만 단다 - 렌더된 글자에서 만들어야
      굵게·인라인 코드가 든 제목에서도 목차와 어긋나지 않는다.
    */
    h1({ children, node }) {
      const id = slugify(plainText(textOf(node as HastNode)), seen);
      return (
        <h2
          id={id}
          className="mt-12 mb-4 text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl dark:text-white"
        >
          {children}
        </h2>
      );
    },
    h2({ children, node }) {
      const id = slugify(plainText(textOf(node as HastNode)), seen);
      return (
        <h3
          id={id}
          className="mt-10 mb-3 text-xl font-bold tracking-tight text-brand-ink sm:text-2xl dark:text-white"
        >
          {children}
        </h3>
      );
    },
    h3({ children }) {
      return (
        <h4 className="mt-8 mb-2 text-lg font-bold text-brand-ink sm:text-xl dark:text-white">
          {children}
        </h4>
      );
    },
    // 노션 헤딩은 3단계까지지만, 토글 안 헤딩이 #### 로 내려와 실물에 존재한다.
    // 컴포넌트가 없으면 맨몸 태그로 렌더돼 본문과 구분이 안 된다.
    h4({ children }) {
      return (
        <h5 className="mt-6 mb-2 text-base font-bold text-brand-ink sm:text-lg dark:text-white">
          {children}
        </h5>
      );
    },
    h5({ children }) {
      return (
        <h6 className="mt-6 mb-2 text-base font-bold text-brand-ink dark:text-white">
          {children}
        </h6>
      );
    },
    h6({ children }) {
      return (
        <h6 className="mt-6 mb-2 text-base font-bold text-brand-ink dark:text-white">
          {children}
        </h6>
      );
    },

    /*
      이미지 한 장만 든 문단은 <p> 를 걷어내고 <figure> 로 바꾼다.
      <p> 안에 <figure> 를 넣으면 브라우저가 문단을 강제로 닫아 DOM 이 어긋난다.
      문단이 유튜브 링크 하나뿐이면 영상으로 바꾼다 - 링크 텍스트(제목)는
      동기화가 박아 둔 것이다.
    */
    p({ children, node }) {
      const kids = node?.children ?? [];
      const only = kids.length === 1 ? kids[0] : undefined;
      if (only && only.type === "element" && only.tagName === "img") {
        const props = only.properties as { src?: string; alt?: string };
        return <Figure src={String(props.src ?? "")} rawCaption={props.alt ?? ""} />;
      }
      if (only && only.type === "element" && only.tagName === "a") {
        const props = only.properties as { href?: string; title?: string };
        const id = youTubeId(String(props.href ?? ""));
        if (id) {
          return (
            <YouTube id={id} title={textOf(only as HastNode)} channel={props.title || undefined} />
          );
        }
      }
      return <p className="my-3 leading-[1.6]">{children}</p>;
    },

    // 문단 안에 글과 섞인 이미지. figure 로 감싸지 않는다(위와 같은 DOM 이유).
    img({ src, alt }) {
      const size = sizeOf(String(src ?? ""));
      return (
        // 그림은 R2 에서 오고 치수를 파일 이름으로 안다. next/image 가 할 일이 없다
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(src ?? "")}
          alt={alt ?? ""}
          width={size?.w}
          height={size?.h}
          loading="lazy"
        />
      );
    },

    a({ children, href }) {
      return (
        <a
          href={href}
          className="font-medium text-brand-blue underline underline-offset-2 transition hover:opacity-80 dark:text-brand-green"
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noreferrer" : undefined}
        >
          {children}
        </a>
      );
    },

    ul({ children }) {
      return (
        <ul className="my-4 list-disc space-y-1.5 pl-6 marker:text-brand-blue dark:marker:text-brand-green">
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className="my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand-blue dark:marker:text-brand-green">
          {children}
        </ol>
      );
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },

    // 콜아웃(노션의 면 상자)과 인용은 다른 요소다 - remark-callout 이 심어 둔
    // 표시로 가른다. 스타일은 둘 다 NotionBlocks 의 것 그대로.
    blockquote({ children, node }) {
      const props = (node?.properties ?? {}) as Record<string, unknown>;
      const isCallout = props.dataCallout === "true" || props["data-callout"] === "true";
      if (isCallout) {
        /*
          안의 헤딩이 본문용 위 여백(mt-12)을 끌고 들어오면 글자가 상자
          아래로 쏠려 보인다. 여백을 눌러 상자 세로 가운데에 오게 한다.
          가로는 본문과 같이 왼쪽 정렬이다 (팀원 확인).
        */
        return (
          <blockquote className="my-6 rounded-2xl bg-brand-blue-bg px-5 py-4 not-italic dark:bg-app-black-900 dark:ring-1 dark:ring-white/10 [&>p]:my-1.5 [&>h2]:my-0 [&>h3]:my-0 [&>h4]:my-0 [&>h5]:my-0">
            {children}
          </blockquote>
        );
      }
      return (
        <blockquote className="my-6 border-l-4 border-brand-blue/60 pl-5 italic text-slate-500 dark:border-brand-green/60 dark:text-slate-400">
          {children}
        </blockquote>
      );
    },

    hr() {
      return <hr className="my-10 border-slate-200 dark:border-white/10" />;
    },

    code({ children, className }) {
      // 블록 코드는 pre 가 감싸므로 여기 오는 것은 인라인뿐이다
      if (className?.includes("language-") || className?.includes("hljs")) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-brand-blue dark:bg-app-black-800 dark:text-brand-green">
          {children}
        </code>
      );
    },

    pre({ children, node }) {
      const codeNode = (node?.children ?? []).find(
        (c) => (c as { tagName?: string }).tagName === "code",
      ) as { properties?: { className?: string[] } } | undefined;
      const cls = codeNode?.properties?.className ?? [];
      const lang = cls
        .find((c) => typeof c === "string" && c.startsWith("language-"))
        ?.replace("language-", "");
      return (
        <CodeBlock lang={lang} code={textOf(node as HastNode)}>
          <pre className="leading-relaxed">{children}</pre>
        </CodeBlock>
      );
    },

    // 표는 가로로 넘길 수 있는 상자로 감싼다. 칸이 많아도 본문이 밀리지 않는다
    table({ children }) {
      return (
        <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-sm">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="border-b border-slate-200 px-4 py-2.5 text-left font-semibold dark:border-white/10">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="px-4 py-2.5 align-top">{children}</td>;
    },

    // 형광펜(==글자==). remarkHighlight 가 mark 로 바꿔 준다
    mark({ children }) {
      return (
        <mark className="rounded-sm bg-brand-blue/15 px-0.5 text-inherit dark:bg-brand-green/20">
          {children}
        </mark>
      );
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkCjkFriendly,
        remarkCjkFriendlyGfmStrikethrough,
        remarkHighlight,
        remarkCallout,
      ]}
      rehypePlugins={[rehypeHighlight]}
      remarkRehypeOptions={{
        // 기본값은 "Footnotes"·"Back to content" 라 한글 글 끝에 영문이 혼자 선다
        footnoteLabel: "각주",
        footnoteBackLabel: "본문으로 돌아가기",
      }}
      components={components}
    >
      {normalized}
    </ReactMarkdown>
  );
}

/**
 * 본문 그림.
 *
 * 캡션 첫머리의 크기 지시어([작게]/[중간])로 표시 폭을 조절한다 - NotionBlocks 의
 * 규칙 그대로다. 노션 마크다운이 대괄호를 \[작게\] 로 이스케이프해 내보내므로
 * 두 형태를 모두 받는다. 치수는 동기화가 파일 이름에 넣어 둔다
 * (<해시>-1600x900.webp) - width/height 를 심으면 그림이 늦게 와도 글이 밀리지 않는다.
 *
 * 이미지는 모서리를 둥글리지 않는다 - 콘텐츠 사진은 각진 편이 editorial 하게
 * 읽힌다는 디자이너 규칙 (docs/blog-system.md).
 */
function Figure({ src, rawCaption }: { src: string; rawCaption: string }) {
  const sizeMatch = rawCaption.match(/^\\?\[(작게|중간)\\?\]\s*/);
  const sizeName = sizeMatch?.[1] ?? "기본";
  const caption = sizeMatch ? rawCaption.slice(sizeMatch[0].length) : rawCaption;

  // 기본: 본문 폭보다 살짝 넓게 / 중간·작게: 가운데 정렬 축소 (NotionBlocks 규칙)
  const figureClass = sizeName === "기본" ? "my-10 sm:-mx-6" : "my-10 text-center";
  const imgClass =
    sizeName === "작게"
      ? "mx-auto w-3/4 sm:w-1/2"
      : sizeName === "중간"
        ? "mx-auto w-9/10 sm:w-3/4"
        : "w-full";

  const size = sizeOf(src);
  return (
    <figure className={figureClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption}
        className={imgClass}
        width={size?.w}
        height={size?.h}
        loading="lazy"
      />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-slate-400 dark:text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** images/<해시>-1600x900.webp 에서 치수를 읽는다 */
function sizeOf(src: string): { w: number; h: number } | undefined {
  const m = src.match(/-(\d+)x(\d+)\.[a-z0-9]+$/i);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : undefined;
}
