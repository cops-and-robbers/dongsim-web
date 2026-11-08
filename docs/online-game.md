# 경찰과 도둑 온라인 게임 입구

브라우저에서 친구들과 바로 하는 온라인 게임은 다른 저장소(`cops-and-robbers-web-game`)예요. 웹사이트는 들어가는 길과 어드민 스위치만 둬요(#209).

## 어디에 무엇이 있나

| 자리 | 하는 일 |
| --- | --- |
| 홈 소개 칸(`components/home/OnlineGameTeaserSection.tsx`) | "만들고 있어요"와 `/online` 링크. 게임이 한국어만 있어 한국어 홈에만 둬요 |
| `/online`(`app/online/page.tsx`) | 게임의 `GET /status` 를 30초마다 서버에서 읽어 버튼을 바꿔요. 한국어 전용(`KO_ONLY_PATHS`) |
| 어드민 "온라인 게임" | 상태를 바꿔요. `docs/admin-ui.md` |

## 게임 장면은 실제 게임과 같게 배치해요

`components/online/scenes.tsx`(쫓기, 숨기, 위치 공개, 감옥)와 `components/online/LobbyScene.tsx`(대기실)는 실제 판을 찍은 그림이 아니에요. 게임과 같은 에셋과 같은 그리기 규칙으로 자리를 잡아 SVG 로 그렸어요. 부품은 `components/online/scene.tsx`.

- 캡처 대신 배치한 까닭: 실제 판을 찍으면 원하는 순간이 잘 안 잡히고, 안내 띠나 구역선이 끼어들고, 줄이면 뭉개져요. 배치하면 어떤 크기에서도 선명하고 보여 줄 순간만 골라요
- 에셋: 캐릭터는 게임 `client/playground.html` 의 `SVGS` 를 `public/online/` 에 그대로 꺼냈고, 수풀, 나무, 작은 나무, 꽃은 게임 `client/brand/map` 모양 그대로예요
- 그리기 규칙: 지도 색과 시야(510, 가까이 150, 각 1.15 라디안, 0.72 부터 흐려짐)는 `shared/logic.js`, 길(64칸 줄), 건물(지붕, 벽, 창 격자, 문, 실외기, 70 높게), 생울타리, 쓰레기통, 감옥, 위치 공개 표시는 `client/game.js` 의 그리기 코드, 분필은 `client/lobby.js` 의 같은 씨앗을 옮겼어요
- 화면 위 표시: 폰 가로 844x390 에서 실제 게임과 대기실의 위치, 크기, 색을 재서 옮겼어요(소리 38, 시간 75x43, 위치 공개 178x45, 미니맵 112x84, 조이스틱 112, 달리기 72, 잡기 92, 방 코드 143x53 등). 카메라 확대도 게임과 같은 0.5417
- 숫자와 문구는 게임에 실제로 뜨는 것만 써요
- 조금씩 움직여요(걷기, 고개 내밀기, 공개 표시 퍼짐, 지나가는 경찰). 움직임을 줄이도록 설정한 사람에게는 멈춰요
- 게임 화면이 바뀌면 같이 고쳐요. 가로 폰 틀은 `components/online/LandscapeFrame.tsx`

헤더에는 한국어에서만 "온라인 게임" 메뉴를 둬요(`lib/i18n/chrome.ts`).

## 폰에서 깜빡임 (2026-11-07, #213)

폰에서 장면이 하얗게 떴다 보였다 하며 끊겼어요. 그리는 방식을 게임(`client/shell.html` 의 `#world`, `game.js` 의 `drawFog`)과 같게 바꿨어요.

| 원인 | 고친 것 |
| --- | --- |
| 장면을 감싼 등장 효과 상자(`ScrollReveal`)에 `will-change` 가 남아 GPU 층이 되고, 카메라가 움직일 때마다 그 안의 지도 전체를 다시 칠했어요 | 나타난 뒤에는 층 예약을 풀어요(`.scroll-animate.visible`). 지도와 캐릭터 판(`.plane`)은 자기 층으로 올려 한 번만 칠하고 카메라는 층을 옮기기만 해요 |
| 시야 안개를 지도 크기(2400x1400) SVG 마스크에 흐림을 걸어 매 프레임 다시 그렸어요 | 화면 크기 캔버스에 게임과 같은 식으로 그려요. 폰은 화면 배율을 2까지만 써요 |
| 화면 밖 장면 다섯 개도 큰 층을 계속 잡고 있었어요(층 72개) | 화면에 보이는 장면만 층을 써요(`data-live`). 41개로 줄었어요. 아이폰은 층 메모리 한도가 빡빡해요 |
| 둥근 폰 틀 안의 GPU 층이 사파리에서 잘림이 풀리거나 깜빡일 수 있어요 | 틀 안쪽에 `translateZ(0)` 를 줘서 안의 층도 둥글게 잘리게 해요 |

잰 것(폰 크기 390x844, 화면 배율 3, CPU 4배 느리게, 개발 서버, 3초): 대표 장면 프레임 44 → 54~70(잴 때마다 흔들려요), 칠하기는 문서 한 번에 약 2ms 로 줄었어요. 남은 시간은 캐릭터 뼈대 움직임(게임과 같은 코드)과 개발 모드 React 검사예요. 운영 판은 미리보기 배포에서 다시 재요.

## 상태별 화면

| 상태 | 버튼 | 아래 글 |
| --- | --- | --- |
| 공개 전 | 누를 수 없는 "친구랑 한 판 하기" | 아직 만들고 있어요 |
| 누구나 | "친구랑 한 판 하기" → 게임(`utm_source=site&utm_medium=online_page`) | 없음 |
| 점검 중 | 누를 수 없는 버튼 | 어드민이 적은 안내, 또는 다시 여는 시각, 또는 기본 문장 |

상태를 못 읽으면 공개 전으로 봐요. 아직 열리지 않은 게임으로 보내지 않게요.

## 근거

| 정한 것 | 근거 |
| --- | --- |
| "곧 열려요" 대신 "만들고 있어요" | 날짜가 없으면 약속하는 말을 쓰지 않고, 정해지면 날짜와 시각을 적어요(GOV.UK 서비스 중단 페이지 패턴). 팀도 "곧"이 어색하다고 했어요 |
| 버튼은 숨기지 않고 누를 수 없게, 바로 아래 까닭 | 언젠가 누를 수 있는 버튼은 비활성으로 두고 까닭을 알려요(NN/g 비활성 버튼, Smart Interface Design Patterns). 키보드 초점은 닿게 `aria-disabled` 로 둬요(W3C APG) |
| 아래에 오프라인 경찰과 도둑 하나 | 막다른 화면이 되지 않게 대신 할 수 있는 길을 하나만 둬요(GOV.UK). "그동안 앱에서 하라"가 아니라 오프라인도 눈여겨봐 달라는 팀 의견을 따랐어요 |
| 검색에 내보내고 사이트맵에도 넣어요 | 공개 전에는 막아 뒀다가 게임을 열면서 풀었어요(2026-11-08) |
| 점검 예정 시각이 지나면 숨겨요 | 지난 시각을 그대로 두지 않아요(Atlassian Statuspage 점검 예약) |

출처: https://design-system.service.gov.uk/patterns/service-unavailable-pages/ , https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/ , https://smart-interface-design-patterns.com/articles/hidden-vs-disabled/ , https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ , https://www.nngroup.com/articles/confirmation-dialog/ , https://primer.style/product/components/confirmation-dialog/guidelines , https://support.atlassian.com/statuspage/docs/schedule-maintenance/

## 게임 주소

지금은 `https://cops-and-robbers-game.pages.dev` 예요. `play.copsandrobbers.app` 도 같은 게임에 붙여 두었고, 한국 통신사 지연을 견준 뒤 정해요. 바꾸면 Vercel 환경변수 `WEBGAME_URL` 만 고쳐요.
