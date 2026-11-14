import type { Locale } from "./config";

// 로케일별 문구. 기계번역이 아니라 현지에서 실제로 쓰는 마케팅 말투로 작성한다.
// - en: 미국 실사 태그/GPS 게임 앱(GeoHunt, FoxHunt, TagTown) 톤 - 명령형·구어체.
//   "Grab your friends", "set your zone", "the chase is on", "no gear, just your phone".
// - ja: 현지 명칭 ケイドロ(警察/泥棒) + 「リアル鬼ごっこ」「ワイワイ」 등 실제 앱 표현,
//   キャッチコピー 리듬(体言止め·「〜か、〜か。」).

export type Messages = typeof ko;

const ko = {
  home: {
    meta: {
      title: "경찰과 도둑",
      description:
        "GPS 기반 오프라인 술래잡기 게임. 친구들과 밖에서 직접 뛰며 놀던 그 놀이를 이제 앱과 함께 즐기세요.",
    },
    hero: {
      title1: "경찰과 도둑이",
      title2: "돌아왔어요",
      lead: "스마트폰 하나면 준비 끝이에요.",
      leadExtra: "진행은 앱이 알아서 해요.",
      free: "무료",
      players: "최대 150명까지 함께 플레이",
      timeLeft: "남은 시간",
    },
    characters: {
      title: "두 팀, 서로 다른 전략",
      sub: "카드를 눌러 팀을 선택해 보세요.",
      selected: "선택됨",
      pick: "팀 선택",
      pickAria: "{name} 팀 선택",
      cop: {
        name: "경찰",
        summary: "공개되는 발자국을 쫓아 도둑을 모두 잡으세요.",
      },
      robber: {
        name: "도둑",
        summary: "잡히지 말고 제한 시간까지 살아남으세요.",
      },
    },
    how: {
      title1: "앱을 열고,",
      title2: "공원으로 나가면 끝",
      sub: "친구한테 코드 보내고, 지도에 구역만 그리면 바로 시작이에요.",
      steps: [
        {
          title: "방 만들기",
          description: "방을 만들면 6자리 초대 코드와 QR이 자동으로 생성돼요.",
        },
        {
          title: "구역 그리기",
          description: "지도 위에 플레이 구역과 감옥을 드래그로 그려요.",
        },
        {
          title: "팀 정하기",
          description: "닉네임을 정하고 경찰이나 도둑을 자유롭게 선택해요.",
        },
        {
          title: "이제 뛰면 돼요",
          description:
            "제한 시간 안에 도둑을 모두 잡으면 경찰 승, 한 명이라도 살아남으면 도둑 승.",
        },
      ],
    },
    features: {
      title1: "복잡한 건 앱에 맡기고",
      title2: "즐기기만 하세요",
      sub: "위치 공유, 구역 체크, 팀 채팅까지 앱이 책임집니다. 이제 게임만 즐기세요.",
      items: [
        {
          title: "주기적으로 남는 발자국",
          description:
            "설정한 주기마다 도둑 위치가 발자국으로 찍혀요. 경찰이 따라갈 유일한 단서예요.",
        },
        {
          title: "구역과 감옥, 손끝으로",
          description:
            "지도를 드래그해서 플레이 구역과 감옥을 그려요. 구역 밖으로 나가면 바로 경고가 떠요.",
        },
        {
          title: "팀원에게만 닿는 대화",
          description:
            "경찰은 경찰끼리, 도둑은 도둑끼리. 전략이 상대팀으로 새어나가지 않아요.",
        },
      ],
    },
    finalCta: {
      title: "이제 공원에서 만나요",
      lead1: "같이 뛸 사람이 없다고요? 커뮤니티에서 구하면 돼요.",
      lead2: "폰 하나만 들고 나가면 준비 끝이에요.",
      demoCta: "설치 전에 한 판 해보기",
    },
    minigame: {
      badge: "🧀 미니게임",
      title: "치즈 은행이 털렸어요!",
      description: "경찰을 도와, 곳곳에 숨어든 치즈 도둑을 모두 검거해주세요.",
      button: "잡으러 가기",
      wantedName: "치즈 도둑",
      bounty: "현상금 🧀 듬뿍",
    },
    v3Notice: {
      badge: "v3 새 소식",
      tag: "v3 업데이트",
      title: "경찰과 도둑이 새로워졌어요",
      highlights: [
        {
          title: "같이 뛸 사람을 구해요",
          description:
            "'토요일에 동네 공원에서 뛰실 분!' 이런 글을 보고 마음에 들면 바로 참여할 수 있어요.",
        },
        {
          title: "약속은 채팅방에서 잡아요",
          description:
            "참여하면 채팅방이 열려서, 번호 몰라도 약속을 잡고 게임 초대까지 받을 수 있어요.",
        },
      ],
      demoCta: "웹에서 미리 체험하기",
      close: "닫기",
    },
  },
  demo: {
    meta: {
      title: "설치 없이 한 판 해보기",
      description:
        "경찰과 도둑을 웹에서 바로 한 판 해봐요. 방에 들어가고, 발자국을 쫓고, QR로 체포까지 실제 앱 화면 그대로.",
    },
  },
  game: {
    meta: {
      title: "게임 소개",
      description:
        "경찰과 도둑(경도) 하는 법을 정리하고, 좁아지는 구역과 발자국, QR 체포 같은 앱 기능을 실제 화면으로 보여 줘요.",
    },
    hero: {
      title1: "경찰과 도둑,",
      title2: "이렇게 플레이해요",
      lead: "어릴 때 하던 경찰과 도둑 그대로 뛰면 되고, 판단은 앱이 도와줘요.",
    },
    rules: {
      heading: "경찰과 도둑, 이렇게 해요",
      sub: "어릴 때 하던 그대로예요. 앱은 옆에서 진행만 봐줘요.",
      appLabel: "앱에서는",
      steps: [
        {
          title: "팀부터 나눠요",
          play: "경찰 할 사람, 도둑 할 사람을 정해요. 도둑이 좀 더 많아야 쫓고 쫓기는 맛이 나요.",
          app: "초대 코드를 보내면 친구가 같은 방에 들어오고, 팀은 대기실에서 바꿀 수 있어요.",
        },
        {
          title: "구역을 정해요",
          play: "여기서부터 저기까지, 도망 다닐 수 있는 범위를 정해요. 잡힌 도둑이 들어갈 감옥 자리도 하나 골라요.",
          app: "방장이 지도에 원이나 핀으로 구역을 그리고, 그 밖으로 나가면 화면이 잠겨요.",
        },
        {
          title: "도둑이 먼저 도망가요",
          play: "경찰이 열까지 세는 동안 도둑은 최대한 멀리 흩어져요.",
          app: "정해 둔 시간 동안 경찰을 기다리게 했다가, 사이렌이 울리면 출동해요.",
        },
        {
          title: "쫓고, 잡아요",
          play: "도둑을 찾으면 달려가서 터치해요.",
          app: "터치한 뒤 도둑의 QR까지 찍어야 체포라서, 잡았네 안 잡혔네 다툴 일이 없어요. 도둑 위치는 정해진 시간마다 발자국으로 떠요.",
        },
        {
          title: "잡히면 감옥, 터치하면 탈옥",
          play: "잡힌 도둑은 감옥에서 기다려요. 아직 안 잡힌 동료가 몰래 와서 터치하면 다시 도망갈 수 있어요.",
          app: "동료의 터치를 받고 감옥 밖으로 나가 3초가 지나면 앱이 탈옥으로 처리해요.",
        },
        {
          title: "이기는 법",
          play: "도둑을 다 잡으면 경찰이 이겨요. 시간이 끝날 때까지 한 명이라도 살아남으면 도둑 승리예요.",
          app: "남은 시간과 남은 도둑 수가 화면과 잠금 화면에 계속 떠요.",
        },
      ],
    },
    features: [
      {
        title: "지도에 구역을 그려요",
        description:
          "방장이 지도에 원을 그리거나 핀을 찍어 구역을 정하고, 그 안에 감옥 자리도 함께 골라요.",
        checks: [
          "원이나 핀으로 구역 설정",
          "구역 안에 감옥 지정",
          "구역 밖으로 나가면 화면 잠김",
        ],
      },
      {
        title: "구역이 점점 좁아져요",
        description:
          "방장이 구역 축소를 켜면 원형 구역이 게임 중에 네 번에 걸쳐 좁아져서, 끝으로 갈수록 숨을 곳이 줄어요.",
        checks: [
          "켜고 끄는 건 방장 선택",
          "다음 축소까지 남은 시간 표시",
          "구역 밖에 오래 머문 도둑은 자동 체포",
        ],
      },
      {
        title: "일정 주기마다 발자국이 찍혀요",
        description:
          "방장이 정한 주기마다 도둑의 위치가 발자국으로 공개돼요. 공개 전에 자리를 옮기지 않으면 그대로 잡힐 수 있어요.",
        checks: [
          "공개 주기는 0~30분 중에 선택",
          "다음 공개까지 남은 시간 표시",
        ],
      },
      {
        title: "터치하고 QR로 체포해요",
        description:
          "도둑을 터치한 뒤 QR을 찍으면 바로 체포돼요. QR은 30초만 유효해서 미리 캡처해 둘 수 없어요.",
        checks: ["스캔 한 번이면 바로 체포", "도둑은 메뉴에서 내 QR 열기"],
      },
      {
        title: "우리 팀끼리만 작전을 짜요",
        description:
          "경찰은 경찰끼리, 도둑은 도둑끼리 나눈 대화는 상대 팀에 보이지 않아요.",
        checks: [
          "팀 채팅과 전체 채팅 따로",
          "지도를 길게 눌러 팀에게 핑",
          "실시간 메시지",
        ],
      },
      {
        title: "끝나면 팀마다 MVP가 나와요",
        description:
          "게임이 끝나면 팀마다 MVP를 한 명씩 뽑고, 내가 뛴 거리와 지나온 길도 지도로 남겨 줘요.",
        checks: [
          "경찰은 가장 많이 잡은 사람, 도둑은 가장 덜 잡힌 사람",
          "이동 거리와 경로 지도",
          "결과 이미지 저장과 공유",
        ],
      },
      {
        title: "동네에서 같이 뛸 사람을 찾아요",
        description:
          "같이 할 친구가 부족하면 동네 모집 글을 둘러보세요. 마음에 드는 판에 들어가면 채팅방에서 바로 약속을 잡을 수 있어요.",
        checks: [
          "장소·시간·인원을 한눈에",
          "댓글로 먼저 물어보기",
          "참여하면 바로 채팅방 입장",
        ],
      },
    ],
    faqHeading: "자주 묻는 질문",
    faq: [
      {
        question: "몇 명이서 할 수 있나요?",
        answer:
          "2명부터 최대 150명까지 할 수 있고, 경찰과 도둑이 한 명씩은 있어야 시작돼요.",
      },
      {
        question: "한 판에 얼마나 걸리나요?",
        answer: "방장이 10분부터 3시간까지 정할 수 있는데, 처음이라면 30분을 추천해요.",
      },
      {
        question: "도둑 위치는 경찰한테 어떻게 공개되나요?",
        answer:
          "실시간으로 계속 보이지는 않고, 방장이 정한 주기마다 경찰 지도에 발자국으로 찍혀요.",
      },
      {
        question: "경찰은 도둑을 어떻게 잡나요?",
        answer: "도둑을 따라잡아 터치한 뒤, 도둑 화면의 QR을 찍으면 체포돼요.",
      },
      {
        question: "감옥에 갇히면 끝인가요?",
        answer: "아니에요. 동료가 터치해 주면 감옥 밖으로 나가 다시 도망칠 수 있어요.",
      },
      {
        question: "구역이 줄어들기도 하나요?",
        answer:
          "방장이 구역 축소를 켜면 원형 구역이 게임 중에 네 번에 걸쳐 좁아져요. 핀으로 그린 구역에서는 쓸 수 없어요.",
      },
      {
        question: "MVP는 어떻게 정해지나요?",
        answer:
          "경찰은 가장 많이 잡은 사람, 도둑은 가장 덜 잡힌 사람이 MVP가 되고, 같으면 더 많이 뛴 사람이 뽑혀요.",
      },
      {
        question: "같은 팀끼리만 대화할 수 있나요?",
        answer:
          "팀 채팅은 우리 팀만 볼 수 있고, 모두와 이야기할 땐 전체 채팅을 쓰면 돼요.",
      },
      {
        question: "아이폰과 안드로이드가 같이 할 수 있나요?",
        answer: "네, 기종과 상관없이 함께 할 수 있어요.",
      },
      {
        question: "위치 정보는 안전하게 처리되나요?",
        answer:
          "게임이 진행되는 동안에만 위치를 모으고 끝나면 바로 멈춰요. 자세한 내용은 위치정보 이용약관에서 볼 수 있어요.",
        link: { label: "위치정보 이용약관 보기", href: "/location" },
      },
      {
        question: "무료인가요?",
        answer: "네, 무료로 받아서 바로 할 수 있어요.",
      },
    ],
  },
  team: {
    meta: {
      title: "동심지키미 팀 소개",
      description:
        "동심지키미 - 게임으로 사람과 사람을 연결하는 팀. 위치 기반 오프라인 게임 ‘경찰과 도둑’을 기획·개발합니다.",
    },
    hero: {
      eyebrow: "동심지키미",
      title1: "게임으로 사람과 사람을",
      title2: "연결합니다",
      para1:
        "동심지키미는 누구나 함께 웃고 뛰어놀며 새로운 추억을 만들 수 있는 경험을 기획·개발하는 팀입니다. 우리는 게임을 통해 사람과 사람을 연결하는 것을 목표로 합니다.",
      para2:
        "대표 서비스 ‘경찰과 도둑’은 실시간 위치 데이터를 기반으로 서로를 쫓고 피하는 플레이를 통해, 단순한 게임을 넘어 몰입감 있는 오프라인 경험을 제공합니다.",
    },
    company: {
      label: "회사 정보",
      rows: [
        { label: "설립", value: "2026년 4월" },
        { label: "대표", value: "정상희" },
        { label: "팀 규모", value: "8명" },
        { label: "분야", value: "위치 기반 오프라인 게임" },
        { label: "대표 서비스", value: "경찰과 도둑" },
        {
          label: "문의",
          value: "copsnro66ers@gmail.com",
          href: "mailto:copsnro66ers@gmail.com",
        },
      ],
    },
    preview: {
      eyebrow: "만드는 사람들",
      heading: "여덟 명이 함께 만들어요",
      origin: "상희의 “경찰과 도둑 같이 만들래?” 한마디에서 시작된 팀이에요.",
      membersButton: "구성원 보기",
    },
    records: {
      historyHeading: "걸어온 길",
      awardsHeading: "수상 및 선정 이력",
    },
    moments: {
      eyebrow: "현장에서",
      heading: "직접 뛰며 만들고 검증합니다",
      sub: "사용자와 함께 여러 차례 QA를 진행하며 경험을 다듬어 왔습니다.",
      captions: [
        { label: "1차 QA", date: "2026.03" },
        { label: "2차 QA", date: "2026.04" },
      ],
    },
  },
  blog: {
    meta: {
      title: "이야기",
      description:
        "경찰과 도둑을 만드는 동심지키미 팀이 남기는 발자국들 - 개발기, 행사 후기, 그리고 뒷이야기.",
    },
    title: "이야기",
    lead: "경찰과 도둑을 만들며 남긴 발자국들.\n개발기, 행사 후기, 그리고 뒷이야기를 기록해요.",
    // 글이 없을 때도 무엇을 다룰지 알려준다 - 빈 화면이면 검색엔진이 soft 404로 본다.
    empty: {
      title: "아직 첫 이야기를 준비하고 있어요",
      description:
        "게임을 더 재밌게 즐기는 방법, 직접 연 행사 후기, 만들면서 겪은 일들을 곧 기록할게요.",
    },
    related: "이런 이야기는 어때요?",
    view: {
      label: "글 목록 보기 방식",
      card: "카드형으로 보기",
      list: "목록형으로 보기",
      count: "글 {count}개",
    },
  },
  online: {
    meta: {
      title: "경찰과 도둑 온라인 게임",
      description: "밖에 나가지 않고 온라인으로 즐기는 경찰과 도둑이에요. 최대 8명, 한 판 3분이에요.",
    },
    title: ["경찰과 도둑", "온라인 게임"],
    lead: "밖에 나가지 않고 온라인으로 즐겨 보세요.",
    play: "친구랑 한 판 하기",
    stats: [
      ["인원", "최대 8명"],
      ["한 판", "3분"],
      ["설치", "필요 없어요"],
    ],
    // {t} 는 다시 여는 예정 시각("11월 7일 오후 9:30")
    note: { soon: "아직 만들고 있어요", pauseUntil: "{t}쯤 다시 와 주세요", pause: "점검하고 있어요. 조금 뒤에 다시 와 주세요" },
    features: [
      { title: "팀을 선택하세요", body: "대기실에서 경찰 칸이나 도둑 칸으로 들어가세요." },
      { title: "숨거나 찾으세요", body: "수풀에 들어가면 멀리서는 보이지 않아요. 밖으로 나오면 들켜요." },
      { title: "35초마다 위치가 공개돼요", body: "도둑 위치가 경찰 지도에 잠깐 표시돼요." },
      { title: "동료를 구출하세요", body: "잡히면 감옥으로 가요. 같은 편이 문 앞에 잠깐 서 있으면 풀려나요." },
    ],
    again: "친구와 함께 즐겨 보세요",
    app: {
      iconAlt: "경찰과 도둑 앱 아이콘",
      title: "오프라인으로도 즐겨 보세요",
      body: "공원이나 운동장에서 친구들과 직접 뛰어요.",
      link: "어떻게 하는지 보기",
    },
  },
  legal: {
    effectiveDate: "시행일",
    history: "이전 버전",
    historyLead: "이전 버전은 아래에서 볼 수 있어요.",
    period: "{from}부터 {until}까지 적용",
    archivedNotice: "{from}부터 {until}까지 적용된 이전 버전이에요.",
    viewCurrent: "현재 버전 보기",
    archivedTitle: "{title} (이전 버전, {from} 시행)",
  },
};

