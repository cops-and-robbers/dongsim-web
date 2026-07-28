# 블로그 시스템 (개발자용)

노션을 CMS로 쓰는 팀 블로그 "이야기"의 구조. 글 쓰는 법은 `blog-writing-guide.md`(팀원용).

## 데이터 흐름

```
노션 DB (공개 체크된 글)
  → lib/blog/notion.ts (getPosts / getBlocks)
  → app/blog/page.tsx (목록, ISR 60초) · app/blog/[slug]/page.tsx (본문, ISR 300초)
  → components/blog/NotionBlocks.tsx (블록 → 사이트 마크업)
```

- env: `NOTION_TOKEN`, `NOTION_BLOG_DATABASE_ID` - 없거나 API가 죽으면 **빈 목록 폴백**
  (빌드·사이트는 절대 깨지지 않는다). Vercel에도 같은 env 필요
- DB 속성 규약: 제목(title) · 슬러그 · 요약 · 작성자 · 날짜 · 태그 · 공개(checkbox).
  코드가 한/영 속성명을 모두 인식하지만 기준은 한국어
- SDK v5 (API 2025-09 체계): `databases.query`가 아니라 `dataSources.query`를 쓴다.
  database id → data source id 해석은 `notion.ts`가 캐시

## 이미지 파이프라인 (핵심)

노션 파일 URL은 **1시간 만료 서명 URL**이라 페이지에 직접 박으면 깨진다.

- 모든 업로드 이미지·커버는 `/api/blog/image?block=...&v=...&w=...` 프록시 경유
- 프록시는 원본을 받아 **sharp 리사이즈 + WebP 변환** 후 스트리밍, CDN 1년 불변 캐시
- `v=`(블록/페이지 수정 시각)가 버전 - 이미지가 바뀌면 URL이 바뀌어 캐시와 공존
- 폭은 용도별: 목록 카드 800 / 본문 1200 / 상세 커버 1600 (`withImageWidth`)
- GIF·SVG는 원본 통과, 디코딩 실패(HEIC 등)도 원본 폴백

## 렌더러 (`NotionBlocks.tsx`)

- 본문 타이포: **18px(`text-lg`) + 행간 1.6 + 문단 간격 `my-3`(12px)**.
  글자를 키우고(17→18px) 행간(1.8→1.6)과 문단 간격을 좁힌 값이다. 작은 글자 + 넓은
  행간 + 넓은 문단 간격 조합이 글을 흩어져 보이게 했던 것을 잡았다. 문단 간격 12px는
  사실상 하한이다 - 행간이 만드는 줄 사이 여백(약 11px)과 비슷해져 더 줄이면 문단 구분이
  사라진다. 팀원들이 문장마다 Enter를 누르는 습관에 맞춰, 그래도 촘촘히 읽히도록 튜닝했다.
- **블로그 이미지는 모서리를 둥글리지 않는다**(라운드 없음) - 커버·본문·목록/관련 카드 썸네일 전부.
  콘텐츠 사진은 각진 편이 editorial하게 읽힌다는 디자이너 규칙. 라운드는 UI 요소(버튼·카드)에만
- 지원 블록과 미지원 블록은 `blog-writing-guide.md`의 목록과 **항상 일치**시킨다
- 노션 글자 색은 의도적으로 무시 (사이트 테마 일관성)
- 이미지 크기 지시어: 캡션 앞 `[작게]`/`[중간]` 파싱
- **인라인 커스텀 이모지는 지원 불가** - 노션 API가 응답에서 통째로 누락시킨다 (실측 확인).
  다시 시도하지 말 것. 기본 유니코드 이모지만 지원

## 부가 기능

- 작성자 아바타·GitHub 링크: `lib/blog/authors.ts`가 `lib/constants.ts` 팀원과 이름 매칭
- 글별 동적 OG 카드: `app/blog/[slug]/opengraph-image.tsx` (제목+작성자, 날짜·태그는 의도적 제외)
- SEO: Article JSON-LD(`components/seo/ArticleJsonLd.tsx`), sitemap 자동 등록, RSS(`/rss.xml`)
- 페이지 타이틀은 이름만 (루트 레이아웃 템플릿이 `| 경찰과 도둑`을 붙인다 - 중복 금지)

## 보류된 것 (다시 제안하기 전에 확인)

- 읽는 시간 표시: 사용자가 명시적으로 거절
- 노션 페이지 아이콘 노출: 목록 일관성 문제로 미노출 결정
- 태그 필터·페이지네이션·TOC·댓글·조회수: 글이 쌓이면 (기준: 글 10개+, 태그 3종+)
