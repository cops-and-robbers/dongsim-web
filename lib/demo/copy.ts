import type { Locale } from "@/lib/i18n/config";
import type { DemoSceneId, DemoScene, DemoCourse } from "@/lib/demo/scenes";

// 데모 문구 단일 출처. 클라이언트 트리 전체가 쓰므로 messages.ts와 분리해
// 번들을 작게 유지한다 (chrome.ts와 같은 이유. 페이지 메타만 messages.ts).
//
// 두 층으로 나뉜다:
// - app: 폰 "안" 문구. 앱의 공식 번역(cops-and-robbers-FE lib/l10n/app_*.arb)을
//   그대로 옮긴다. 여기서 새로 번역하지 않는다.
// - 나머지(stage·scenes·course 등): 폰 "밖" 웹 문구. 사이트 로케일을 따른다.

// 앱 화면이 쓰는 문자열 (원본 arb 키를 주석으로 남긴다)
export type DemoAppStrings = {
  /** 홈 헤더 로고 에셋 (localizedAppLogo) */
  logo: string;
  /** homePageWelcomeMessage - 줄바꿈 포함 */
  welcome: string;
  /** buttonCreateRoom / buttonJoinRoom */
  createRoom: string;
  joinRoom: string;
  /** dialogJoinRoomTitle / fieldInviteCodeHint / buttonCancel / buttonJoin */
  joinTitle: string;
  joinHint: string;
  close: string;
  join: string;
  /** gameTeamCop / gameTeamRobber / unitPerson */
  teamPolice: string;
  teamRobber: string;
  personCount: (n: number) => string;
  /** buttonReady / buttonReadyDone */
  ready: string;
  readyDone: string;
  /** dialogLeaveRoom* / gameLeaveConfirm* / buttonLeave */
  leaveRoomTitle: string;
  leaveRoomMessage: string;
  leaveGameTitle: string;
  leaveGameMessage: string;
  leave: string;
  /** bottomNavHome / bottomNavCommunity / bottomNavMyPage */
  navHome: string;
  navCommunity: string;
  navMy: string;
  /** gameLocationRevealCountdown */
  revealCountdown: (formatted: string) => string;
  /** chatInputBarHint */
  chatHint: string;
  /** pingFound / pingSuspect */
  pingFound: string;
  pingSuspect: string;
  /** qrScannerWantedRobberTitle */
  qrScanTitle: string;
  /** gameParticipantOverlayCurrent / gameParticipantOverlayCount / gameRobberStatusEscaping */
  overlayCurrent: string;
  overlayCount: (n: number) => string;
  escaping: string;
  /** gameResultWin / fieldGamePlaytime / labelArrestCount / fieldRemainingRobbers */
  win: string;
  playtime: string;
  arrestCount: string;
  remainingRobbers: string;
  /** buttonGoHome / buttonPlayAgain */
  goHome: string;
  playAgain: string;
  /** zonePlayground / zoneJail */
  zonePlayground: string;
  zoneJail: string;
  /** areaTypeSetByDistance / areaTypeSetByPin */
  byDistance: string;
  byPin: string;
  /** setupPlayground(Pin)Description / setupPrison(Pin)Description */
  playgroundDesc: string;
  playgroundPinDesc: string;
  jailDesc: string;
  jailPinDesc: string;
  /** zoneRadiusLabel / zoneRadiusValue / zoneAreaLabel / zoneAreaValue / zoneClearAllPins */
  radiusLabel: string;
  radiusValue: (value: string) => string;
  areaLabel: string;
  areaValue: (value: string) => string;
  clearAllPins: string;
  /** buttonDone / buttonNext / buttonCompleteSetup / buttonConfirm */
  done: string;
  next: string;
  completeSetup: string;
  confirm: string;
  /** sessionCreationStep* */
  basicTitle: string;
  basicHint: string;
  reviewTitle: string;
  reviewHint: string;
  participantsHint: string;
  /** gameSettingNoLocationShareWarning / gameSettingPoliceStart* */
  noShareWarning: string;
  policePrefix: string;
  policeSuffix: string;
  /** unitMinutes / unitPerson */
  unitMinutes: string;
  unitPerson: string;
  /** sectionTitleZone / sectionTitleSettings */
  sectionZone: string;
  sectionSettings: string;
  /** labelParticipantCount / fieldRoundTimeLimit / fieldLocationShareInterval / fieldPoliceDispatchTime */
  fieldParticipants: string;
  fieldRound: string;
  fieldShare: string;
  fieldPolice: string;
  /** gameSettingMaxPlayers / gameSettingRoundMinutes */
  maxPlayers: (n: number) => string;
  minutesValue: (n: number) => string;
  /** buttonStartGame */
  startGame: string;
  /** errorJailOutsidePlayground */
  jailOutside: string;
};

