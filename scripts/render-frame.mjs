/**
 * 포토부스 프레임 SVG → PNG 렌더 + 사진 창 좌표 실측 (#130).
 *
 * 디자이너가 새 프레임 SVG를 주면 이 스크립트 한 번으로 교체 준비가 끝난다:
 *
 *   node scripts/render-frame.mjs <SVG경로> <프레임id> [폭 높이]
 *   예) node scripts/render-frame.mjs "C:/Users/me/Desktop/네컷프레임.svg" green 1800 5400
 *
 * 1. public/photobooth/frame-<id>.png 로 렌더한다 (투명 창 유지)
 * 2. 알파 채널을 스캔해 창 후보 좌표를 출력한다 → frames.ts 의 slots 에 붙여넣는다
 *
 * 주의: 창 위에 스티커·장식이 걸친 디자인은 스캔 값이 실제 창보다 작게 나온다.
 * 그때는 SVG 원본의 창 사각형 경로 좌표와 교차 확인한다 (#130 에서 실제로 그랬다 -
 * 확정 좌표는 스캔이 아니라 SVG 경로에서 왔다).
 */
import sharp from "sharp";

const [svgPath, id, wArg, hArg] = process.argv.slice(2);
if (!svgPath || !id) {
  console.error("사용법: node scripts/render-frame.mjs <SVG경로> <프레임id> [폭 높이]");
  process.exit(1);
}

const meta = await sharp(svgPath).metadata();
const W = wArg ? Number(wArg) : meta.width;
const H = hArg ? Number(hArg) : meta.height;
const out = `public/photobooth/frame-${id}.png`;

await sharp(svgPath, { density: 300 }).resize(W, H).png().toFile(out);
console.log(`렌더 완료: ${out} (${W}x${H})`);

const { data, info } = await sharp(out)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const alphaAt = (x, y) => data[(y * info.width + x) * 4 + 3];

// 세로 중앙선에서 투명 밴드(창 후보의 y 범위)를 찾고, 각 밴드의 가로 범위를 잰다
const cx = Math.floor(W / 2);
const bands = [];
let start = null;
for (let y = 0; y < H; y++) {
  const transparent = alphaAt(cx, y) < 10;
  if (transparent && start === null) start = y;
  if (!transparent && start !== null) {
    bands.push([start, y - 1]);
    start = null;
  }
}
if (start !== null) bands.push([start, H - 1]);

console.log(`\n창 후보 ${bands.length}개 (frames.ts slots 용 - 장식이 걸친 창은 SVG 경로와 교차 확인):`);
for (const [y0, y1] of bands) {
  const ym = Math.floor((y0 + y1) / 2);
  let x0 = null, x1 = null;
  for (let x = 0; x < W; x++) {
    if (alphaAt(x, ym) < 10) {
      if (x0 === null) x0 = x;
      x1 = x;
    }
  }
  console.log(
    `  { x: ${x0}, y: ${y0}, w: ${x1 - x0 + 1}, h: ${y1 - y0 + 1} },`
  );
}