const en: Messages = {
  home: {
    meta: {
      title: "Cops and Robbers - Real-Life GPS Tag",
      description:
        "The cops-and-robbers chase you grew up with, now powered by live GPS. Grab your friends, set your zone, and play with up to 150 people, all on your phone.",
    },
    hero: {
      title1: "Cops and Robbers,",
      title2: "back in real life",
      lead: "No gear needed. Just your phone.",
      leadExtra: "The app handles the rest.",
      free: "Free",
      players: "Up to 150 players per game",
      timeLeft: "Time left",
    },
    characters: {
      title: "Two teams, opposite goals",
      sub: "Tap a card to pick your side.",
      selected: "Selected",
      pick: "Pick side",
      pickAria: "Pick the {name}",
      cop: {
        name: "Cops",
        summary: "Track the footprints and tag every robber.",
      },
      robber: {
        name: "Robbers",
        summary: "Dodge the cops and outlast the clock.",
      },
    },
    how: {
      title1: "Open the app,",
      title2: "head to the park",
      sub: "Send a code, draw your zone on the map, and the chase is on.",
      steps: [
        {
          title: "Create a room",
          description:
            "Create a room and get a 6-digit invite code and QR instantly.",
        },
        {
          title: "Draw the zone",
          description: "Drag on the map to set your play area and the jail.",
        },
        {
          title: "Pick teams",
          description: "Set a nickname and jump in as a cop or a robber.",
        },
        {
          title: "Now just run",
          description:
            "Catch every robber before time runs out and the cops win. If even one escapes, the robbers win.",
        },
      ],
    },
    features: {
      title1: "Let the app do the work,",
      title2: "you just play",
      sub: "Live location sharing, boundary alerts, team chat - the app handles it all. You just play.",
      items: [
        {
          title: "Footprints on a timer",
          description:
            "At the interval you set, each robber's location appears as a footprint - the cops' only clue.",
        },
        {
          title: "Draw your zone and jail",
          description:
            "Drag out your play area and jail right on the map. Step outside the boundary and you'll get an instant alert.",
        },
        {
          title: "Team-only chat",
          description:
            "Cops to cops, robbers to robbers. Your plan never leaks to the other side.",
        },
      ],
    },
    finalCta: {
      title: "See you at the park",
      lead1: "No one to play with? Recruit them in the community.",
      lead2: "All you need to bring is your phone.",
      demoCta: "Play a round before you install",
    },
    minigame: {
      badge: "🧀 Mini-game",
      title: "The cheese bank got robbed!",
      description: "Help the cops catch every cheese thief hiding around town.",
      button: "Go catch them",
      wantedName: "Cheese Thief",
      bounty: "Reward: 🧀 loads",
    },
    v3Notice: {
      badge: "What's new in v3",
      tag: "v3 update",
      title: "Cops and Robbers just got a big update",
      highlights: [
        {
          title: "Find people to run with",
          description:
            "Short on players? Browse recruiting posts, check the spot, time, and open slots, and jump into a game you like.",
        },
        {
          title: "Plan it in the group chat",
          description:
            "Joining a post opens a chat with everyone in it. Set the plan and get your game invite right there - no swapping numbers.",
        },
      ],
      demoCta: "Try it on the web first",
      close: "Close",
    },
  },
  demo: {
    meta: {
      title: "Play a Round in Your Browser - No Install",
      description:
        "Try Cops and Robbers right in your browser. Join a room, follow the footprints, and make a QR arrest - the real app screens, no download needed.",
    },
  },
  game: {
    meta: {
      title: "How to Play Cops and Robbers - Rules & Game Guide",
      description:
        "Learn the cops and robbers rules - teams, the zone, jail breaks, and how to win. Then see the app in action: a shrinking zone, footprints, QR arrests, and team MVPs.",
    },
    hero: {
      title1: "Cops and Robbers,",
      title2: "here's how it plays",
      lead: "Play it just like you did as a kid, and let the app make the close calls.",
    },
    rules: {
      heading: "How to play cops and robbers",
      sub: "The same rules you grew up with. The app just runs the game.",
      appLabel: "In the app",
      steps: [
        {
          title: "Split into teams",
          play: "Pick your cops and your robbers. A few extra robbers keep the chase alive.",
          app: "Send an invite code and friends land in the same room, where anyone can switch teams.",
        },
        {
          title: "Set the zone",
          play: "Agree on the boundaries, and pick one spot to be the jail.",
          app: "The host draws the zone on the map with a circle or pins, and stepping outside locks your screen.",
        },
        {
          title: "Robbers run first",
          play: "While the cops count down, the robbers scatter and hide.",
          app: "The cops wait out the head start, then the siren sounds and they're off.",
        },
        {
          title: "Chase and tag",
          play: "Spot a robber, run them down, and tag them.",
          app: "After the tag, the cop scans the robber's QR to lock in the arrest, so there's no arguing about who got caught. Footprints show where robbers were at each interval.",
        },
        {
          title: "Jail and jailbreak",
          play: "Caught robbers wait in jail. A teammate can sneak in and tag them free.",
          app: "Once a teammate tags you, step out of the jail and the app counts it as an escape after 3 seconds.",
        },
        {
          title: "Win the game",
          play: "Cops win by catching every robber. If even one is still free when time runs out, the robbers take it.",
          app: "Time left and robbers left stay on your screen and your lock screen.",
        },
      ],
    },
    features: [
      {
        title: "Draw your zone on the map",
        description:
          "The host sets the zone by drawing a circle or dropping pins on the map, then picks a jail spot inside it.",
        checks: [
          "Set the zone with a circle or pins",
          "Mark a jail inside the zone",
          "The screen locks if you leave the zone",
        ],
      },
      {
        title: "The zone keeps shrinking",
        description:
          "When the host turns on Shrinking area, the circle closes in four times during the game, so there are fewer places to hide as the clock runs down.",
        checks: [
          "The host turns it on or off",
          "Countdown to the next shrink",
          "Robbers who stay outside too long get caught automatically",
        ],
      },
      {
        title: "Footprints drop on a timer",
        description:
          "At the interval the host sets, each robber's location is revealed as a footprint. Keep moving before the next reveal, or you might get caught.",
        checks: [
          "Pick a reveal interval from 0 to 30 minutes",
          "Countdown to the next reveal",
        ],
      },
      {
        title: "Tag, then scan the QR",
        description:
          "Tag a robber and scan their QR to make the arrest on the spot. Each QR only works for 30 seconds, so a screenshot won't cut it.",
        checks: ["One scan and they're caught", "Robbers open My QR from the menu"],
      },
      {
        title: "Plan with your own team",
        description:
          "Cops talk with cops, robbers with robbers, and the other side never sees your messages.",
        checks: [
          "Separate team chat and global chat",
          "Long-press the map to ping your team",
          "Messages update instantly",
        ],
      },
      {
        title: "Each team gets an MVP",
        description:
          "When the game ends, each team names one MVP, and the app maps out how far you ran and where you went.",
        checks: [
          "Cops: most arrests. Robbers: caught the fewest times",
          "Distance and route map",
          "Save and share your result as an image",
        ],
      },
      {
        title: "Find neighbors to run with",
        description:
          "Short on players? Browse recruiting posts from your area, and once you join one, settle the meetup right in its chat room.",
        checks: [
          "Place, time, and headcount at a glance",
          "Ask questions in the comments first",
          "You're in the chat as soon as you join",
        ],
      },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      {
        question: "How many people can play?",
        answer:
          "Anywhere from 2 to 150 players, as long as there's at least one cop and one robber to start.",
      },
      {
        question: "How long is one game?",
        answer:
          "The host picks anything from 10 minutes to 3 hours, and 30 minutes is a good place to start.",
      },
      {
        question: "How is a robber's location shown to the cops?",
        answer:
          "It isn't live. At the interval the host sets, each robber's location drops as a footprint on the cops' map.",
      },
      {
        question: "How do cops catch a robber?",
        answer:
          "Catch up and tag the robber, then scan the QR on their screen to make the arrest.",
      },
      {
        question: "Is it over once you're in jail?",
        answer:
          "No. When a teammate tags you, step out of the jail and you're back on the run.",
      },
      {
        question: "Does the zone get smaller?",
        answer:
          "If the host turns on Shrinking area, the circle closes in four times during the game. It isn't available for zones drawn with pins.",
      },
      {
        question: "How is the MVP chosen?",
        answer:
          "The cop with the most arrests and the robber caught the fewest times are the MVPs, and ties go to whoever ran farther.",
      },
      {
        question: "Can only teammates chat with each other?",
        answer:
          "Team chat is just for your team, and global chat is there when you want to talk to everyone.",
      },
      {
        question: "Can iPhone and Android play together?",
        answer: "Yes, everyone can play together regardless of device.",
      },
      {
        question: "Is my location handled safely?",
        answer:
          "Location is only collected while a game is running, and it stops as soon as the game ends.",
      },
      {
        question: "Is it free?",
        answer: "Yes, it's free to download and play.",
      },
    ],
  },
  team: {
    meta: {
      title: "About Team Dongsim",
      description:
        "Team Dongsim connects people through play, designing and building the location-based offline game Cops and Robbers.",
    },
    hero: {
      eyebrow: "Team Dongsim",
      title1: "Connecting people",
      title2: "through play",
      para1:
        "Team Dongsim creates games that get people outdoors, moving, and making memories together. Our goal is to connect people through play.",
      para2:
        "Our flagship game, Cops and Robbers, turns real-time location into an outdoor game of chase and escape. More than a game, it's an experience that gets people moving together.",
    },
    company: {
      label: "Company",
      rows: [
        { label: "Founded", value: "April 2026" },
        { label: "Lead", value: "Sanghee Jeong" },
        { label: "Team size", value: "8 members" },
        { label: "Industry", value: "Location-based games" },
        { label: "Flagship", value: "Cops and Robbers" },
        {
          label: "Contact",
          value: "copsnro66ers@gmail.com",
          href: "mailto:copsnro66ers@gmail.com",
        },
      ],
    },
    preview: {
      eyebrow: "The people",
      heading: "Eight of us, building it together",
      origin:
        "It started with Sanghee's one line: “Want to build Cops and Robbers together?”",
      membersButton: "Meet the team",
    },
    records: {
      historyHeading: "Our journey",
      awardsHeading: "Awards & selections",
    },
    moments: {
      eyebrow: "Tested in the real world",
      heading: "We build and test it ourselves",
      sub: "We've tested the game with real players over and over, improving the experience with every round.",
      captions: [
        { label: "1st QA", date: "2026.03" },
        { label: "2nd QA", date: "2026.04" },
      ],
    },
  },
  blog: {
    meta: {
      title: "Stories",
      description:
        "Dev logs, event recaps, and behind-the-scenes notes from the team building Cops and Robbers.",
    },
    title: "Stories",
    lead: "Footprints we left while building Cops and Robbers.\nDev logs, event recaps, and the stories behind them.",
    empty: {
      title: "Our first story is on the way",
      description:
        "We'll be sharing tips for playing, recaps from the events we run, and notes from building the game. Check back soon.",
    },
    related: "You might also like",
    view: {
      label: "View mode",
      card: "Card view",
      list: "List view",
      count: "{count} stories",
    },
  },
  online: {
    meta: {
      title: "Cops and Robbers Online - Play in your browser",
      description: "Play Cops and Robbers online with friends, no install. Up to 8 players, 3 minutes a round.",
    },
    title: ["Cops and Robbers", "Online"],
    lead: "Play with friends online, right in your browser.",
    play: "Play with friends",
    stats: [
      ["Players", "Up to 8"],
      ["Round", "3 min"],
      ["Install", "Not needed"],
    ],
    note: { soon: "Still in the works", pauseUntil: "Come back around {t} (KST)", pause: "Down for maintenance. Come back in a bit" },
    features: [
      { title: "Pick your side", body: "In the lobby, walk into the cops' zone or the robbers' zone." },
      { title: "Hide or seek", body: "In a bush, you can't be seen from afar. Step out and you're spotted." },
      { title: "Robbers revealed every 35 seconds", body: "Each robber's spot flashes on the cops' map for a moment." },
      { title: "Free your teammates", body: "Get caught and you go to jail. A teammate standing at the door for a moment sets you free." },
    ],
    again: "Grab your friends and play",
    app: {
      iconAlt: "Cops and Robbers app icon",
      title: "Play it for real, outside",
      body: "Run around a park or a field with your friends.",
      link: "See how it works",
    },
  },
  legal: {
    effectiveDate: "Effective date",
    history: "Previous versions",
    historyLead: "You can view previous versions below.",
    period: "In effect from {from} to {until}",
    archivedNotice: "This is a previous version, in effect from {from} to {until}.",
    viewCurrent: "View the current version",
    archivedTitle: "{title} (previous version, effective {from})",
  },
};

