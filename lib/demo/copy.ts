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
  /** pageCommunityTitle / communityScope* / communitySortLatest */
  communityTitle: string;
  scopeAll: string;
  scopeNearby: string;
  scopeMine: string;
  sortLatest: string;
  /** communityCreatePost / comingSoonMessage */
  createPost: string;
  comingSoon: string;
  /** communityStatusRecruiting / communityStatusCompleted / communityHeadcount */
  statusRecruiting: string;
  statusCompleted: string;
  headcount: (current: number, max: number) => string;
  /** pageCommunityDetailTitle / communityDetailJoinChat / communityDetailShare */
  detailTitle: string;
  joinChat: string;
  share: string;
  /** communityDetailCommentCount / communityCommentHint */
  commentCount: (n: number) => string;
  commentHint: string;
  /** communityChatInputHint / communityChatSystemJoined */
  communityChatHint: string;
  systemJoined: (nickname: string) => string;
  /** communityChatViewLocation / communityChatMeetingMembers */
  viewLocation: string;
  meetingMembers: (current: number, max: number) => string;
  /** communityChatInvite* (카드) */
  inviteOpened: string;
  inviteTitle: (nickname: string, roomTitle: string) => string;
  inviteCodeLine: (code: string) => string;
  inviteJoin: string;
  /** communityChatInviteDialog* (초대장 다이얼로그) */
  inviteDialogTitle: string;
  inviteDialogBody: (nickname: string) => string;
  inviteDialogCodeLabel: string;
  inviteDialogDecline: string;
  inviteDialogEnter: string;
  /** gameQrDisplayTitle / gameQrDisplayMessage - 도둑의 수배 QR 다이얼로그 */
  qrDisplayTitle: string;
  qrDisplayMessage: string;
  /** gamePoliceStartCountdown */
  policeStartCountdown: (formatted: string) => string;
  /** gameEventArrestNotice - @icon_police·@icon_robber 자리에 진영 아이콘이 들어간다 */
  arrestNotice: (policeNickname: string, robberNickname: string) => string;
  /** pageSettingsTitle / mypageProfileIconLabel */
  settingsTitle: string;
  profileIconLabel: string;
  /** settingsSection* */
  sectionAccount: string;
  sectionApp: string;
  sectionGuide: string;
  sectionEtc: string;
  /** settingsAccountChangeNickname / settingsAccountMyScraps */
  changeNickname: string;
  myScraps: string;
  /** settingsApp*Notification* */
  gameNotification: string;
  gameNotificationDesc: string;
  communityNotification: string;
  communityNotificationDesc: string;
  generalNotification: string;
  generalNotificationHighlight: string;
  generalNotificationDetail: string;
  /** settingsLanguageLabel / settingsLanguageOptionSystem */
  languageLabel: string;
  languageSystem: string;
  /** settingsAppLocationPermission* */
  locationPermission: string;
  locationPermissionDesc: string;
  /** settingsAppVersionLabel / settingsGuide* */
  appVersionLabel: string;
  tutorialRewatch: string;
  tutorialReset: string;
  bugReport: string;
  openSourceLicenses: string;
  agreements: string;
  /** buttonLogout / settingsEtcDeleteAccount */
  logout: string;
  deleteAccount: string;
  /** settingsSnsPrompt - 공식 SNS 채널 안내 */
  snsPrompt: string;
};

// 커뮤니티 코스의 목데이터 (#86). 폰 안에 보이는 내용이라 로케일마다 배경
// 도시를 옮긴다 (#67 목업과 같은 관례 - en 뉴욕, ja 도쿄).
export type DemoCommunityPost = {
  /** 모집중 첫 글만 눌린다. 마감 글은 앱처럼 흐려진다 */
  status: "recruiting" | "completed";
  title: string;
  location: string;
  /** 모임 일시 - 앱의 communityMeetingAt 형식으로 미리 조립해 둔다 */
  meetingAt: string;
  headcount: readonly [number, number];
  likes: number;
  scraps: number;
};

export type DemoCommunityData = {
  posts: readonly DemoCommunityPost[];
  /** 첫 모집글의 상세 - 본문과 댓글 */
  detail: {
    content: string;
    comments: readonly {
      name: string;
      text: string;
      time: string;
      profile: 1 | 2;
    }[];
  };
  /** 채팅 각본 - 방장 인사, 미리 든 내 인사, 방장 답장 순서다 */
  chat: {
    /** 모집글 작성자 = 채팅 방장 */
    host: string;
    opener: string;
    /** 입력창에 미리 들어 있는 내 인사 */
    draft: string;
    reply: string;
  };
};

