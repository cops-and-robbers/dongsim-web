# 구조 지도

어디에 뭐가 있고, 새 코드를 어디에 두어야 하는지.

## 페이지 (`app/`)

| 경로 | 역할 | 비고 |
| --- | --- | --- |
| `/` | 홈 - 게임 첫인상, 다운로드 유도 | |
| `/game` | 게임 소개 - 규칙·기능·FAQ | 콘텐츠는 `lib/constants.ts` |
| `/blog`, `/blog/[slug]` | 팀 블로그 "이야기" | 노션 CMS, `docs/blog-system.md` |
| `/team` | 팀 소개 | 멤버 데이터는 `lib/constants.ts` |
| `/design` | UI 스타일가이드 | 내부용, 내비·sitemap 미노출 |
| `/download` | 기기 인식 스토어 리다이렉트 | 부스 QR이 가리키는 곳 |
| `/join/[code]` | 게임 방 초대 딥링크 | `.well-known` 설정은 `next.config.ts` |
| `/event` | 행사 스토리 페이지 | 날짜 게이트 (`components/event/schedule.ts`) |
| `/photobooth` | 네컷 포토부스 키오스크 | 날짜 게이트 (`components/photobooth/schedule.ts`) |
| `/p` | 발급된 네컷 사진 받기 | 게이트 없음 (행사 후에도 접근 가능해야 함) |
| `/play` | 부스 미니게임 + 리더보드 | Upstash Redis |
| `/terms` `/privacy` `/location` `/marketing` | 약관류 | `components/policy/` |

## API (`app/api/`)

| 경로 | 역할 |
| --- | --- |
| `/api/blog/image` | 노션 이미지 프록시 - 리사이즈·WebP·1년 불변 캐시 |
| `/api/photobooth/upload` | Vercel Blob 업로드 토큰 발급 (운영 시간 게이트 포함) |
| `/api/booth/scores` | 미니게임 리더보드 (Redis 정렬 집합, 닉네임별 최고점) |

`/rss.xml`(route)과 `sitemap.ts`, `robots.ts`도 `app/` 루트에 있다.

## 컴포넌트 (`components/`)

| 폴더 | 내용 |
| --- | --- |
| `ui/` | **재사용 프리미티브** - Button, Badge, SectionHeading, Section, CharacterDuo, EmptyState, Modal, Input, CaptionedFigure, Container, ScrollReveal, DownloadButtons. 새 UI는 여기부터. 전시장은 `/design` |
| `blog/` | 노션 블록 → 사이트 마크업 렌더러 |
| `layout/` | Header, Footer, MobileMenu (내비는 `lib/constants.ts`의 `NAV_ITEMS`) |
| `home/`, `game/`, `team/`, `event/` | 각 페이지 전용 섹션 |
| `photobooth/` | 키오스크 단계별 화면 + `schedule.ts`(게이트) + `frames.ts`(프레임 좌표) |
| `booth/` | 부스 미니게임 |
| `characters/`, `icons/` | 캐릭터·아이콘 컴포넌트 |
| `seo/` | JSON-LD (Breadcrumb, Article) |

## 데이터·설정

- `lib/constants.ts` - 사이트 전역 상수의 단일 출처: 내비, 브랜드, 팀원(블로그 작성자 매핑에도 사용), 게임 소개 콘텐츠
- `lib/blog/` - 노션 데이터 레이어 (`notion.ts`), 작성자 매핑(`authors.ts`), 날짜 포맷(`format.ts`)
- `public/` - 정적 에셋: `brand/`(로고), `characters/`, `event/`, `photobooth/`, `team/`(프로필 사진)
- `next.config.ts` - 이미지 설정, `.well-known` 헤더, OG 라우트 파일 트레이싱

## 반복되는 패턴

- **날짜 게이트**: 행사 페이지는 운영 창(KST)으로 열고 닫되, 개발 모드는 항상 열림
  (`process.env.NODE_ENV !== "production"` 오버라이드 - 제거 금지). 미리보기는 `forceClosed: true`
- **OG 이미지**: 페이지 폴더의 `opengraph-image.tsx` (next/og + Pretendard).
  요청 시점에 생성되는 라우트는 `next.config.ts` 트레이싱 등록 필수 (`docs/gotchas.md`)
- **ISR**: 외부 데이터 페이지는 `export const revalidate = N` + 실패 시 빈 값 폴백 (빌드 불사)

## 프리미티브 미적용 영역 (의도적)

- **포토부스 키오스크의 버튼들** - 키오스크 전용 스케일(px-12 py-4 등)이고 다크 모드에서도
  브랜드 파랑을 유지하는 현장 특화 UI라 공용 Button을 쓰지 않는다
- **OG 이미지(`opengraph-image.tsx`)** - satori 렌더러라 Tailwind 컴포넌트를 쓸 수 없다 (인라인 스타일)
