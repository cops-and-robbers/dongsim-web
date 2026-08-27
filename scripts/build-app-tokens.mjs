// 앱 저장소의 디자인 상수를 읽어 웹 토큰 파일을 생성한다 (#65).
//
// 폰 목업이 앱과 "비슷한 그림"이 아니라 같은 값에서 파생되게 하는 다리다.
// 앱의 색이 바뀌면 이 스크립트를 다시 돌려 lib/app-tokens.ts 를 갱신한다.
// 생성 파일은 커밋한다 - CI 나 팀원 환경에 앱 저장소가 없어도 빌드돼야 한다.
//
//   COPS_FE_DIR="C:/dev/cops-and-robbers-FE" node scripts/build-app-tokens.mjs
//
// 위젯의 치수(말풍선 패딩 등)는 여기서 뽑지 않는다. 코드 곳곳에 흩어져 있어
// 자동 추출이 취약하므로, 목업 컴포넌트에 출처 주석과 함께 직접 적는다.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FE_DIR = process.env.COPS_FE_DIR;
if (!FE_DIR) {
  console.error(
    "COPS_FE_DIR 환경변수에 cops-and-robbers-FE 저장소 경로를 지정해주세요.",
  );
  process.exit(1);
}

const source = readFileSync(
  join(FE_DIR, "lib/core/constants/app_colors.dart"),
  "utf8",
);

// static const Color black700 = Color(0xFF485665);
const colorPattern = /static const Color (\w+) = Color\(0xFF([0-9A-Fa-f]{6})\);/g;
const colors = {};
for (const match of source.matchAll(colorPattern)) {
  colors[match[1]] = `#${match[2].toUpperCase()}`;
}

const count = Object.keys(colors).length;
if (count < 20) {
  console.error(`색 추출이 ${count}개뿐입니다. 앱 쪽 형식이 바뀌었는지 확인해주세요.`);
  process.exit(1);
}

const banner = `// 자동 생성 파일 - 직접 수정하지 마세요.
// 원본: cops-and-robbers-FE/lib/core/constants/app_colors.dart
// 갱신: COPS_FE_DIR=<앱 저장소 경로> node scripts/build-app-tokens.mjs
`;

const entries = Object.entries(colors)
  .map(([name, hex]) => `  ${name}: "${hex}",`)
  .join("\n");

writeFileSync(
  "lib/app-tokens.ts",
  `${banner}export const appColors = {\n${entries}\n} as const;\n`,
);

console.log(`lib/app-tokens.ts 생성 완료 (색 ${count}개)`);