const ja: Messages = {
  home: {
    meta: {
      title: "ケイドロ - GPSリアル鬼ごっこ",
      description:
        "子どもの頃に遊んだケイドロが、リアルタイムGPSで進化。スマホひとつで友達を集めて、最大150人でワイワイ遊ぼう。",
    },
    hero: {
      title1: "ケイドロが、",
      title2: "帰ってきた。",
      lead: "スマホひとつで準備OK。",
      leadExtra: "進行はアプリにおまかせ。",
      free: "無料",
      players: "最大150人で一緒にプレイ",
      timeLeft: "残り時間",
    },
    characters: {
      title: "警察か、泥棒か。",
      sub: "カードをタップしてチームを選ぼう。",
      selected: "選択中",
      pick: "チーム選択",
      pickAria: "{name}チームを選択",
      cop: {
        name: "警察",
        summary: "残された足跡を追って、泥棒を全員つかまえろ。",
      },
      robber: {
        name: "泥棒",
        summary: "つかまらずに、制限時間まで逃げ切れ。",
      },
    },
    how: {
      title1: "アプリを開いて、",
      title2: "公園に出るだけ",
      sub: "友達にコードを送って、地図にエリアを描けばすぐスタート。",
      steps: [
        {
          title: "ルームを作る",
          description:
            "ルームを作れば、6桁の招待コードとQRがすぐに発行される。",
        },
        {
          title: "エリアを描く",
          description: "地図をドラッグして、プレイエリアと牢屋を描く。",
        },
        {
          title: "チームを決める",
          description: "ニックネームを決めて、警察か泥棒を自由に選ぶ。",
        },
        {
          title: "あとは走るだけ",
          description:
            "制限時間内に全員つかまえれば警察の勝ち。一人でも逃げ切れば泥棒の勝ち。",
        },
      ],
    },
    features: {
      title1: "面倒なことはアプリに任せて、",
      title2: "遊ぶだけ",
      sub: "位置共有、エリア判定、チームチャットまで、ぜんぶアプリにおまかせ。あとはゲームを楽しむだけ。",
      items: [
        {
          title: "一定間隔で残る足跡",
          description:
            "設定した間隔ごとに、泥棒の位置が足跡として残る。警察が追える唯一の手がかり。",
        },
        {
          title: "エリアと牢屋を指先で",
          description:
            "地図をドラッグして、プレイエリアと牢屋を設定。エリアの外に出ると、すぐに警告が届く。",
        },
        {
          title: "仲間だけのチームチャット",
          description:
            "警察は警察同士、泥棒は泥棒同士。作戦が相手チームに漏れない。",
        },
      ],
    },
    finalCta: {
      title: "さあ、公園で会おう",
      lead1: "一緒に走る仲間がいない？コミュニティで集めればOK。",
      lead2: "持ち物はスマホひとつ。それで準備完了。",
      demoCta: "インストール前に1プレイ",
    },
    minigame: {
      badge: "🧀 ミニゲーム",
      title: "チーズ銀行が襲われた！",
      description: "警察を助けて、街に隠れたチーズ泥棒を全員つかまえて。",
      button: "つかまえに行く",
      wantedName: "チーズ泥棒",
      bounty: "賞金 🧀 たっぷり",
    },
    v3Notice: {
      badge: "v3の新機能",
      tag: "v3アップデート",
      title: "ケイドロが大きく新しくなりました",
      highlights: [
        {
          title: "一緒に走る仲間を探せます",
          description:
            "人数が足りなくても大丈夫。募集の投稿から場所・時間・残り枠を見て、気になるゲームに参加できます。",
        },
        {
          title: "約束はグループチャットで",
          description:
            "参加すると同じゲームの仲間とチャットが開きます。連絡先を交換しなくても、約束もゲームへの招待もそこで完結します。",
        },
      ],
      demoCta: "まずウェブで体験する",
      close: "閉じる",
    },
  },
  demo: {
    meta: {
      title: "インストール不要で1プレイ体験",
      description:
        "ケイドロをブラウザでそのまま1プレイ。部屋に入って足あとを追い、QRで逮捕まで、実際のアプリ画面のまま遊べます。",
    },
  },
  game: {
    meta: {
      title: "ケイドロ（警泥）の遊び方 - ルールとゲーム紹介",
      description:
        "ケイドロのルールをチーム分けから牢屋・脱獄、勝敗まで整理。狭まるエリアや足跡、QR逮捕、チームMVPなど、アプリの機能も実際の画面で紹介します。",
    },
    hero: {
      title1: "ケイドロは、",
      title2: "こうやって遊ぶ",
      lead: "子どものころのケイドロをそのまま走って、判定はアプリにおまかせ。",
    },
    rules: {
      heading: "ケイドロの遊び方",
      sub: "昔ながらのルールそのまま。進行はアプリにおまかせ。",
      appLabel: "アプリでは",
      steps: [
        {
          title: "チームに分かれる",
          play: "警察と泥棒、ふたつのチームに分かれます。泥棒を少し多めにすると追いかけっこが盛り上がります。",
          app: "招待コードを送れば友だちが同じ部屋に入ってきて、チームは待機室で変えられます。",
        },
        {
          title: "エリアを決める",
          play: "どこまで逃げていいか範囲を決めて、つかまった泥棒が入る牢屋の場所をひとつ選びます。",
          app: "ホストが地図に円かピンでエリアを描き、その外に出ると画面がロックされます。",
        },
        {
          title: "泥棒が先に逃げる",
          play: "警察が数を数えている間に、泥棒は散らばって隠れます。",
          app: "決めた時間だけ警察を待たせて、サイレンが鳴ったら出動です。",
        },
        {
          title: "追いかけて、つかまえる",
          play: "泥棒を見つけたら走って追いかけ、タッチします。",
          app: "タッチしたあと泥棒のQRまでスキャンして逮捕になるので、つかまった・つかまってないでもめません。泥棒の位置は決まった間隔で足跡として表示されます。",
        },
        {
          title: "牢屋と救出",
          play: "つかまった泥棒は牢屋で待ちます。仲間がこっそり近づいてタッチすれば復活、また逃げられます。",
          app: "仲間にタッチしてもらって牢屋の外に出ると、3秒後にアプリが脱獄として処理します。",
        },
        {
          title: "勝負が決まる",
          play: "泥棒を全員つかまえたら警察の勝ち。時間切れまでひとりでも逃げ切れば泥棒の勝ちです。",
          app: "残り時間と残りの泥棒の数は、画面にもロック画面にも表示され続けます。",
        },
      ],
    },
    features: [
      {
        title: "地図にエリアを描く",
        description:
          "ホストが地図に円を描くかピンを打ってエリアを決め、その中に牢屋の場所も選びます。",
        checks: [
          "円かピンでエリアを設定",
          "エリア内に牢屋を指定",
          "エリアを出ると画面がロック",
        ],
      },
      {
        title: "エリアがだんだん狭まる",
        description:
          "ホストがエリア縮小をオンにすると、円形のエリアがゲーム中に4回に分けて狭まり、終盤ほど隠れる場所が減っていきます。",
        checks: [
          "オン・オフはホストが選ぶ",
          "次の縮小までの残り時間を表示",
          "エリアの外に長くいる泥棒は自動で逮捕",
        ],
      },
      {
        title: "一定間隔で足跡が残る",
        description:
          "ホストが決めた間隔ごとに、泥棒の位置が足跡として公開される。公開前に動かないと、そのままつかまることも。",
        checks: [
          "公開間隔は0〜30分から選択",
          "次の公開までの残り時間を表示",
        ],
      },
      {
        title: "タッチしてQRで逮捕",
        description:
          "泥棒にタッチしてQRをスキャンすれば、その場で逮捕です。QRは30秒しか使えないので、スクショしておくことはできません。",
        checks: ["スキャン一回ですぐ逮捕", "泥棒はメニューからマイQRを開く"],
      },
      {
        title: "仲間だけで作戦会議",
        description:
          "警察は警察同士、泥棒は泥棒同士で話した内容は、相手チームには見えません。",
        checks: [
          "チームチャットと全体チャットを分けて表示",
          "地図を長押ししてチームにピン",
          "メッセージをリアルタイムで共有",
        ],
      },
      {
        title: "終わったらチームごとにMVP",
        description:
          "ゲームが終わるとチームごとにMVPをひとり選び、走った距離と通ったルートも地図に残してくれます。",
        checks: [
          "警察はいちばん多く逮捕した人、泥棒はいちばんつかまらなかった人",
          "移動距離とルートの地図",
          "結果を画像で保存・シェア",
        ],
      },
      {
        title: "近所で一緒に走る仲間を探そう",
        description:
          "人数が足りなければ近くの募集をのぞいてみて。気になるゲームに参加すれば、チャットルームですぐに約束を決められます。",
        checks: [
          "場所・時間・人数をひと目で確認",
          "コメントで先に質問できる",
          "参加したらすぐチャットに入れる",
        ],
      },
    ],
    faqHeading: "よくある質問",
    faq: [
      {
        question: "何人で遊べますか？",
        answer:
          "2人から最大150人まで遊べて、警察と泥棒が1人ずついればスタートできます。",
      },
      {
        question: "1試合どれくらいかかりますか？",
        answer: "ホストが10分から3時間まで決められて、はじめてなら30分がおすすめです。",
      },
      {
        question: "泥棒の位置はどうやって警察に公開されますか？",
        answer:
          "リアルタイムでずっと見えるわけではなく、ホストが決めた間隔ごとに警察の地図に足跡として表示されます。",
      },
      {
        question: "警察は泥棒をどうやってつかまえますか？",
        answer:
          "泥棒に追いついてタッチしたあと、泥棒の画面のQRをスキャンすると逮捕できます。",
      },
      {
        question: "牢屋に入ったら終わりですか？",
        answer: "いいえ。仲間にタッチしてもらえば、牢屋の外に出てまた逃げられます。",
      },
      {
        question: "エリアが狭くなることもありますか？",
        answer:
          "ホストがエリア縮小をオンにすると、円形のエリアがゲーム中に4回に分けて狭まります。ピンで描いたエリアでは使えません。",
      },
      {
        question: "MVPはどうやって決まりますか？",
        answer:
          "警察はいちばん多く逮捕した人、泥棒はいちばんつかまらなかった人がMVPになり、同じ場合はより多く走った人が選ばれます。",
      },
      {
        question: "味方同士だけでチャットできますか？",
        answer:
          "チームチャットは自分のチームだけが見られて、みんなと話したいときは全体チャットを使えます。",
      },
      {
        question: "iPhoneとAndroidは一緒に遊べますか？",
        answer: "はい、機種に関係なく一緒にプレイできます。",
      },
      {
        question: "位置情報は安全に扱われますか？",
        answer:
          "位置情報はゲーム中だけ取得し、ゲームが終わるとすぐに止まります。",
      },
      {
        question: "無料ですか？",
        answer: "はい、無料でダウンロードして遊べます。",
      },
    ],
  },
  team: {
    meta: {
      title: "チーム・トンシムについて",
      description:
        "チーム・トンシムは、遊びで人と人をつなぐチーム。位置情報ベースのオフラインゲーム「ケイドロ」を企画・開発しています。",
    },
    hero: {
      eyebrow: "チーム・トンシム",
      title1: "遊びで人と人を",
      title2: "つなぐ",
      para1:
        "チーム・トンシムは、誰もが一緒に笑い、走り回り、新しい思い出をつくれる遊びを生み出すチームです。遊びを通じて人と人をつなぐことを目指しています。",
      para2:
        "主なサービス「ケイドロ」は、リアルタイムの位置情報を使った追跡と逃走のゲームで、ゲームの枠を超えた没入感のあるオフライン体験を届けます。",
    },
    company: {
      label: "会社情報",
      rows: [
        { label: "設立", value: "2026年4月" },
        { label: "代表", value: "チョン・サンヒ" },
        { label: "チーム規模", value: "8名" },
        { label: "事業分野", value: "位置情報を活用したオフラインゲーム" },
        { label: "主なサービス", value: "ケイドロ" },
        {
          label: "お問い合わせ",
          value: "copsnro66ers@gmail.com",
          href: "mailto:copsnro66ers@gmail.com",
        },
      ],
    },
    preview: {
      eyebrow: "つくる人たち",
      heading: "8人で一緒につくっています",
      origin:
        "サンヒの「ケイドロ、一緒につくらない?」の一言から始まったチームです。",
      membersButton: "メンバーを見る",
    },
    records: {
      historyHeading: "これまでの歩み",
      awardsHeading: "受賞・選定歴",
    },
    moments: {
      eyebrow: "実際のフィールドで",
      heading: "自分たちの足で、つくって検証する",
      sub: "ユーザーと何度もテストプレイを重ね、体験を磨いてきました。",
      captions: [
        { label: "第1回QA", date: "2026.03" },
        { label: "第2回QA", date: "2026.04" },
      ],
    },
  },
  blog: {
    meta: {
      title: "ストーリー",
      description:
        "ケイドロを作るチーム・トンシムが綴る開発の裏側、イベントレポート、遊び方のヒント。",
    },
    title: "ストーリー",
    lead: "ケイドロを作りながら残してきた足あと。\n開発の裏側やイベントのレポートを綴っていきます。",
    empty: {
      title: "最初のストーリーを準備しています",
      description:
        "ケイドロをもっと楽しむコツ、開催したイベントのレポート、開発の裏側などをお届けする予定です。",
    },
    related: "こちらもどうぞ",
    view: {
      label: "表示方法",
      card: "カード表示",
      list: "リスト表示",
      count: "記事 {count}本",
    },
  },
  online: {
    meta: {
      title: "ケイドロ オンライン - ブラウザですぐ遊べる",
      description: "インストールなしで、友だちとオンラインでケイドロ。最大8人、1回3分。",
    },
    title: ["ケイドロ", "オンライン"],
    lead: "外に出なくても、オンラインで遊べます。",
    play: "友だちと1回遊ぶ",
    stats: [
      ["人数", "最大8人"],
      ["1回", "3分"],
      ["インストール", "不要"],
    ],
    note: { soon: "まだ準備中です", pauseUntil: "{t}ごろにまた来てください", pause: "メンテナンス中です。少し待ってまた来てください" },
    features: [
      { title: "チームを選ぼう", body: "ロビーで警察エリアか泥棒エリアに入ります。" },
      { title: "隠れる? 探す?", body: "茂みに入ると遠くからは見えません。外に出るとばれます。" },
      { title: "35秒ごとに位置が公開", body: "泥棒の位置が警察の地図に少しの間表示されます。" },
      { title: "仲間を助けよう", body: "捕まると牢屋へ。仲間が扉の前に少し立つと出られます。" },
    ],
    again: "友だちと遊んでみよう",
    app: {
      iconAlt: "ケイドロアプリのアイコン",
      title: "外でも遊んでみよう",
      body: "公園やグラウンドで、友だちと走り回って遊べます。",
      link: "遊び方を見る",
    },
  },
  legal: {
    effectiveDate: "施行日",
    history: "過去のバージョン",
    historyLead: "過去のバージョンは以下からご確認いただけます。",
    period: "{from}から{until}まで適用",
    archivedNotice: "{from}から{until}まで適用されていた過去のバージョンです。",
    viewCurrent: "現在のバージョンを見る",
    archivedTitle: "{title}（過去のバージョン、{from}施行）",
  },
};

const MESSAGES: Record<Locale, Messages> = { ko, en, ja };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
