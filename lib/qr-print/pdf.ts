// 그림 한 장을 한 쪽짜리 PDF 로 감싼다. 라이브러리 없이 PDF 1.4 최소 구조만 쓴다.
// 그림은 JPEG 그대로(DCTDecode) 넣어 다시 압축하지 않는다.

const enc = new TextEncoder();

/** mm 를 PDF 단위(pt, 1/72인치)로 */
export const mmToPt = (mm: number) => (mm * 72) / 25.4;

export type PdfImage = { jpeg: Uint8Array; width: number; height: number };

/** 쪽 크기(mm) 하나에 그림 하나를 꽉 채운 PDF */
export function jpegToPdf(img: PdfImage, mm: { width: number; height: number }, title = "QR"): Uint8Array {
  const W = mmToPt(mm.width).toFixed(3);
  const H = mmToPt(mm.height).toFixed(3);
  const content = enc.encode(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q\n`);
  // 제목은 PDF 문자열 규칙대로 괄호와 역슬래시를 막고, 한글은 UTF-16BE 로 넣는다
  const titleHex = Array.from(title)
    .flatMap((ch) => {
      const code = ch.codePointAt(0)!;
      const units = code > 0xffff ? [0xd800 + ((code - 0x10000) >> 10), 0xdc00 + ((code - 0x10000) & 0x3ff)] : [code];
      return units.map((u) => u.toString(16).padStart(4, "0"));
    })
    .join("");

  const objects: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
      img.jpeg,
      "\nendstream",
    ],
    [`<< /Length ${content.length} >>\nstream\n`, content, "endstream"],
    [`<< /Title <FEFF${titleHex}> /Producer (copsandrobbers.app) >>`],
  ];

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (part: string | Uint8Array) => {
    const b = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(b);
    offset += b.length;
  };
  // 바이너리가 들어 있다는 표시(둘째 줄의 0x80 넘는 바이트)
  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const offsets: number[] = [];
  objects.forEach((parts, i) => {
    offsets.push(offset);
    push(`${i + 1} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  });
  const xref = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => push(`${String(o).padStart(10, "0")} 00000 n \n`));
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}
