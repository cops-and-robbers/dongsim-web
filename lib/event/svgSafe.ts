/**
 * 올리는 캐릭터 SVG 를 안전하게 만든다 (#227).
 *
 * SVG 는 그림이 아니라 글로 된 파일이라 스크립트, 이벤트 속성(onload 등), 다른 주소를 부르는 링크를 넣을 수 있다.
 * 그림은 우리 사이트 주소로 내주니, 그대로 두면 누가 그 주소를 직접 열었을 때 우리 사이트 안에서 스크립트가 돈다.
 *
 * 그래서 "나쁜 것을 지우는" 대신 "그리는 데 필요한 것만 남겨 새로 짓는다". 모르는 요소는 통째로, 모르는 속성은 하나씩 버린다.
 * - 요소: 도형, 묶음, 그라데이션, 마스크, 클립, 필터, 글자, 안에 든 그림(data: 래스터만)
 * - 속성: 그리기 속성만. url() 은 같은 파일 안(#id)만, 링크(href)는 #id 와 data:image 래스터만
 * - DOCTYPE, ENTITY 는 받지 않는다(엔티티를 부풀려 서버를 멈추게 하는 공격)
 * 내줄 때는 스크립트 실행을 막는 헤더도 붙여 두 겹으로 막는다(app/photobooth/asset).
 */
import { XMLBuilder, XMLParser } from "fast-xml-parser";

const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern",
  "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix", "feComposite", "feFlood", "feMerge", "feMergeNode", "feMorphology", "feDropShadow",
  "text", "tspan", "image",
]);

const ATTRS = new Set([
  "id", "class", "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "fr", "width", "height", "viewBox", "points",
  "transform", "preserveAspectRatio", "version", "xmlns", "xmlns:xlink", "xml:space",
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity",
  "opacity", "color", "display", "visibility", "shape-rendering", "paint-order", "vector-effect", "style",
  "clip-path", "clip-rule", "clipPathUnits", "mask", "mask-type", "maskUnits", "maskContentUnits",
  "gradientUnits", "gradientTransform", "spreadMethod", "offset", "stop-color", "stop-opacity", "patternUnits", "patternContentUnits", "patternTransform",
  "filter", "filterUnits", "primitiveUnits", "in", "in2", "result", "stdDeviation", "dx", "dy", "mode", "type", "values", "operator", "k1", "k2", "k3", "k4", "radius",
  "flood-color", "flood-opacity", "color-interpolation-filters",
  "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing",
  "href", "xlink:href",
]);

const RASTER_DATA = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;

/** url(...) 이 있으면 모두 같은 파일 안(#id)이어야 한다 */
const urlsLocal = (v: string) => [...v.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)].every((m) => m[2].startsWith("#"));

function safeAttr(tag: string, name: string, value: string): boolean {
  if (!ATTRS.has(name)) return false;
  if (/javascript:|vbscript:|data:text|expression\(|@import/i.test(value)) return false;
  if (!urlsLocal(value)) return false;
  if (name === "href" || name === "xlink:href") return value.startsWith("#") || (tag === "image" && RASTER_DATA.test(value));
  return true;
}

type Node = Record<string, unknown>;

function clean(nodes: Node[]): Node[] {
  const out: Node[] = [];
  for (const n of nodes) {
    if ("#text" in n) {
      out.push(n);
      continue;
    }
    const tag = Object.keys(n).find((k) => k !== ":@");
    if (!tag || !ELEMENTS.has(tag)) continue;
    const attrs = (n[":@"] ?? {}) as Record<string, string>;
    const kept: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) if (safeAttr(tag, k, String(v))) kept[k] = String(v);
    if (tag === "image" && !kept.href && !kept["xlink:href"]) continue;
    const next: Node = { [tag]: clean((n[tag] as Node[]) ?? []) };
    if (Object.keys(kept).length) next[":@"] = kept;
    out.push(next);
  }
  return out;
}

export type SafeSvg = { svg: string; width: number; height: number };

/** 안전한 SVG 와 크기. 받을 수 없는 파일이면 이유를 담아 던진다 */
export function sanitizeSvg(input: string): SafeSvg {
  if (input.length > 1024 * 1024) throw new Error("1MB 아래로 줄여 주세요.");
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error("DOCTYPE, ENTITY 가 든 SVG 는 받지 않아요. 디자인 도구에서 다시 내보내 주세요.");
  const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", processEntities: true, htmlEntities: false, ignoreDeclaration: true, ignorePiTags: true });
  let tree: Node[];
  try {
    tree = parser.parse(input) as Node[];
  } catch {
    throw new Error("SVG 를 읽지 못했어요.");
  }
  const root = tree.find((n) => "svg" in n);
  if (!root) throw new Error("SVG 파일이 아니에요.");
  const [safe] = clean([root]);
  const attrs = (safe[":@"] ?? {}) as Record<string, string>;
  attrs.xmlns = "http://www.w3.org/2000/svg";
  safe[":@"] = attrs;

  const vb = (attrs.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  const num = (v?: string) => (v && /^\d+(\.\d+)?(px)?$/.test(v.trim()) ? parseFloat(v) : NaN);
  const width = Number.isFinite(num(attrs.width)) ? num(attrs.width) : vb.length === 4 ? vb[2] : NaN;
  const height = Number.isFinite(num(attrs.height)) ? num(attrs.height) : vb.length === 4 ? vb[3] : NaN;
  if (!(width > 0 && height > 0)) throw new Error("크기(viewBox 또는 width, height)가 없는 SVG 예요.");

  const builder = new XMLBuilder({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", suppressEmptyNode: true, processEntities: true });
  return { svg: builder.build([safe]) as string, width: Math.round(width), height: Math.round(height) };
}
