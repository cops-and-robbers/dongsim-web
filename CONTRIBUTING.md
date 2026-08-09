# 기여 가이드

경찰과 도둑 웹사이트(`dongsim-web`) 작업 방식이에요. 이 문서는 **협업 흐름**만 다뤄요.
코드·커밋·테마 상세 규칙은 [`docs/conventions.md`](docs/conventions.md), 작업별 참고 문서는 [`AGENTS.md`](AGENTS.md)를 봐주세요.

## 작업 흐름

이슈 → 브랜치 → PR → 리뷰 → 머지 순서로 진행해요.

1. **이슈 생성** - [이슈 템플릿](.github/ISSUE_TEMPLATE) 중 맞는 종류(기능·버그·UI·리팩토링·문서)를 골라 작성해요. 서버·API 이슈는 [백엔드 레포](https://github.com/cops-and-robbers/cops-and-robbers-BE)에 올려요.
2. **브랜치 생성** - 이슈 번호를 담아 만들어요.
   - 형식: `<type>/#<이슈번호>-<짧은-설명>`
   - 예: `feat/#12-admin-notice-filter`, `fix/#31-login-redirect`
3. **작업 & 커밋** - 아래 커밋 규칙을 따라요.
4. **PR 생성** - [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)이 자동으로 채워져요. 관련 이슈를 `closes #12`로 연결하면 머지 시 자동으로 닫혀요.
5. **리뷰 & 머지** - 리뷰 반영 후 머지해요.

## 커밋 규칙

- **한 줄 한국어** 메시지. 본문·트레일러(`Co-Authored-By` 등) 없이요.
- 접두어: `feat:` `fix:` `docs:` `chore:` `style:`
- **논리 작업 단위로 분리** - 리뷰·되돌리기가 쉽게, 한 커밋엔 한 가지 목적만요.
- 예: `feat: 관리자 공지 목록에 카테고리 필터 추가`

## PR 규칙

- 관련 이슈를 반드시 연결해요 (`closes #N`).
- UI 변경이 있으면 **라이트·다크**, **데스크톱·모바일** 스크린샷을 함께 올려요.
- 병합 전 아래 확인을 통과해야 해요.

## 검증 기준

```bash
pnpm build   # "Compiled successfully" 가 나와야 통과예요
```

## 꼭 지킬 것

- 긴 대시(—·–)는 코드·문서·카피 어디에도 쓰지 않아요. 하이픈(-)을 써요.
- **경찰·도둑 두 진영은 대등해요** - 색·문구·캐릭터에서 한쪽을 주인공으로 두지 않아요.
- 사용자에게 보이는 문구는 `lib/i18n/messages.ts`가 단일 출처예요. 말투는 [`docs/copy-guide.md`](docs/copy-guide.md)를 따라요.
- 테마 색은 쌍으로: `text-brand-blue dark:text-brand-green` (라이트=경찰=파랑 / 다크=도둑=초록).
