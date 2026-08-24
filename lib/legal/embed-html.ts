// 앱 웹뷰가 여는 법적 문서 HTML(#47).
//
// React 컴포넌트가 아니라 문자열로 만드는 이유:
//
// app/layout.tsx 는 모든 라우트를 감싸고 Header·Footer·GTM 을 넣는다. page.tsx 로
// 만들면 이걸 벗어날 수 없어서, 앱 안에서 약관을 열 때마다 GTM 이 웹 페이지뷰를
// 쏘고 쓰지도 않는 헤더·푸터 JS 가 따라온다(실측 111KB, JS 7청크). Route Handler 는
// 레이아웃을 타지 않으므로 응답을 통째로 우리가 정한다.
//
// 그리고 3단계에서 앱이 이 HTML 을 기기에 저장해 file:// 로 열 예정이라
// (파일 캐시), 외부 참조가 적을수록 좋다. CSS 는 인라인이고 폰트만 밖에 있다.
//
// 원본: FE `lib/core/widgets/pages/legal_document_page.dart`

import type { LegalDoc, PolicyData } from "./documents";
import { getLegalDoc } from "./documents";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*
 * --u 는 "앱 논리픽셀 1개"다.
 *
 * 앱은 flutter_screenutil 을 쓰고 디자인 기준이 Size(393, 852)다. 즉 12.sp 는
 * 12px 이 아니라 기기 폭에 비례한다. 여기에 12px 을 그대로 쓰면 큰 폰에서 앱보다
 * 작아 보인다. --u 로 그 비례를 재현하고 앱 값을 그대로 곱한다. 상·하한은
 * 태블릿이나 데스크톱 브라우저로 열렸을 때를 위한 것이다.
 *
 * letter-spacing 만 px 고정이다. 앱에서도 .sp 가 안 붙어 있어 기기 크기와
 * 무관한 절대값이다.
 *
 * 다크 모드 분기를 두지 않는다. 앱의 LegalDocumentPage 가 라이트 고정이라
 * 그쪽에 맞춘 것이고, 여기서만 어두워지면 앱 화면과 이질감이 생긴다.
 */
const CSS = `
@font-face{font-family:PretendardLegal;font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/legal/pretendard-500.woff2) format('woff2')}
@font-face{font-family:PretendardLegal;font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/legal/pretendard-600.woff2) format('woff2')}
:root{
  --u:clamp(0.9px,calc(100vw / 393),1.2px);
  --white:#ffffff;--black:#080a0c;--black800:#333d48;--black100:#edf0f2;
}
*{margin:0;padding:0;box-sizing:border-box}
html{background:var(--white);-webkit-text-size-adjust:100%}
body{
  background:var(--white);
  padding:calc(16 * var(--u));
  font-family:PretendardLegal,-apple-system,BlinkMacSystemFont,system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  letter-spacing:-0.32px;
  /* 텍스트 선택과 확대를 막지 않는다. 약관은 복사하고 확대해서 읽는 문서고,
     앱의 Text 위젯에서는 안 되던 것이라 여기서 개선되는 부분이다. */
  -webkit-user-select:text;user-select:text;
}
.notice{
  margin-bottom:calc(16 * var(--u));padding:calc(16 * var(--u));
  border-radius:calc(12 * var(--u));background:var(--black100);
  color:var(--black800);font-size:calc(12 * var(--u));font-weight:500;line-height:1.4;
}
section + section{margin-top:calc(24 * var(--u))}
h2{
  color:var(--black);font-size:calc(14 * var(--u));font-weight:600;line-height:1;
  margin-bottom:calc(8 * var(--u));
}
/* 본문을 문단으로 쪼개지 않는다. 앱은 content 문자열 하나를 Text 위젯 하나로
   그리고 \\n 을 줄바꿈으로 낸다. 사이트용 PolicyRenderer 처럼 \\n\\n 으로 잘라
   여러 문단을 만들면 문단 간격이 붙어 앱과 높이가 어긋난다. */
p,li{
  color:var(--black800);font-size:calc(12 * var(--u));font-weight:500;
  line-height:1.4;white-space:pre-line;
}
ul{list-style:none}
.items{margin-top:calc(8 * var(--u))}
.items > li{margin-top:calc(4 * var(--u))}
/* 하위 항목 앞에 기호를 붙이지 않는다. 앱이 문자열을 그대로 그리고,
   기호가 필요한 문서는 이미 본문에 넣어 두었다. */
.sub{padding-left:calc(16 * var(--u));margin-top:calc(4 * var(--u))}
.sub > li{margin-top:calc(2 * var(--u))}
.sub > li:first-child{margin-top:0}
/* 안드로이드 제스처 네비게이션 바와 마지막 본문이 겹치지 않도록 */
.tail{height:calc(64 * var(--u))}
`.trim();

function renderSection(section: PolicyData["sections"][number]): string {
  const parts: string[] = [];

  if (section.heading) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
  }
  if (section.content) {
    parts.push(`<p>${escapeHtml(section.content)}</p>`);
  }
  if (section.items.length > 0) {
    const items = section.items
      .map((item) => {
        const sub =
          item.subItems.length > 0
            ? `<ul class="sub">${item.subItems
                .map((text) => `<li>${escapeHtml(text)}</li>`)
                .join("")}</ul>`
            : "";
        return `<li>${escapeHtml(item.text)}${sub}</li>`;
      })
      .join("");
    parts.push(`<ul class="items">${items}</ul>`);
  }

  return `<section>${parts.join("")}</section>`;
}

/**
 * 앱 웹뷰용 완결된 HTML 문서.
 *
 * 제목과 시행일을 따로 그리지 않는다. 앱이 AppBar 에 제목을 그리고, 문서의 첫
 * 섹션이 이미 제목과 시행일을 담고 있어서 여기서 또 그리면 두 번 나온다.
 *
 * @param notice 번역되지 않은 로케일에 띄우는 고지 문구. 없으면 배너를 그리지 않는다
 */
export function renderLegalEmbedHtml(
  doc: LegalDoc,
  options: { lang?: string; notice?: string } = {},
): string {
  const { lang = "ko", notice } = options;
  const data = getLegalDoc(doc);

  const banner = notice ? `<p class="notice">${escapeHtml(notice)}</p>` : "";
  const body = data.sections.map(renderSection).join("");

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(data.title)}</title>
<style>${CSS}</style>
</head>
<body>${banner}${body}<div class="tail" aria-hidden="true"></div></body>
</html>`;
}
