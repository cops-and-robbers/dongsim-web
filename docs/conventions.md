# 코드·커밋 컨벤션

## 커밋

- **한 줄 한국어** 메시지. 본문·트레일러(Co-Authored-By 등) 없음
- 접두어: `feat:` `fix:` `docs:` `chore:` `style:`
- **논리 작업 단위로 분리** - 프레임 교체와 게이트 수정은 별개 커밋. 리뷰·되돌리기가 쉬워야 한다
- 예시: `feat: 블로그 이미지 최적화(리사이즈·WebP·불변 캐시) 및 반영 주기 단축`

## 테마

- 토큰: `brand-blue`(#3F63D9) · `brand-green`(#38F55B) · `brand-ink` · `brand-blue-bg` · `app-black`(-900/-800)
- 라이트 모드 = 경찰 = 파랑 / 다크 모드 = 도둑 = 초록. 포인트 색은 **반드시 쌍**으로:
  `text-brand-blue dark:text-brand-green`, `bg-brand-blue dark:bg-brand-green dark:text-app-black`
- 본문 회색조: 제목 `text-brand-ink dark:text-white`, 본문 `text-slate-600 dark:text-slate-300`,
  보조 `text-slate-400 dark:text-slate-500`, 경계 `border-slate-200 dark:border-white/10`
- **경찰·도둑은 대등하다** - 캐릭터 노출·색·문구에서 한쪽을 주인공으로 만들지 않는다

## 코드 스타일

- 새 UI는 `components/ui/` 프리미티브(Button·Badge·SectionHeading 등)로 조립.
  기존 페이지의 인라인 클래스는 무리해서 일괄 교체하지 않고, 손대는 김에 점진 전환
- `<img>`를 쓰는 파일은 첫 줄에 `/* eslint-disable @next/next/no-img-element */`
  (외부·동적 이미지가 많아 next/image 대신 의도적으로 선택한 파일들)
- effect 안 setState가 불가피할 때만 `// eslint-disable-next-line react-hooks/set-state-in-effect`
- 주석은 "왜"를 적는다. 코드가 말해주는 "무엇"은 적지 않는다
- 긴 대시(—·–)는 코드·문서·카피 어디에도 쓰지 않는다. 하이픈(-)으로
- Tailwind는 정규 클래스 우선 (`aspect-3/2`처럼 - 에디터의 canonical 경고를 따른다)

## 데이터 규칙

- 게임 스펙 숫자(최대 인원, 시간 제한 등)의 근거는 **백엔드 요청 검증 값**이다.
  FE 상수는 표시용 사본일 뿐, 스펙 판단 근거로 삼지 않는다
- 사이트 전역 값(내비·팀원·링크)은 `lib/constants.ts` 한 곳만 고친다
