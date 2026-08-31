import type { Locale } from "@/lib/i18n/config";
import type { DemoSceneId, DemoScene, DemoCourseStep } from "@/lib/demo/scenes";

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
};

export type DemoCopy = {
  app: DemoAppStrings;
  stage: { h1: [string, string]; lead: string };
  scenes: Record<DemoSceneId, DemoScene>;
  courseSteps: readonly DemoCourseStep[];
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
    },
    courseSteps: [
      { label: "친구 방에 들어가요", short: "방 입장", scenes: ["home", "join"] },
      { label: "팀을 정하고 준비해요", short: "팀 준비", scenes: ["waiting"] },
      { label: "발자국을 따라 도둑을 쫓아요", short: "추격", scenes: ["ingame"] },
      { label: "체포하고 기록 카드를 받아요", short: "체포", scenes: ["victory"] },
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
    },
    courseSteps: [
      { label: "Join a friend's room", short: "Join", scenes: ["home", "join"] },
      { label: "Pick a team and ready up", short: "Team", scenes: ["waiting"] },
      { label: "Follow footprints, chase the robber", short: "Chase", scenes: ["ingame"] },
      { label: "Make the arrest, get your record", short: "Arrest", scenes: ["victory"] },
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
    },
    courseSteps: [
      { label: "友だちの部屋に入る", short: "入室", scenes: ["home", "join"] },
      { label: "チームを決めて準備", short: "準備", scenes: ["waiting"] },
      { label: "足あとを追って泥棒を追跡", short: "追跡", scenes: ["ingame"] },
      { label: "逮捕して記録カードをもらう", short: "逮捕", scenes: ["victory"] },
    ],
    chatScript: {
      opener: "北門のあたりで足あとを見ました！",
      reply: "了解、東側は任せてください！",
    },
    caught: "逮捕成功！",
    nextUpdate: "次のアップデートで開放",
  },
};