export type DemoCopy = {
  app: DemoAppStrings;
  /** 진영 칩 옆 안내 - 테마가 곧 진영이라는 힌트 (#88) */
  themeHint: string;
  scenes: Record<DemoSceneId, DemoScene>;
  courses: readonly DemoCourse[];
  /** 각본 채팅 - 팀원 첫 메시지와 답장 (경찰 시점) */
  chatScript: { opener: string; reply: string };
  /** 각본 채팅 - 도둑 시점. 경찰이 안 보이는 도둑에게는 팀 채팅이 눈이다 (#88) */
  robberChatScript: { opener: string; reply: string };
  /** 체포 연출 문구 (데모 전용) */
  caught: string;
  /** 커뮤니티 코스 목데이터 (#86) */
  community: DemoCommunityData;
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
      communityTitle: "커뮤니티",
      scopeAll: "전체",
      scopeNearby: "우리 동네",
      scopeMine: "내 모임",
      sortLatest: "최신순",
      createPost: "모집글 작성",
      comingSoon: "준비 중이에요",
      statusRecruiting: "모집중",
      statusCompleted: "마감",
      headcount: (c, m) => `${c}/${m}명`,
      detailTitle: "모집글",
      joinChat: "채팅 참여하기",
      share: "공유",
      commentCount: (n) => `댓글 ${n}`,
      commentHint: "댓글을 남겨보세요",
      communityChatHint: "메시지 보내기",
      systemJoined: (n) => `${n}님이 참여했어요`,
      viewLocation: "장소 보기",
      meetingMembers: (c, m) => `현재 인원 ${c}/${m}명`,
      inviteOpened: "게임이 열렸어요!",
      inviteTitle: (n, r) => `${n}님이 [${r}] 방에 초대했어요`,
      inviteCodeLine: (c) => `초대코드 ${c}`,
      inviteJoin: "게임 참여",
      inviteDialogTitle: "게임 초대장",
      inviteDialogBody: (n) => `${n}님이\n게임에 초대했어요`,
      inviteDialogCodeLabel: "방 코드",
      inviteDialogDecline: "거절",
      inviteDialogEnter: "입장",
      qrDisplayTitle: "수배 QR",
      qrDisplayMessage: "경찰에게 QR을 보여주세요",
      policeStartCountdown: (t) => `경찰 시작까지 ${t}`,
      arrestNotice: (p, r) => `@icon_police [${p}]님이 @icon_robber [${r}]님을 체포했어요!`,
      settingsTitle: "설정",
      profileIconLabel: "프로필 아이콘",
      sectionAccount: "계정",
      sectionApp: "앱 설정",
      sectionGuide: "이용 안내",
      sectionEtc: "기타",
      changeNickname: "닉네임 변경",
      myScraps: "내 스크랩",
      gameNotification: "게임 알림",
      gameNotificationDesc: "게임 진행 중 발생하는 이벤트 알림을 설정해요",
      communityNotification: "커뮤니티 알림",
      communityNotificationDesc: "댓글·대댓글·채팅 푸시를 받아요. 꺼도 알림함에는 쌓여요",
      generalNotification: "알림",
      generalNotificationHighlight: "게임 중 알림",
      generalNotificationDetail: "을 포함한 앱에서 보내는 모든 알림을 설정해요",
      languageLabel: "언어",
      languageSystem: "시스템",
      locationPermission: "위치 권한 관리",
      locationPermissionDesc: "기기 설정에서 위치 권한을 변경할 수 있어요",
      appVersionLabel: "앱 버전",
      tutorialRewatch: "튜토리얼 다시 보기",
      tutorialReset: "튜토리얼 초기화",
      bugReport: "버그 제보",
      openSourceLicenses: "오픈소스 라이선스",
      agreements: "이용약관 및 정책",
      logout: "로그아웃",
      deleteAccount: "회원 탈퇴",
      snsPrompt: "더 많은 소식이 궁금하다면 👀",
    },
    themeHint: "테마를 바꾸면 반대 진영으로 뛰어요",
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
        intro: "동네 모임이 모이는 곳이에요. 마음에 드는 글을 골라 보세요.",
        tasks: [{ id: "community-open", label: "맨 위 모집글을 눌러 보세요" }],
      },
      my: {
        id: "my",
        title: "마이페이지",
        intro: "프로필과 설정이 모여 있어요. 구석에 숨은 것도 있어요.",
        tasks: [
          { id: "my-icon", label: "프로필 아이콘을 바꿔 보세요" },
          { id: "my-version", label: "앱 버전을 다섯 번 눌러 보세요" },
        ],
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
      homeCommunity: {
        id: "homeCommunity",
        title: "홈",
        intro: "이번엔 같이 뛸 사람부터 찾아볼까요?",
        tasks: [{ id: "community-tab", label: "아래 커뮤니티 탭을 눌러 보세요" }],
      },
      communityDetail: {
        id: "communityDetail",
        title: "모집글",
        intro: "모임 정보가 한눈에 보여요.",
        tasks: [
          { id: "detail-like", label: "좋아요로 마음을 표현해 보세요" },
          { id: "detail-join", label: "채팅 참여하기를 눌러 보세요" },
        ],
      },
      communityChat: {
        id: "communityChat",
        title: "모임 채팅",
        intro: "방장이 기다리고 있어요.",
        tasks: [
          { id: "chat-send", label: "전송 버튼으로 인사를 보내 보세요" },
          { id: "chat-invite", label: "초대 카드의 게임 참여를 눌러 보세요" },
        ],
      },
      waitingRobber: {
        id: "waitingRobber",
        title: "대기실",
        intro: "이번 판, 나는 도둑이에요. 이대로 준비하면 돼요.",
        tasks: [{ id: "waiting-robber-ready", label: "준비 버튼을 눌러 보세요" }],
      },
      ingameRobber: {
        id: "ingameRobber",
        title: "도주전",
        intro: "곧 경찰이 출발해요. 내 위치는 주기마다 발자국으로 공개돼요.",
        tasks: [
          { id: "robber-qr", label: "수배 QR을 열어 확인해 보세요" },
          { id: "robber-ping", label: "지도를 길게 눌러 경찰 위치에 핑을 남겨 보세요" },
          { id: "robber-chat", label: "채팅으로 팀에게 상황을 알려 보세요" },
        ],
      },
      victoryRobber: {
        id: "victoryRobber",
        title: "생존 승리",
        intro: "실제 게임에서는 이 순간을 발로 뛰어서 지켜내요.",
        tasks: [],
      },
    },
    courses: [
      {
        id: "police",
        title: "경찰로 플레이",
        stage: {
          h1: ["도둑이 지금", "달아나고 있어요"],
          lead: "설치 없이 지금 바로 쫓아가 보세요. 말풍선만 따라가면 체포까지 금방이에요.",
        },
        steps: [
          { label: "친구 방에 들어가요", short: "방 입장", scenes: ["home", "join"] },
          { label: "팀을 정하고 준비해요", short: "팀 준비", scenes: ["waiting"] },
          { label: "발자국을 따라 도둑을 쫓아요", short: "추격", scenes: ["ingame"] },
          { label: "체포하고 기록 카드를 받아요", short: "체포", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "robber",
        title: "도둑으로 플레이",
        stage: {
          h1: ["경찰이 바짝", "쫓아오고 있어요"],
          lead: "설치 없이 지금 바로 달아나 보세요. 끝까지 안 잡히면 그게 승리예요.",
        },
        steps: [
          { label: "친구 방에 들어가요", short: "방 입장", scenes: ["home", "join"] },
          { label: "도둑팀으로 준비해요", short: "팀 준비", scenes: ["waitingRobber"] },
          { label: "발자국을 숨기며 달아나요", short: "도주", scenes: ["ingameRobber"] },
          { label: "끝까지 살아남아 승리해요", short: "생존", scenes: ["victoryRobber"] },
        ],
        finish: "victoryRobber",
      },
      {
        id: "create",
        title: "방장으로 플레이",
        stage: {
          h1: ["오늘 판은", "내가 깔아요"],
          lead: "구역도 규칙도 내 마음대로예요. 방을 열면 친구들이 모여요.",
        },
        steps: [
          { label: "방 만들기를 시작해요", short: "홈", scenes: ["homeCreate"] },
          { label: "구역과 감옥을 그려요", short: "구역", scenes: ["createZone", "createJail"] },
          { label: "게임 정보를 정해요", short: "설정", scenes: ["createBasic", "createConfirm"] },
          { label: "친구를 모아 게임을 시작해요", short: "시작", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
      {
        id: "community",
        title: "모임 찾아 플레이",
        stage: {
          h1: ["같이 뛸 사람,", "여기 다 있어요"],
          lead: "마음에 드는 모집글에 인사만 남겨 보세요. 초대장이 오면 바로 게임이에요.",
        },
        steps: [
          {
            label: "커뮤니티에서 모집글을 골라요",
            short: "커뮤니티",
            scenes: ["homeCommunity", "community"],
          },
          { label: "모집글을 읽고 채팅에 들어가요", short: "모집글", scenes: ["communityDetail"] },
          { label: "인사하면 게임 초대가 와요", short: "채팅", scenes: ["communityChat"] },
          { label: "초대 코드로 대기실에 합류해요", short: "합류", scenes: ["waiting"] },
        ],
        finish: "waiting",
      },
    ],
    chatScript: {
      opener: "북문 쪽에서 발자국 봤어요!",
      reply: "오케이, 저는 동쪽을 막을게요!",
    },
    robberChatScript: {
      opener: "경찰 두 명이 북문 쪽으로 올라갔어요!",
      reply: "좋아요, 저는 공원 쪽으로 돌게요!",
    },
    caught: "체포 성공!",
    community: {
      posts: [
        {
          status: "recruiting",
          title: "어린이대공원에서 4시에 뛰실 분",
          location: "광진구 능동",
          meetingAt: "9/5 (토) 16:00",
          headcount: [3, 8],
          likes: 12,
          scraps: 4,
        },
        {
          status: "recruiting",
          title: "한강공원 야간 술래잡기",
          location: "영등포구 여의도동",
          meetingAt: "9/6 (일) 19:30",
          headcount: [5, 10],
          likes: 8,
          scraps: 2,
        },
        {
          status: "completed",
          title: "퇴근 후 한 판, 초보 환영",
          location: "서초구 반포동",
          meetingAt: "9/3 (목) 19:00",
          headcount: [10, 10],
          likes: 21,
          scraps: 7,
        },
      ],
      detail: {
        content:
          "토요일 오후에 어린이대공원에서 경찰과 도둑 한 판 해요. 정문 분수대 앞에서 모여서 구역 정하고 바로 시작할 거예요. 앱만 설치하고 오시면 나머지는 다 알려드려요. 처음이어도 괜찮아요!",
        comments: [
          {
            name: "달리는치타22",
            text: "처음 해보는데 껴도 되나요?",
            time: "09/02 14:10",
            profile: 1,
          },
          {
            name: "동네보안관",
            text: "그럼요! 규칙은 만나서 알려드려요",
            time: "09/02 14:32",
            profile: 2,
          },
        ],
      },
      chat: {
        host: "동네보안관",
        opener: "어서 오세요! 토요일 4시, 정문 분수대 앞에서 만나요",
        draft: "안녕하세요! 저도 토요일에 갈게요",
        reply: "좋아요! 연습 삼아 미리 한 판 열게요",
      },
    },
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
      communityTitle: "Community",
      scopeAll: "All",
      scopeNearby: "Nearby",
      scopeMine: "My meetups",
      sortLatest: "Latest",
      createPost: "New post",
      comingSoon: "Coming soon",
      statusRecruiting: "Open",
      statusCompleted: "Closed",
      headcount: (c, m) => `${c}/${m}`,
      detailTitle: "Post",
      joinChat: "Join the chat",
      share: "Share",
      commentCount: (n) => `Comments ${n}`,
      commentHint: "Leave a comment",
      communityChatHint: "Send a message",
      systemJoined: (n) => `${n} joined`,
      viewLocation: "View location",
      meetingMembers: (c, m) => `${c}/${m} members`,
      inviteOpened: "The game has started!",
      inviteTitle: (n, r) => `${n} invited you to [${r}]`,
      inviteCodeLine: (c) => `Invite code ${c}`,
      inviteJoin: "Join game",
      inviteDialogTitle: "Game invitation",
      inviteDialogBody: (n) => `${n} invited you\nto a game`,
      inviteDialogCodeLabel: "Room code",
      inviteDialogDecline: "Decline",
      inviteDialogEnter: "Enter",
      qrDisplayTitle: "Wanted QR code",
      qrDisplayMessage: "Please show the QR code to the Cops",
      policeStartCountdown: (t) => `Until Cops start: ${t}`,
      arrestNotice: (p, r) => `@icon_police [${p}] arrested @icon_robber [${r}]!`,
      settingsTitle: "Settings",
      profileIconLabel: "Profile icon",
      sectionAccount: "Account",
      sectionApp: "App settings",
      sectionGuide: "Guide",
      sectionEtc: "Others",
      changeNickname: "Change nickname",
      myScraps: "My scraps",
      gameNotification: "Game notifications",
      gameNotificationDesc: "Configure notifications for events occurring during the game",
      communityNotification: "Community notifications",
      communityNotificationDesc:
        "Get push alerts for comments, replies, and chats. Your inbox keeps them even when this is off",
      generalNotification: "Notification",
      generalNotificationHighlight: "In-game notifications",
      generalNotificationDetail: "Configure all notifications sent by the app including",
      languageLabel: "Language",
      languageSystem: "System",
      locationPermission: "Manage location permissions",
      locationPermissionDesc: "You can change location permissions in device settings",
      appVersionLabel: "App version",
      tutorialRewatch: "Replay tutorial",
      tutorialReset: "Reset tutorial",
      bugReport: "Bug report",
      openSourceLicenses: "Open source licenses",
      agreements: "Terms and policies",
      logout: "Sign out",
      deleteAccount: "Delete account",
      snsPrompt: "Curious about more updates? 👀",
    },
    themeHint: "Switch the theme to play the other side",
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
        intro: "Where neighborhood meetups gather. Pick a post you like.",
        tasks: [{ id: "community-open", label: "Tap the first post" }],
      },
      my: {
        id: "my",
        title: "My Page",
        intro: "Your profile and settings live here. Something is hidden, too.",
        tasks: [
          { id: "my-icon", label: "Change your profile icon" },
          { id: "my-version", label: "Tap the app version five times" },
        ],
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
      homeCommunity: {
        id: "homeCommunity",
        title: "Home",
        intro: "This time, let's find people to run with.",
        tasks: [{ id: "community-tab", label: "Tap the Community tab below" }],
      },
      communityDetail: {
        id: "communityDetail",
        title: "Post",
        intro: "Everything about the meetup at a glance.",
        tasks: [
          { id: "detail-like", label: "Tap the like button" },
          { id: "detail-join", label: "Tap Join the chat" },
        ],
      },
      communityChat: {
        id: "communityChat",
        title: "Meetup chat",
        intro: "The host is waiting for you.",
        tasks: [
          { id: "chat-send", label: "Send your hello with the send button" },
          { id: "chat-invite", label: "Tap Join game on the invite card" },
        ],
      },
      waitingRobber: {
        id: "waitingRobber",
        title: "Waiting room",
        intro: "This round, you're a robber. Just ready up as you are.",
        tasks: [{ id: "waiting-robber-ready", label: "Tap Ready" }],
      },
      ingameRobber: {
        id: "ingameRobber",
        title: "The getaway",
        intro: "The cops start soon. Your location drops as footprints at intervals.",
        tasks: [
          { id: "robber-qr", label: "Open your wanted QR code" },
          { id: "robber-ping", label: "Long-press the map to ping the cops" },
          { id: "robber-chat", label: "Tell your team what's happening in chat" },
        ],
      },
      victoryRobber: {
        id: "victoryRobber",
        title: "Survived",
        intro: "In the real game, you defend this moment on foot.",
        tasks: [],
      },
    },
    courses: [
      {
        id: "police",
        title: "Play as Cop",
        stage: {
          h1: ["A robber is", "on the run"],
          lead: "Chase them down right here - no install needed. Follow the speech bubble and the arrest is minutes away.",
        },
        steps: [
          { label: "Join a friend's room", short: "Join", scenes: ["home", "join"] },
          { label: "Pick a team and ready up", short: "Team", scenes: ["waiting"] },
          { label: "Follow footprints, chase the robber", short: "Chase", scenes: ["ingame"] },
          { label: "Make the arrest, get your record", short: "Arrest", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "robber",
        title: "Play as Robber",
        stage: {
          h1: ["The cops are", "closing in"],
          lead: "Make your getaway right here - no install needed. Stay uncaught to the end and the win is yours.",
        },
        steps: [
          { label: "Join a friend's room", short: "Join", scenes: ["home", "join"] },
          { label: "Ready up on the robber team", short: "Team", scenes: ["waitingRobber"] },
          { label: "Run while hiding your footprints", short: "Run", scenes: ["ingameRobber"] },
          { label: "Survive to the end and win", short: "Survive", scenes: ["victoryRobber"] },
        ],
        finish: "victoryRobber",
      },
      {
        id: "create",
        title: "Play as Host",
        stage: {
          h1: ["Tonight's game", "starts with you"],
          lead: "The zone, the rules - all yours to set. Open a room and friends will come.",
        },
        steps: [
          { label: "Start creating a room", short: "Home", scenes: ["homeCreate"] },
          { label: "Draw the playground and jail", short: "Zone", scenes: ["createZone", "createJail"] },
          { label: "Set the game rules", short: "Rules", scenes: ["createBasic", "createConfirm"] },
          { label: "Gather friends and start", short: "Start", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
      {
        id: "community",
        title: "Join a meetup",
        stage: {
          h1: ["Your next crew", "is right here"],
          lead: "Pick a post you like and just say hi. When the invite arrives, you're in.",
        },
        steps: [
          {
            label: "Pick a post in Community",
            short: "Browse",
            scenes: ["homeCommunity", "community"],
          },
          { label: "Read the post, join the chat", short: "Post", scenes: ["communityDetail"] },
          { label: "Say hi and get invited", short: "Chat", scenes: ["communityChat"] },
          { label: "Enter the room with the code", short: "Join", scenes: ["waiting"] },
        ],
        finish: "waiting",
      },
    ],
    chatScript: {
      opener: "Saw footprints near the north gate!",
      reply: "Copy that, I'll cover the east side!",
    },
    robberChatScript: {
      opener: "Two cops just headed for the north gate!",
      reply: "Got it, I'll loop around the park!",
    },
    caught: "Arrested!",
    community: {
      posts: [
        {
          status: "recruiting",
          title: "Tag at Central Park, 4 PM",
          location: "Upper West Side",
          meetingAt: "9/5 (Sat) 16:00",
          headcount: [3, 8],
          likes: 12,
          scraps: 4,
        },
        {
          status: "recruiting",
          title: "Night tag at Brooklyn Bridge Park",
          location: "DUMBO, Brooklyn",
          meetingAt: "9/6 (Sun) 19:30",
          headcount: [5, 10],
          likes: 8,
          scraps: 2,
        },
        {
          status: "completed",
          title: "After-work round, beginners welcome",
          location: "Riverside Park",
          meetingAt: "9/3 (Thu) 19:00",
          headcount: [10, 10],
          likes: 21,
          scraps: 7,
        },
      ],
      detail: {
        content:
          "We're playing cops and robbers at Central Park on Saturday afternoon. Meet by the fountain at the main entrance - we'll set the zone and start right away. Just install the app and we'll walk you through the rest. First-timers welcome!",
        comments: [
          {
            name: "RunningCheetah22",
            text: "Is it okay if it's my first time?",
            time: "09/02 14:10",
            profile: 1,
          },
          {
            name: "TownSheriff",
            text: "Of course! We'll go over the rules when we meet",
            time: "09/02 14:32",
            profile: 2,
          },
        ],
      },
      chat: {
        host: "TownSheriff",
        opener: "Welcome! See you Saturday at 4 by the fountain",
        draft: "Hi! I'll be there on Saturday",
        reply: "Great! Let's open a practice round right now",
      },
    },
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
      communityTitle: "コミュニティ",
      scopeAll: "すべて",
      scopeNearby: "近所",
      scopeMine: "マイ募集",
      sortLatest: "新着順",
      createPost: "募集を作成",
      comingSoon: "準備中です",
      statusRecruiting: "募集中",
      statusCompleted: "締切",
      headcount: (c, m) => `${c}/${m}人`,
      detailTitle: "募集",
      joinChat: "チャットに参加する",
      share: "共有",
      commentCount: (n) => `コメント ${n}`,
      commentHint: "コメントを残してみましょう",
      communityChatHint: "メッセージを送る",
      systemJoined: (n) => `${n}さんが参加しました`,
      viewLocation: "場所を見る",
      meetingMembers: (c, m) => `現在 ${c}/${m}名`,
      inviteOpened: "ゲームが始まりました!",
      inviteTitle: (n, r) => `${n}さんが[${r}]部屋に招待しました`,
      inviteCodeLine: (c) => `招待コード ${c}`,
      inviteJoin: "ゲームに参加",
      inviteDialogTitle: "ゲーム招待状",
      inviteDialogBody: (n) => `${n}さんが\nゲームに招待しました`,
      inviteDialogCodeLabel: "ルームコード",
      inviteDialogDecline: "拒否",
      inviteDialogEnter: "入場",
      qrDisplayTitle: "指名手配QR",
      qrDisplayMessage: "警察にQRコードを見せてください",
      policeStartCountdown: (t) => `警察開始まで ${t}`,
      arrestNotice: (p, r) => `@icon_police [${p}]が@icon_robber [${r}]を逮捕しました!`,
      settingsTitle: "設定",
      profileIconLabel: "プロフィールアイコン",
      sectionAccount: "アカウント",
      sectionApp: "アプリ設定",
      sectionGuide: "利用案内",
      sectionEtc: "その他",
      changeNickname: "ニックネーム変更",
      myScraps: "マイスクラップ",
      gameNotification: "ゲーム通知",
      gameNotificationDesc: "ゲーム進行中に発生するイベントの通知を設定します",
      communityNotification: "コミュニティ通知",
      communityNotificationDesc:
        "コメント・返信・チャットのプッシュ通知を受け取ります。オフにしても通知ボックスには残ります",
      generalNotification: "通知",
      generalNotificationHighlight: "ゲーム中通知",
      generalNotificationDetail: "を含む、アプリから送信されるすべての通知を設定します",
      languageLabel: "言語",
      languageSystem: "システム",
      locationPermission: "位置情報の権限管理",
      locationPermissionDesc: "端末の設定で位置情報の権限を変更できます",
      appVersionLabel: "アプリバージョン",
      tutorialRewatch: "チュートリアルをもう一度見る",
      tutorialReset: "チュートリアル初期化",
      bugReport: "バグ報告",
      openSourceLicenses: "オープンソースライセンス",
      agreements: "利用規約とポリシー",
      logout: "ログアウト",
      deleteAccount: "退会",
      snsPrompt: "もっと最新情報が気になるなら 👀",
    },
    themeHint: "テーマを切り替えると反対チームでプレイできます",
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
        intro: "近所の集まりが見つかる場所です。気になる募集を選びましょう。",
        tasks: [{ id: "community-open", label: "一番上の募集をタップ" }],
      },
      my: {
        id: "my",
        title: "マイページ",
        intro: "プロフィールと設定が集まる場所です。隅に隠しものもあります。",
        tasks: [
          { id: "my-icon", label: "プロフィールアイコンを変えてみて" },
          { id: "my-version", label: "アプリバージョンを5回タップ" },
        ],
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
      homeCommunity: {
        id: "homeCommunity",
        title: "ホーム",
        intro: "今度は一緒に走る仲間を探してみましょう。",
        tasks: [{ id: "community-tab", label: "下のコミュニティタブをタップ" }],
      },
      communityDetail: {
        id: "communityDetail",
        title: "募集",
        intro: "集まりの情報がひと目でわかります。",
        tasks: [
          { id: "detail-like", label: "いいねをタップ" },
          { id: "detail-join", label: "「チャットに参加する」をタップ" },
        ],
      },
      communityChat: {
        id: "communityChat",
        title: "募集チャット",
        intro: "ホストが待っています。",
        tasks: [
          { id: "chat-send", label: "送信ボタンであいさつを送る" },
          { id: "chat-invite", label: "招待カードの「ゲームに参加」をタップ" },
        ],
      },
      waitingRobber: {
        id: "waitingRobber",
        title: "待機室",
        intro: "今回は泥棒です。このまま準備すればOKです。",
        tasks: [{ id: "waiting-robber-ready", label: "「準備完了」をタップ" }],
      },
      ingameRobber: {
        id: "ingameRobber",
        title: "逃走戦",
        intro: "まもなく警察が出発します。自分の位置は定期的に足あとで公開されます。",
        tasks: [
          { id: "robber-qr", label: "指名手配QRを開いて確認" },
          { id: "robber-ping", label: "地図を長押しして警察の位置にピンを残す" },
          { id: "robber-chat", label: "チャットでチームに状況を共有" },
        ],
      },
      victoryRobber: {
        id: "victoryRobber",
        title: "生存勝利",
        intro: "実際のゲームでは、この瞬間を自分の足で守り抜きます。",
        tasks: [],
      },
    },
    courses: [
      {
        id: "police",
        title: "警察でプレイ",
        stage: {
          h1: ["泥棒が今", "逃げています"],
          lead: "インストール不要で、ここでそのまま追いかけられます。吹き出しに沿って進めば、逮捕まであっという間です。",
        },
        steps: [
          { label: "友だちの部屋に入る", short: "入室", scenes: ["home", "join"] },
          { label: "チームを決めて準備", short: "準備", scenes: ["waiting"] },
          { label: "足あとを追って泥棒を追跡", short: "追跡", scenes: ["ingame"] },
          { label: "逮捕して記録カードをもらう", short: "逮捕", scenes: ["victory"] },
        ],
        finish: "victory",
      },
      {
        id: "robber",
        title: "泥棒でプレイ",
        stage: {
          h1: ["警察がすぐ", "そこまで来ています"],
          lead: "インストール不要で、ここでそのまま逃げられます。最後まで捕まらなければ、その時点で勝ちです。",
        },
        steps: [
          { label: "友だちの部屋に入る", short: "入室", scenes: ["home", "join"] },
          { label: "泥棒チームで準備", short: "準備", scenes: ["waitingRobber"] },
          { label: "足あとを隠しながら逃げる", short: "逃走", scenes: ["ingameRobber"] },
          { label: "最後まで生き残って勝利", short: "生存", scenes: ["victoryRobber"] },
        ],
        finish: "victoryRobber",
      },
      {
        id: "create",
        title: "ホストでプレイ",
        stage: {
          h1: ["今日の勝負は", "自分が仕切る"],
          lead: "エリアもルールも思いのまま。部屋を開けば友だちが集まります。",
        },
        steps: [
          { label: "部屋づくりを始める", short: "ホーム", scenes: ["homeCreate"] },
          { label: "エリアと牢屋を描く", short: "エリア", scenes: ["createZone", "createJail"] },
          { label: "ゲームのルールを決める", short: "設定", scenes: ["createBasic", "createConfirm"] },
          { label: "友だちを集めてスタート", short: "開始", scenes: ["hostWaiting"] },
        ],
        finish: "ingame",
      },
      {
        id: "community",
        title: "募集から合流",
        stage: {
          h1: ["一緒に走る仲間が", "ここにいます"],
          lead: "気になる募集にあいさつするだけ。招待状が届いたら、すぐゲームです。",
        },
        steps: [
          {
            label: "コミュニティで募集を選ぶ",
            short: "募集",
            scenes: ["homeCommunity", "community"],
          },
          { label: "内容を読んでチャットに参加", short: "詳細", scenes: ["communityDetail"] },
          { label: "あいさつすると招待が届く", short: "チャット", scenes: ["communityChat"] },
          { label: "招待コードで待機室に合流", short: "合流", scenes: ["waiting"] },
        ],
        finish: "waiting",
      },
    ],
    chatScript: {
      opener: "北門のあたりで足あとを見ました！",
      reply: "了解、東側は任せてください！",
    },
    robberChatScript: {
      opener: "警察2人が北門の方に向かいました！",
      reply: "了解、私は公園側に回ります！",
    },
    caught: "逮捕成功！",
    community: {
      posts: [
        {
          status: "recruiting",
          title: "代々木公園で16時に走る人",
          location: "渋谷区 代々木",
          meetingAt: "9/5 (土) 16:00",
          headcount: [3, 8],
          likes: 12,
          scraps: 4,
        },
        {
          status: "recruiting",
          title: "多摩川河川敷でナイトケイドロ",
          location: "世田谷区 二子玉川",
          meetingAt: "9/6 (日) 19:30",
          headcount: [5, 10],
          likes: 8,
          scraps: 2,
        },
        {
          status: "completed",
          title: "仕事帰りに一戦、初心者歓迎",
          location: "港区 芝公園",
          meetingAt: "9/3 (木) 19:00",
          headcount: [10, 10],
          likes: 21,
          scraps: 7,
        },
      ],
      detail: {
        content:
          "土曜の午後、代々木公園でケイドロをします。原宿門の前に集合して、エリアを決めたらすぐ始めます。アプリを入れて来てもらえれば、あとは全部教えます。初めてでも大丈夫です！",
        comments: [
          {
            name: "はしるチーター22",
            text: "初めてでも参加できますか？",
            time: "09/02 14:10",
            profile: 1,
          },
          {
            name: "まちの保安官",
            text: "もちろんです！ルールは会ってから教えますね",
            time: "09/02 14:32",
            profile: 2,
          },
        ],
      },
      chat: {
        host: "まちの保安官",
        opener: "ようこそ！土曜16時、原宿門の前で会いましょう",
        draft: "こんにちは！土曜、私も行きます",
        reply: "いいですね！練習に今から1プレイ開きます",
      },
    },
  },
};
