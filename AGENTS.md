<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# dongsim-web

GPS 술래잡기 게임 **경찰과 도둑**의 공식 웹사이트 (팀 동심지키미).
Next.js 16 App Router + React 19 + Tailwind CSS v4 + pnpm, Vercel 배포.

```bash
pnpm install && pnpm dev   # 개발 (localhost:3000)
pnpm build                 # 검증 기준은 이 빌드의 "Compiled successfully"
```

## 절대 규칙 (항상 적용)

- 커밋: **한 줄 한국어** + `feat:`/`fix:`/`docs:`/`chore:`/`style:` 접두, **논리 작업 단위로 분리**, 트레일러 금지
- 테마 색은 쌍으로: `text-brand-blue dark:text-brand-green` (라이트=경찰=파랑, 다크=도둑=초록)
- **경찰·도둑 두 진영은 대등** - 한쪽을 기본값/주인공으로 두지 않는다
- 긴 대시(—·–) 금지, 하이픈(-) 사용
- UI를 새로 만들기 전에 `components/ui/` 프리미티브 먼저 확인
- 사용자에게 보이는 문구를 쓰거나 고칠 땐 `docs/copy-guide.md`의 말투를 따른다

## 상황별로 읽는 문서

| 이런 작업을 한다면 | 먼저 읽기 |
| --- | --- |
| 코드 구조 파악, 새 페이지/기능 추가 | `docs/architecture.md` |
| 커밋·코드 스타일·테마 상세 규칙 | `docs/conventions.md` |
| 사용자에게 보이는 문구(카피) 작성·수정 | `docs/copy-guide.md` |
| 다국어(영어·일본어) 번역·페이지 추가 | `docs/i18n.md` |
| 블로그(노션 CMS) 관련 개발 | `docs/blog-system.md` |
| 빌드·배포·환경 문제가 생겼을 때 | `docs/gotchas.md` |
| 팀원에게 블로그 글쓰기를 안내할 때 | `docs/blog-writing-guide.md` |
