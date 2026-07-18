/* eslint-disable @next/next/no-img-element */
import type { NotionBlock, RichTextItem } from "@/lib/blog/notion";

// Notion 블록 → 사이트 디자인에 맞는 마크업. 지원 블록은 글쓰기 가이드와 일치시킨다.
// Notion에서 지정한 글자 색상은 사이트 테마 일관성을 위해 반영하지 않는다.

function RichText({ items }: { items?: RichTextItem[] }) {
  if (!items?.length) return null;
  return (
    <>
      {items.map((t, i) => {
        let node: React.ReactNode = t.plain_text;
        if (t.annotations.code) {
          node = (
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-brand-blue dark:bg-app-black-800 dark:text-brand-green">
              {node}
            </code>
          );
        }
        if (t.annotations.bold) node = <strong>{node}</strong>;
        if (t.annotations.italic) node = <em>{node}</em>;
        if (t.annotations.strikethrough) node = <s>{node}</s>;
        if (t.annotations.underline) node = <u>{node}</u>;
        if (t.href) {
          node = (
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-blue underline underline-offset-2 transition hover:opacity-80 dark:text-brand-green"
            >
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

type Payload = {
  rich_text?: RichTextItem[];
  checked?: boolean;
  language?: string;
  caption?: RichTextItem[];
  icon?: { type: string; emoji?: string };
  type?: string;
  file?: { url: string };
  external?: { url: string };
  url?: string;
  cells?: RichTextItem[][];
  has_column_header?: boolean;
};

function payload(block: NotionBlock): Payload {
  return (block[block.type] ?? {}) as Payload;
}

/** 이미지 블록의 표시 URL - 업로드 파일은 만료되므로 프록시(리사이즈·캐시) 경유. */
function imageUrl(block: NotionBlock): string | null {
  const p = payload(block);
  if (p.type === "external") return p.external?.url ?? null;
  if (p.type === "file") {
    const v = encodeURIComponent(String(block.last_edited_time ?? ""));
    return `/api/blog/image?block=${block.id}&v=${v}&w=1200`;
  }
  return null;
}

function Blocks({ blocks }: { blocks: NotionBlock[] }) {
  // 연속된 리스트 아이템을 하나의 ul/ol로 묶는다(Notion은 아이템 단위로 내려준다).
  const groups: (NotionBlock | NotionBlock[])[] = [];
  for (const block of blocks) {
    const isList =
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item";
    const last = groups[groups.length - 1];
    if (isList && Array.isArray(last) && last[0].type === block.type) {
      last.push(block);
    } else {
      groups.push(isList ? [block] : block);
    }
  }

  return (
    <>
      {groups.map((group, i) =>
        Array.isArray(group) ? (
          group[0].type === "numbered_list_item" ? (
            <ol
              key={i}
              className="my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand-blue dark:marker:text-brand-green"
            >
              {group.map((b) => (
                <ListItem key={b.id} block={b} />
              ))}
            </ol>
          ) : (
            <ul
              key={i}
              className="my-4 list-disc space-y-1.5 pl-6 marker:text-brand-blue dark:marker:text-brand-green"
            >
              {group.map((b) => (
                <ListItem key={b.id} block={b} />
              ))}
            </ul>
          )
        ) : (
          <Block key={group.id} block={group} />
        )
      )}
    </>
  );
}

function ListItem({ block }: { block: NotionBlock }) {
  return (
    <li className="leading-relaxed">
      <RichText items={payload(block).rich_text} />
      {block.children && <Blocks blocks={block.children} />}
    </li>
  );
}

function Block({ block }: { block: NotionBlock }) {
  const p = payload(block);

  switch (block.type) {
    case "paragraph":
      return p.rich_text?.length ? (
        <p className="my-5 leading-[1.8]">
          <RichText items={p.rich_text} />
        </p>
      ) : (
        <div className="h-5" />
      );

    case "heading_1":
      return (
        <h2 className="mt-12 mb-4 text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl dark:text-white">
          <RichText items={p.rich_text} />
        </h2>
      );

    case "heading_2":
      return (
        <h3 className="mt-10 mb-3 text-xl font-bold tracking-tight text-brand-ink sm:text-2xl dark:text-white">
          <RichText items={p.rich_text} />
        </h3>
      );

    case "heading_3":
      return (
        <h4 className="mt-8 mb-2 text-lg font-bold text-brand-ink sm:text-xl dark:text-white">
          <RichText items={p.rich_text} />
        </h4>
      );

    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-brand-blue/60 pl-5 italic text-slate-500 dark:border-brand-green/60 dark:text-slate-400">
          <RichText items={p.rich_text} />
          {block.children && <Blocks blocks={block.children} />}
        </blockquote>
      );

    case "callout":
      return (
        <aside className="my-6 flex gap-3 rounded-2xl bg-brand-blue-bg px-5 py-4 dark:bg-app-black-900 dark:ring-1 dark:ring-white/10">
          {p.icon?.type === "emoji" && (
            <span className="text-xl leading-relaxed" aria-hidden="true">
              {p.icon.emoji}
            </span>
          )}
          <div className="min-w-0 leading-relaxed">
            <RichText items={p.rich_text} />
            {block.children && <Blocks blocks={block.children} />}
          </div>
        </aside>
      );

    case "toggle":
      return (
        <details className="group my-4 rounded-2xl border border-slate-200 px-5 py-3 dark:border-white/10">
          <summary className="cursor-pointer font-semibold text-brand-ink marker:text-brand-blue dark:text-white dark:marker:text-brand-green">
            <RichText items={p.rich_text} />
          </summary>
          <div className="pt-2">
            {block.children && <Blocks blocks={block.children} />}
          </div>
        </details>
      );

    case "to_do":
      return (
        <div className="my-1.5 flex items-start gap-2.5 leading-relaxed">
          <input
            type="checkbox"
            checked={p.checked ?? false}
            readOnly
            className="mt-1.5 h-4 w-4 shrink-0 accent-brand-blue dark:accent-brand-green"
          />
          <span className={p.checked ? "text-slate-400 line-through" : ""}>
            <RichText items={p.rich_text} />
          </span>
        </div>
      );

    case "code":
      return (
        <figure className="my-6 overflow-hidden rounded-2xl bg-app-black text-sm dark:ring-1 dark:ring-white/10">
          {p.language && p.language !== "plain text" && (
            <figcaption className="border-b border-white/10 px-5 py-2 font-mono text-xs text-slate-400">
              {p.language}
            </figcaption>
          )}
          <pre className="overflow-x-auto px-5 py-4">
            <code className="font-mono text-slate-100">
              {(p.rich_text ?? []).map((t) => t.plain_text).join("")}
            </code>
          </pre>
        </figure>
      );

    case "image": {
      const src = imageUrl(block);
      if (!src) return null;
      const rawCaption = (p.caption ?? []).map((t) => t.plain_text).join("");
      // 캡션 첫머리의 크기 지시어([작게]/[중간])로 표시 폭을 조절한다 -
      // Notion API가 드래그 리사이즈 값을 안 주기 때문에 캡션을 채널로 쓴다.
      const sizeMatch = rawCaption.match(/^\[(작게|중간)\]\s*/);
      const size = sizeMatch?.[1] ?? "기본";
      const caption = sizeMatch
        ? rawCaption.slice(sizeMatch[0].length)
        : rawCaption;
      // 기본: 본문 폭보다 살짝 넓게(당근 팀 블로그 방식) / 중간·작게: 가운데 정렬 축소.
      const figureClass =
        size === "기본" ? "my-10 sm:-mx-6" : "my-10 text-center";
      const imgClass =
        size === "작게"
          ? "mx-auto w-3/4 rounded-2xl sm:w-1/2"
          : size === "중간"
            ? "mx-auto w-9/10 rounded-2xl sm:w-3/4"
            : "w-full rounded-2xl";
      return (
        <figure className={figureClass}>
          <img src={src} alt={caption} loading="lazy" className={imgClass} />
          {caption && (
            <figcaption className="mt-3 text-center text-sm text-slate-400 dark:text-slate-500">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "divider":
      return <hr className="my-10 border-slate-200 dark:border-white/10" />;

    case "bookmark": {
      if (!p.url) return null;
      const caption = (p.caption ?? []).map((t) => t.plain_text).join("");
      return (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="my-6 block truncate rounded-2xl border border-slate-200 px-5 py-4 font-medium text-brand-blue transition hover:border-brand-blue/40 dark:border-white/10 dark:text-brand-green dark:hover:border-brand-green/40"
        >
          {caption || p.url}
        </a>
      );
    }

    case "table": {
      const rows = block.children ?? [];
      const hasHeader = p.has_column_header ?? false;
      return (
        <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, ri) => {
                const cells = (payload(row).cells ?? []) as RichTextItem[][];
                const isHeader = hasHeader && ri === 0;
                return (
                  <tr
                    key={row.id}
                    className={
                      isHeader
                        ? "bg-brand-blue-bg font-bold text-brand-ink dark:bg-app-black-900 dark:text-white"
                        : "border-t border-slate-200 dark:border-white/10"
                    }
                  >
                    {cells.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 align-top">
                        <RichText items={cell} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      // 가이드 밖의 블록(임베드·동영상·컬럼 등)은 조용히 건너뛴다.
      return null;
  }
}

export default function NotionBlocks({ blocks }: { blocks: NotionBlock[] }) {
  return (
    <div className="text-[1.0625rem] text-slate-600 dark:text-slate-300">
      <Blocks blocks={blocks} />
    </div>
  );
}