export type DemoCopy = {
  app: DemoAppStrings;
  stage: { h1: [string, string]; lead: string };
  scenes: Record<DemoSceneId, DemoScene>;
  courses: readonly DemoCourse[];
  /** 각본 채팅 - 팀원 첫 메시지와 답장 */
  chatScript: { opener: string; reply: string };
  /** 체포 연출 문구 (데모 전용) */
  caught: string;
  /** 커뮤니티·마이 탭 자리 문구 */
  nextUpdate: string;
};

export const DEMO_COPY: Record<Locale, DemoCopy> = {
  ko: {
    app: {
      logo: "/demo/app_logo_ko.svg",
      welcome: "누가 내 치즈\n훔쳐갔어!!!!🧀",
      createRoom: "방 만들기",
      joinRoom: "방 참여하기",
      joinTitle: "방 참여하기",
      joinHint: "참여코드를 입력하세요",
      close: "닫기",
      join: "참여하기",
      teamPolice: "경찰팀",
      teamRobber: "도둑팀",
      personCount: (n) => `${n}명`,
      ready: "준비",
      readyDone: "준비 완료",
      leaveRoomTitle: "방을 나갈까요?",
      leaveRoomMessage: "나가면 다시 초대코드를 입력해야 해요",
      leaveGameTitle: "게임에서 나갈까요?",
      leaveGameMessage: "진행 중인 게임에서 나가게 돼요",
      leave: "나가기",
      navHome: "홈",
      navCommunity: "커뮤니티",
      navMy: "마이페이지",
      revealCountdown: (t) => `다음 도둑 위치 공개까지 ${t}`,
      chatHint: "채팅을 입력하세요",
      pingFound: "발견",
      pingSuspect: "의심",
      qrScanTitle: "도둑의 수배 QR을 스캔하세요",
      overlayCurrent: "현재",
      overlayCount: (n) => `${n}명`,
      escaping: "도주 중!",
      win: "승리",
      playtime: "게임 진행 시간",
      arrestCount: "체포 횟수",
      remainingRobbers: "남은 도둑",
      goHome: "홈으로",
      playAgain: "한 번 더",
      zonePlayground: "플레이그라운드",
      zoneJail: "감옥",
      byDistance: "거리로 설정",
      byPin: "핀으로 설정",
      playgroundDesc: "게임이 진행될 전체 구역의 크기를 설정해요",
      playgroundPinDesc: "게임이 진행될 전체 구역을 선택해요",
      jailDesc: "도둑을 잡아둘 감옥의 위치와 크기를 설정해요",
      jailPinDesc: "도둑을 잡아둘 감옥 구역을 선택해요",
      radiusLabel: "반경",
      radiusValue: (v) => `반경 ${v}`,
      areaLabel: "면적",
      areaValue: (v) => `면적 ${v}`,
      clearAllPins: "전체 해제",
      done: "완료",
      next: "다음",
      completeSetup: "완료하기",
      confirm: "확인",
      basicTitle: "기본 정보를 설정해요",
      basicHint: "게임을 진행할 때, 꼭 필요한 정보들이에요",
      reviewTitle: "최종 설정을 확인해요",
      reviewHint: "방 생성 전 마지막으로 설정을 확인할까요?",
      participantsHint: "최소 2명부터 게임 진행이 가능해요",
      noShareWarning: "도둑의 위치가 공유되지 않아요!",
      policePrefix: "도둑 시작 후",
      policeSuffix: "뒤",
      unitMinutes: "분",
      unitPerson: "명",
      sectionZone: "구역",
      sectionSettings: "설정",
      fieldParticipants: "참여 인원",
      fieldRound: "게임 시간",
      fieldShare: "도둑 위치 공유 간격",
      fieldPolice: "경찰 시작 시간",
      maxPlayers: (n) => `${n}명`,
      minutesValue: (n) => `${n}분`,
      startGame: "게임 시작",
      jailOutside: "감옥이 플레이그라운드 범위를 벗어났어요",
    },
    stage: {
      h1: ["도둑이 지금", "달아나고 있어요"],
      lead: "설치 없이 여기서 바로 쫓아가 보세요. 말풍선이 알려주는 대로 누르다 보면 체포까지 한 판이 끝나요.",
    },
    scenes: {
      home: {
        id: "home",
        title: "홈",
        intro: "여기가 첫 화면이에요. 친구가 기다리고 있으니 방부터 들어가 볼까요?",
        tasks: [{ id: "home-join", label: "방 참여하기를 눌러 보세요" }],
      },
      join: {
        id: "join",
        title: "방 참여하기",
        intro: "친구가 보낸 코드가 미리 들어 있어요.",
        tasks: [{ id: "join-code", label: "참여하기를 눌러 보세요" }],
      },
      waiting: {
        id: "waiting",
        title: "대기실",
        intro: "시작 전에 모이는 방이에요. 팀은 언제든 바꿀 수 있어요.",
        tasks: [
          { id: "waiting-team", label: "경찰팀의 교체 버튼을 눌러 팀을 옮겨 보세요" },
          { id: "waiting-ready", label: "준비 버튼을 눌러 보세요" },
        ],
      },
      ingame: {
        id: "ingame",
        title: "추격전",
        intro: "도둑 위치가 주기마다 발자국으로 찍혀요. 이제 쫓으면 돼요.",
        tasks: [
          { id: "ingame-footprint", label: "발자국을 눌러 흔적을 확인해 보세요" },
          { id: "ingame-ping", label: "지도를 길게 눌러 핑을 남겨 보세요" },
          { id: "ingame-chat", label: "채팅으로 팀에게 작전을 알려 보세요" },
          { id: "ingame-arrest", label: "도둑이 보이면 눌러서 체포하세요" },
        ],
      },
      victory: {
        id: "victory",
        title: "체포 성공",
        intro: "실제 게임에서는 이 순간을 발로 뛰어서 만들어요.",
        tasks: [],
      },
      community: {
        id: "community",
        title: "커뮤니티",
        intro: "같이 뛸 사람을 모으는 곳이에요. 곧 여기서도 구경할 수 있어요.",
        tasks: [],
      },
      my: {
        id: "my",
        title: "마이페이지",
        intro: "내 전적과 기록이 쌓이는 곳이에요. 곧 열어 둘게요.",
        tasks: [],
      },
      homeCreate: {
        id: "homeCreate",
        title: "홈",
        intro: "이번엔 내가 방장이 되어 볼 차례예요.",
        tasks: [{ id: "create-start", label: "방 만들기를 눌러 보세요" }],
      },
      createZone: {
        id: "createZone",
        title: "플레이그라운드",
        intro: "게임이 벌어질 구역을 정해요. 핀으로 직접 그릴 수도 있어요.",
        tasks: [{ id: "create-zone", label: "반경을 조절하고 완료를 눌러 보세요" }],
      },
      createJail: {
        id: "createJail",
        title: "감옥",
        intro: "잡힌 도둑이 갇힐 자리예요. 플레이그라운드 안에 있어야 해요.",
        tasks: [{ id: "create-jail", label: "감옥을 정하고 완료를 눌러 보세요" }],
      },
      createBasic: {
        id: "createBasic",
        title: "기본 정보",
        intro: "키패드로 하나씩 정해요. 위의 칩으로 빠르게 더할 수도 있어요.",
        tasks: [{ id: "create-basic", label: "네 항목을 채우고 완료하기를 눌러 보세요" }],
      },
      createConfirm: {
        id: "createConfirm",
        title: "최종 확인",
        intro: "설정이 한눈에 보여요. 행을 누르면 고치러 갈 수 있어요.",
        tasks: [{ id: "create-confirm", label: "방 만들기를 눌러 보세요" }],
      },
      hostWaiting: {
        id: "hostWaiting",
        title: "방장 대기실",
        intro: "친구들이 들어오고 있어요. 모두 준비되면 시작할 수 있어요.",
        tasks: [{ id: "host-start", label: "모두 준비되면 게임 시작을 눌러 보세요" }],
      },
    },
    courses: [
      {
        id: "police",
        title: "경찰로 플레이",
        steps: [
          { label: "친구 방에 들어가요", short: "방 입장", scenes: ["home", "join"] },
          { label: "팀을 정하고 준비해요", short: "팀 준비", scenes: ["waiting"] },
          { label: "발자국을 따라 도둑을 쫓아요", short: "추격", scenes: ["ingame"] },
          { label: "체포하고 기록 카드를 받아요", short: "체포", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "create",
        title: "방장으로 플레이",
        steps: [
          { label: "방 만들기를 시작해요", short: "홈", scenes: ["homeCreate"] },
          { label: "구역과 감옥을 그려요", short: "구역", scenes: ["createZone", "createJail"] },
          { label: "게임 정보를 정해요", short: "설정", scenes: ["createBasic", "createConfirm"] },
          { label: "친구를 모아 게임을 시작해요", short: "시작", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
    ],
    chatScript: {
      opener: "북문 쪽에서 발자국 봤어요!",
      reply: "오케이, 저는 동쪽을 막을게요!",
    },
    caught: "체포 성공!",
    nextUpdate: "다음 업데이트에서 열려요",
  },
  en: {
    app: {
      logo: "/demo/app_logo_en.svg",
      welcome: "Who stole\nMy cheese!!!!🧀",
      createRoom: "Create room",
      joinRoom: "Join room",
      joinTitle: "Join waiting room",
      joinHint: "Enter invite code",
      close: "Close",
      join: "Join",
      teamPolice: "Cop team",
      teamRobber: "Robber team",
      personCount: (n) => `${n} people`,
      ready: "Ready",
      readyDone: "Ready",
      leaveRoomTitle: "Would you like to leave the room?",
      leaveRoomMessage: "You will need to enter the invite code again to rejoin",
      leaveGameTitle: "Leave the game?",
      leaveGameMessage: "You will leave the game in progress",
      leave: "Leave",
      navHome: "Home",
      navCommunity: "Community",
      navMy: "My Page",
      revealCountdown: (t) => `Until next Robber location reveal: ${t}`,
      chatHint: "Enter chat message",
      pingFound: "Found",
      pingSuspect: "Suspect",
      qrScanTitle: "Scan the Robber's wanted QR code",
      overlayCurrent: "Currently",
      overlayCount: (n) => `${n} people`,
      escaping: "running away!",
      win: "Win",
      playtime: "Game playtime",
      arrestCount: "Arrest count",
      remainingRobbers: "Remaining Robbers",
      goHome: "Go to home",
      playAgain: "One more time",
      zonePlayground: "Playground",
      zoneJail: "Jail",
      byDistance: "Set by distance",
      byPin: "Set by pins",
      playgroundDesc: "Set up the size of the total game area where the game will take place",
      playgroundPinDesc: "Select the whole area where the game will take place",
      jailDesc: "Set up the location and size of the jail to hold the Robbers",
      jailPinDesc: "Select the jail area to hold the thieves",
      radiusLabel: "Radius",
      radiusValue: (v) => `Radius ${v}`,
      areaLabel: "Area",
      areaValue: (v) => `Area ${v}`,
      clearAllPins: "Clear all",
      done: "Confirm",
      next: "Next",
      completeSetup: "Done",
      confirm: "Confirm",
      basicTitle: "Set up basic information",
      basicHint: "This information is essential for running the game",
      reviewTitle: "Verify final settings",
      reviewHint: "Shall we check the settings one last time before creating the room?",
      participantsHint: "A minimum of 2 players is required to play the game",
      noShareWarning: "The Robbers' locations will not be shared!",
      policePrefix: "After Robbers start,",
      policeSuffix: "later",
      unitMinutes: "min",
      unitPerson: "people",
      sectionZone: "Game area",
      sectionSettings: "Settings",
      fieldParticipants: "Player count",
      fieldRound: "Game time",
      fieldShare: "Robber location share interval",
      fieldPolice: "Cop start time",
      maxPlayers: (n) => `${n} players`,
      minutesValue: (n) => `${n} min`,
      startGame: "Game start",
      jailOutside: "The jail is out of the playground range",
    },
    stage: {
      h1: ["A robber is", "on the run"],
      lead: "Chase them down right here, no install needed. Follow the speech bubble and you'll make an arrest in one quick round.",
    },
    scenes: {
      home: {
        id: "home",
        title: "Home",
        intro: "This is the app's first screen. A friend is waiting - let's join their room.",
        tasks: [{ id: "home-join", label: "Tap Join room" }],
      },
      join: {
        id: "join",
        title: "Join a room",
        intro: "The code from your friend is already filled in.",
        tasks: [{ id: "join-code", label: "Tap Join" }],
      },
      waiting: {
        id: "waiting",
        title: "Waiting room",
        intro: "This is where everyone gathers. You can switch teams any time.",
        tasks: [
          { id: "waiting-team", label: "Tap the swap slot on the cop team" },
          { id: "waiting-ready", label: "Tap Ready" },
        ],
      },
      ingame: {
        id: "ingame",
        title: "The chase",
        intro: "The robber's location drops as footprints. Time to hunt.",
        tasks: [
          { id: "ingame-footprint", label: "Tap a footprint to check the trail" },
          { id: "ingame-ping", label: "Long-press the map to drop a ping" },
          { id: "ingame-chat", label: "Share your plan in team chat" },
          { id: "ingame-arrest", label: "Tap the robber to make the arrest" },
        ],
      },
      victory: {
        id: "victory",
        title: "Arrested",
        intro: "In the real game, you earn this moment on foot.",
        tasks: [],
      },
      community: {
        id: "community",
        title: "Community",
        intro: "Find people to play with here. Coming to the demo soon.",
        tasks: [],
      },
      my: {
        id: "my",
        title: "My Page",
        intro: "Your stats and records live here. Opening soon.",
        tasks: [],
      },
      homeCreate: {
        id: "homeCreate",
        title: "Home",
        intro: "This time, you're the host.",
        tasks: [{ id: "create-start", label: "Tap Create room" }],
      },
      createZone: {
        id: "createZone",
        title: "Playground",
        intro: "Pick where the game happens. You can also draw it with pins.",
        tasks: [{ id: "create-zone", label: "Adjust the radius, then tap Confirm" }],
      },
      createJail: {
        id: "createJail",
        title: "Jail",
        intro: "Where caught robbers go. It has to fit inside the playground.",
        tasks: [{ id: "create-jail", label: "Place the jail, then tap Confirm" }],
      },
      createBasic: {
        id: "createBasic",
        title: "Basic info",
        intro: "Set each value on the keypad. The chips above add fast.",
        tasks: [{ id: "create-basic", label: "Fill all four, then tap Done" }],
      },
      createConfirm: {
        id: "createConfirm",
        title: "Final check",
        intro: "Everything at a glance. Tap a row to go fix it.",
        tasks: [{ id: "create-confirm", label: "Tap Create room" }],
      },
      hostWaiting: {
        id: "hostWaiting",
        title: "Host's room",
        intro: "Friends are joining. Once everyone's ready, you can start.",
        tasks: [{ id: "host-start", label: "When all are ready, tap Game start" }],
      },
    },
    courses: [
      {
        id: "police",
        title: "Play as Cop",
        steps: [
          { label: "Join a friend's room", short: "Join", scenes: ["home", "join"] },
          { label: "Pick a team and ready up", short: "Team", scenes: ["waiting"] },
          { label: "Follow footprints, chase the robber", short: "Chase", scenes: ["ingame"] },
          { label: "Make the arrest, get your record", short: "Arrest", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "create",
        title: "Play as Host",
        steps: [
          { label: "Start creating a room", short: "Home", scenes: ["homeCreate"] },
          { label: "Draw the playground and jail", short: "Zone", scenes: ["createZone", "createJail"] },
          { label: "Set the game rules", short: "Rules", scenes: ["createBasic", "createConfirm"] },
          { label: "Gather friends and start", short: "Start", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
    ],
    chatScript: {
      opener: "Saw footprints near the north gate!",
      reply: "Copy that, I'll cover the east side!",
    },
    caught: "Arrested!",
    nextUpdate: "Coming in the next update",
  },
  ja: {
    app: {
      logo: "/demo/app_logo_ja.svg",
      welcome: "誰がぼくのチーズを\n盗んだの!!!!🧀",
      createRoom: "待機室を作る",
      joinRoom: "待機室に参加する",
      joinTitle: "待機室に参加する",
      joinHint: "招待コードを入力してください",
      close: "閉じる",
      join: "参加する",
      teamPolice: "警察チーム",
      teamRobber: "泥棒チーム",
      personCount: (n) => `${n}人`,
      ready: "準備完了",
      readyDone: "準備完了",
      leaveRoomTitle: "待機室から退室しますか",
      leaveRoomMessage: "退室すると、再度招待コードを入力する必要があります",
      leaveGameTitle: "ゲームから退場しますか",
      leaveGameMessage: "進行中のゲームから退場します",
      leave: "退室",
      navHome: "ホーム",
      navCommunity: "コミュニティ",
      navMy: "マイページ",
      revealCountdown: (t) => `次の泥棒の位置公開まで ${t}`,
      chatHint: "チャットを入力してください",
      pingFound: "発見",
      pingSuspect: "疑い",
      qrScanTitle: "泥棒の指名手配QRをスキャンしてください",
      overlayCurrent: "現在",
      overlayCount: (n) => `${n}人`,
      escaping: "逃走中！",
      win: "勝利",
      playtime: "ゲーム進行時間",
      arrestCount: "逮捕回数",
      remainingRobbers: "残りの泥棒",
      goHome: "ホームへ",
      playAgain: "もう一度",
      zonePlayground: "プレイグラウンド",
      zoneJail: "牢屋",
      byDistance: "距離で設定",
      byPin: "ピンで設定",
      playgroundDesc: "ゲームを行うエリア全体の大きさを設定します",
      playgroundPinDesc: "ゲームを行うエリア全体を選択します",
      jailDesc: "泥棒を拘束しておく牢屋の位置と大きさを設定します",
      jailPinDesc: "泥棒を拘束しておく牢屋エリアを選択します",
      radiusLabel: "半径",
      radiusValue: (v) => `半径 ${v}`,
      areaLabel: "面積",
      areaValue: (v) => `面積 ${v}`,
      clearAllPins: "すべて解除",
      done: "完了",
      next: "次へ",
      completeSetup: "完了する",
      confirm: "確認",
      basicTitle: "基本情報を設定します",
      basicHint: "ゲームを進行する際、必ず必要な情報です",
      reviewTitle: "最終設定を確認します",
      reviewHint: "待機室を作る前に最後に設定を確認しましょうか",
      participantsHint: "最低2人からゲームの進行が可能です",
      noShareWarning: "泥棒の位置が公開されません！",
      policePrefix: "泥棒スタートから",
      policeSuffix: "後",
      unitMinutes: "分",
      unitPerson: "人",
      sectionZone: "エリア",
      sectionSettings: "設定",
      fieldParticipants: "参加人数",
      fieldRound: "ゲーム時間",
      fieldShare: "泥棒の位置公開間隔",
      fieldPolice: "警察スタート時間",
      maxPlayers: (n) => `${n}人`,
      minutesValue: (n) => `${n}分`,
      startGame: "ゲーム開始",
      jailOutside: "牢屋がプレイグラウンドの範囲を超えています",
    },
    stage: {
      h1: ["泥棒が今", "逃げています"],
      lead: "インストール不要で、ここでそのまま追いかけられます。吹き出しの案内どおりにタップすれば、逮捕まで1プレイ遊べます。",
    },
    scenes: {
      home: {
        id: "home",
        title: "ホーム",
        intro: "アプリの最初の画面です。友だちが待っているので、まず部屋に入りましょう。",
        tasks: [{ id: "home-join", label: "「待機室に参加する」をタップ" }],
      },
      join: {
        id: "join",
        title: "部屋に参加",
        intro: "友だちから届いたコードが入力済みです。",
        tasks: [{ id: "join-code", label: "「参加する」をタップ" }],
      },
      waiting: {
        id: "waiting",
        title: "待機室",
        intro: "スタート前に集まる部屋です。チームはいつでも変えられます。",
        tasks: [
          { id: "waiting-team", label: "警察チームの交代スロットをタップ" },
          { id: "waiting-ready", label: "「準備完了」をタップ" },
        ],
      },
      ingame: {
        id: "ingame",
        title: "追跡戦",
        intro: "泥棒の位置が定期的に足あとで公開されます。さあ、追いかけましょう。",
        tasks: [
          { id: "ingame-footprint", label: "足あとをタップして確認" },
          { id: "ingame-ping", label: "地図を長押ししてピンを残す" },
          { id: "ingame-chat", label: "チャットで作戦を共有" },
          { id: "ingame-arrest", label: "泥棒が見えたらタップして逮捕" },
        ],
      },
      victory: {
        id: "victory",
        title: "逮捕成功",
        intro: "実際のゲームでは、この瞬間を自分の足で作ります。",
        tasks: [],
      },
      community: {
        id: "community",
        title: "コミュニティ",
        intro: "一緒に遊ぶ仲間を集める場所です。デモにも近日追加予定。",
        tasks: [],
      },
      my: {
        id: "my",
        title: "マイページ",
        intro: "自分の戦績と記録が集まる場所です。近日公開。",
        tasks: [],
      },
      homeCreate: {
        id: "homeCreate",
        title: "ホーム",
        intro: "今度は自分がホストになる番です。",
        tasks: [{ id: "create-start", label: "「待機室を作る」をタップ" }],
      },
      createZone: {
        id: "createZone",
        title: "プレイグラウンド",
        intro: "ゲームの舞台を決めます。ピンで自由に描くこともできます。",
        tasks: [{ id: "create-zone", label: "半径を調整して「完了」をタップ" }],
      },
      createJail: {
        id: "createJail",
        title: "牢屋",
        intro: "捕まった泥棒が入る場所です。プレイグラウンドの中に置きます。",
        tasks: [{ id: "create-jail", label: "牢屋を決めて「完了」をタップ" }],
      },
      createBasic: {
        id: "createBasic",
        title: "基本情報",
        intro: "キーパッドで1つずつ決めます。上のチップで素早く足せます。",
        tasks: [{ id: "create-basic", label: "4項目を埋めて「完了する」をタップ" }],
      },
      createConfirm: {
        id: "createConfirm",
        title: "最終確認",
        intro: "設定がひと目で見えます。行をタップすると直しに行けます。",
        tasks: [{ id: "create-confirm", label: "「待機室を作る」をタップ" }],
      },
      hostWaiting: {
        id: "hostWaiting",
        title: "ホストの待機室",
        intro: "友だちが入ってきています。全員準備できたら始められます。",
        tasks: [{ id: "host-start", label: "全員準備できたら「ゲーム開始」をタップ" }],
      },
    },
    courses: [
      {
        id: "police",
        title: "警察でプレイ",
        steps: [
          { label: "友だちの部屋に入る", short: "入室", scenes: ["home", "join"] },
          { label: "チームを決めて準備", short: "準備", scenes: ["waiting"] },
          { label: "足あとを追って泥棒を追跡", short: "追跡", scenes: ["ingame"] },
          { label: "逮捕して記録カードをもらう", short: "逮捕", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "create",
        title: "ホストでプレイ",
        steps: [
          { label: "部屋づくりを始める", short: "ホーム", scenes: ["homeCreate"] },
          { label: "エリアと牢屋を描く", short: "エリア", scenes: ["createZone", "createJail"] },
          { label: "ゲームのルールを決める", short: "設定", scenes: ["createBasic", "createConfirm"] },
          { label: "友だちを集めてスタート", short: "開始", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
    ],
    chatScript: {
      opener: "北門のあたりで足あとを見ました！",
      reply: "了解、東側は任せてください！",
    },
    caught: "逮捕成功！",
    nextUpdate: "次のアップデートで開放",
  },
};
