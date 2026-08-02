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
      players: "최대 50명까지 함께 플레이",
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
      lead1: "친구에게 초대 코드나 QR만 보내면 준비 끝이에요.",
      lead2: "가까운 공원으로 나가볼까요?",
    },
    minigame: {
      badge: "🧀 미니게임",
      title: "치즈 은행이 털렸어요!",
      description: "경찰을 도와, 곳곳에 숨어든 치즈 도둑을 모두 검거해주세요.",
      button: "잡으러 가기",
      wantedName: "치즈 도둑",
      bounty: "현상금 🧀 듬뿍",
    },
  },
  game: {
    meta: {
      title: "게임 소개",
      description:
        "경찰과 도둑(경도) - GPS와 실시간 지도가 진행을 관리하는 위치 기반 술래잡기. 지도에 구역 그리기, 발자국 추적, QR 체포, 팀 채팅까지 4가지 핵심 기능을 소개합니다.",
    },
    hero: {
      title1: "경찰과 도둑,",
      title2: "이렇게 플레이해요",
      lead: "구역 그리고, 발자국 쫓고, QR로 잡고, 팀끼리 대화까지. 앱 하나에 다 들어 있어요.",
    },
    features: [
      {
        title: "지도에 구역을 그려요",
        description:
          "호스트가 지도를 드래그하면 원형 플레이 구역이 그려져요. 감옥 위치까지 손끝으로 지정하고 바로 게임을 시작하세요.",
        checks: [
          "드래그로 원형 구역 자유 설정",
          "구역 내부에 감옥 영역 지정",
          "이탈 시 화면 잠김",
        ],
      },
      {
        title: "일정 주기마다 발자국이 찍혀요",
        description:
          "방장이 정한 주기마다 도둑의 위치가 발자국으로 공개돼요. 공개 전에 자리를 옮기지 않으면 그대로 잡힐 수 있어요.",
        checks: [
          "방장이 정한 주기로 위치 공개",
          "이전 발자국은 다음 공개까지 유지",
          "다음 공개까지 실시간 카운트",
        ],
      },
      {
        title: "QR 스캔으로 공정하게 체포해요",
        description:
          "경찰이 도둑의 QR을 스캔하는 순간 바로 체포돼요. 실제로 마주쳐야 성립되니까 공정한 경기가 이어져요.",
        checks: ["스캔 한 번이면 바로 체포", "도둑이 본인 QR을 직접 표시"],
      },
      {
        title: "팀원에게만 닿는 대화",
        description:
          "경찰은 경찰끼리, 도둑은 도둑끼리. 전략이 상대 팀으로 새어나가지 않아요.",
        checks: [
          "경찰·도둑 채널 완전 분리",
          "전체 공지 채널 별도 제공",
          "실시간 메시지 동기화",
        ],
      },
    ],
    faqHeading: "자주 묻는 질문",
    faq: [
      {
        question: "몇 명이서 할 수 있나요?",
        answer:
          "최대 50명까지 가능합니다. 경찰 팀과 도둑 팀으로 나눠서 진행합니다.",
      },
      {
        question: "한 판에 얼마나 걸리나요?",
        answer: "기본 30분이고, 방장이 더 짧게도 길게도 정할 수 있습니다.",
      },
      {
        question: "도둑 위치는 경찰한테 어떻게 공개되나요?",
        answer:
          "방장이 정한 주기마다 도둑의 위치가 경찰 지도에 발자국으로 표시됩니다.",
      },
      {
        question: "경찰은 도둑을 어떻게 잡나요?",
        answer: "도둑을 따라잡은 뒤, 도둑 화면의 QR을 스캔하면 체포됩니다.",
      },
      {
        question: "감옥에 갇히면 끝인가요?",
        answer: "아닙니다. 갇혀도 팀원이 구해주면 다시 도망칠 수 있습니다.",
      },
      {
        question: "같은 팀끼리만 대화할 수 있나요?",
        answer:
          "경찰과 도둑의 채팅방이 분리되어 있어, 상대 팀은 대화를 볼 수 없습니다.",
      },
      {
        question: "아이폰과 안드로이드가 같이 할 수 있나요?",
        answer: "네, 기종과 관계없이 함께 플레이할 수 있습니다.",
      },
      {
        question: "위치 정보는 안전하게 처리되나요?",
        answer:
          "게임이 진행되는 동안에만 위치를 수집하고, 게임이 끝나면 멈춥니다. 자세한 내용은 위치정보 이용약관에서 확인할 수 있습니다.",
        link: { label: "위치정보 이용약관 보기", href: "/location" },
      },
      {
        question: "무료인가요?",
        answer: "네, 무료로 다운로드하여 플레이할 수 있습니다.",
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
      history: [
        { date: "2026.03.24", title: "경찰과 도둑 1차 QA 진행" },
        { date: "2026.04.08", title: "동심지키미 설립" },
        { date: "2026.04.28", title: "경찰과 도둑 2차 QA 진행" },
        {
          date: "2026.07.04",
          title: "서울게임타운 박람회 ‘경찰과 도둑’ 부스 참여",
        },
      ],
      awardsHeading: "수상 및 선정 이력",
      awards: [
        { date: "2026.05.08", title: "세종 창업 아이디어 리그", award: "대상" },
        {
          date: "2026.03.06",
          title: "세종대학교 아롬 데모데이",
          award: "특별상",
        },
        {
          date: "2026.07",
          title: "세종대학교 하반기 입주공모전",
          award: "우수 창업 아이템상",
        },
        {
          date: "2026.07",
          title: "세종대학교 창업 동아리 SSUP",
          award: "선정",
        },
      ],
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
};

const en: Messages = {
  home: {
    meta: {
      title: "Cops and Robbers - Real-Life GPS Tag",
      description:
        "The cops-and-robbers chase you grew up with, now powered by live GPS. Grab your friends, set your zone, and play with up to 50 people, all on your phone.",
    },
    hero: {
      title1: "Cops and Robbers,",
      title2: "back in real life",
      lead: "No gear needed. Just your phone.",
      leadExtra: "The app handles the rest.",
      free: "Free",
      players: "Up to 50 players per game",
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
      lead1: "Send your friends an invite code or QR. That's the whole setup.",
      lead2: "Ready to head to the nearest park?",
    },
    minigame: {
      badge: "🧀 Mini-game",
      title: "The cheese bank got robbed!",
      description: "Help the cops catch every cheese thief hiding around town.",
      button: "Go catch them",
      wantedName: "Cheese Thief",
      bounty: "Reward: 🧀 loads",
    },
  },
  game: {
    meta: {
      title: "How to Play - Cops and Robbers",
      description:
        "Cops and Robbers is a real-life GPS tag game. Draw your zone, chase the footprints, tag by QR scan, and chat with your team - here are the four features that run the whole game.",
    },
    hero: {
      title1: "Cops and Robbers,",
      title2: "here's how it plays",
      lead: "Draw your zone, track the footprints, scan to catch, and chat with your team. All in one app.",
    },
    features: [
      {
        title: "Draw your zone on the map",
        description:
          "The host drags on the map to draw a circular play area. Place the jail and start playing.",
        checks: [
          "Freely draw a circular zone by dragging",
          "Mark a jail area inside the zone",
          "The screen locks if you leave the zone",
        ],
      },
      {
        title: "Footprints drop on a timer",
        description:
          "At the interval the host sets, each robber's location is revealed as a footprint. Keep moving before the next reveal, or you might get caught.",
        checks: [
          "Location revealed on the host's interval",
          "Old footprints stay until the next drop",
          "Live countdown to the next reveal",
        ],
      },
      {
        title: "Catch with a QR scan",
        description:
          "The moment a cop scans a robber's QR, they're caught. It only counts face to face, so every match stays fair.",
        checks: [
          "One scan and they're caught",
          "Robbers show their own QR",
        ],
      },
      {
        title: "Team-only chat",
        description:
          "Cops with cops, robbers with robbers. Your strategy never leaks to the other side.",
        checks: [
          "Separate channels for each team",
          "A separate channel for all-player notices",
          "Messages update instantly",
        ],
      },
    ],
    faqHeading: "Frequently asked questions",
    faq: [
      {
        question: "How many people can play?",
        answer:
          "Up to 50. You split into a cops team and a robbers team.",
      },
      {
        question: "How long is one game?",
        answer:
          "30 minutes by default, and the host can make it shorter or longer.",
      },
      {
        question: "How is a robber's location shown to the cops?",
        answer:
          "At the interval the host sets, each robber's location shows up as a footprint on the cops' map.",
      },
      {
        question: "How do cops catch a robber?",
        answer:
          "Catch up to the robber, then scan the QR on their screen to make the arrest.",
      },
      {
        question: "Is it over once you're in jail?",
        answer:
          "No. Even in jail, a teammate can free you and you're back on the run.",
      },
      {
        question: "Can only teammates chat with each other?",
        answer:
          "Cops and robbers have separate chat rooms, so the other team can't see your messages.",
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
      history: [
        { date: "2026.03.24", title: "Cops and Robbers - first QA round" },
        { date: "2026.04.08", title: "Team Dongsim founded" },
        { date: "2026.04.28", title: "Cops and Robbers - second QA round" },
        {
          date: "2026.07.04",
          title: "Seoul Game Town Expo - Cops and Robbers booth",
        },
      ],
      awardsHeading: "Awards & selections",
      awards: [
        {
          date: "2026.05.08",
          title: "Sejong Startup Idea League",
          award: "Grand Prize",
        },
        {
          date: "2026.03.06",
          title: "Sejong University Arom Demo Day",
          award: "Special Award",
        },
        {
          date: "2026.07",
          title: "Sejong University H2 Residency Contest",
          award: "Outstanding Startup Project",
        },
        {
          date: "2026.07",
          title: "Sejong University startup club SSUP",
          award: "Accepted",
        },
      ],
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
};

const ja: Messages = {
  home: {
    meta: {
      title: "ケイドロ - GPSリアル鬼ごっこ",
      description:
        "子どもの頃に遊んだケイドロが、リアルタイムGPSで進化。スマホひとつで友達を集めて、最大50人でワイワイ遊ぼう。",
    },
    hero: {
      title1: "ケイドロが、",
      title2: "帰ってきた。",
      lead: "スマホひとつで準備OK。",
      leadExtra: "進行はアプリにおまかせ。",
      free: "無料",
      players: "最大50人で一緒にプレイ",
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
      lead1: "友達に招待コードかQRを送るだけで準備完了。",
      lead2: "近くの公園に、出かけてみない？",
    },
    minigame: {
      badge: "🧀 ミニゲーム",
      title: "チーズ銀行が襲われた！",
      description: "警察を助けて、街に隠れたチーズ泥棒を全員つかまえて。",
      button: "つかまえに行く",
      wantedName: "チーズ泥棒",
      bounty: "賞金 🧀 たっぷり",
    },
  },
  game: {
    meta: {
      title: "遊び方 - ケイドロ",
      description:
        "ケイドロはGPSを使ったリアル鬼ごっこ。エリアを描いて、足跡を追って、QRでつかまえて、チームでチャット。ゲームを支える4つの機能を紹介します。",
    },
    hero: {
      title1: "ケイドロは、",
      title2: "こうやって遊ぶ",
      lead: "エリアを描いて、足跡を追って、QRでつかまえて、仲間と連携。ぜんぶアプリひとつに。",
    },
    features: [
      {
        title: "地図にエリアを描く",
        description:
          "ホストが地図をドラッグして、プレイエリアを作る。牢屋の位置も指先で決めて、すぐにゲーム開始。",
        checks: [
          "ドラッグで円形エリアを自由に設定",
          "エリア内に牢屋エリアを指定",
          "エリアを出ると画面がロック",
        ],
      },
      {
        title: "一定間隔で足跡が残る",
        description:
          "ホストが決めた間隔ごとに、泥棒の位置が足跡として公開される。公開前に動かないと、そのままつかまることも。",
        checks: [
          "ホストが決めた間隔で位置を公開",
          "前の足跡は次の公開まで残る",
          "次の公開までリアルタイムでカウント",
        ],
      },
      {
        title: "QRスキャンでフェアに逮捕",
        description:
          "警察が泥棒のQRをスキャンした瞬間に逮捕。実際に出会わないと逮捕できないから、最後までフェア。",
        checks: [
          "スキャン一回ですぐ逮捕",
          "泥棒が自分のQRを提示",
        ],
      },
      {
        title: "仲間だけのチームチャット",
        description:
          "警察は警察同士、泥棒は泥棒同士。作戦が相手チームに漏れない。",
        checks: [
          "警察・泥棒チャンネルを完全分離",
          "全体アナウンス用チャンネルも用意",
          "メッセージをリアルタイムで共有",
        ],
      },
    ],
    faqHeading: "よくある質問",
    faq: [
      {
        question: "何人で遊べますか？",
        answer:
          "最大50人まで。警察チームと泥棒チームに分かれて進めます。",
      },
      {
        question: "1試合どれくらいかかりますか？",
        answer: "基本は30分。ホストがもっと短くも長くも設定できます。",
      },
      {
        question: "泥棒の位置はどうやって警察に公開されますか？",
        answer:
          "ホストが決めた間隔ごとに、泥棒の位置が警察の地図に足跡として表示されます。",
      },
      {
        question: "警察は泥棒をどうやってつかまえますか？",
        answer:
          "泥棒に追いついたら、泥棒の画面のQRをスキャンすると逮捕できます。",
      },
      {
        question: "牢屋に入ったら終わりですか？",
        answer: "いいえ。つかまっても、味方が助ければまた逃げられます。",
      },
      {
        question: "味方同士だけでチャットできますか？",
        answer:
          "警察と泥棒のチャットは分かれているので、相手チームには見えません。",
      },
      {
        question: "iPhoneとAndroidは一緒に遊べますか？",
        answer: "はい、機種に関係なく一緒にプレイできます。",
      },
      {
        question: "位置情報は安全に扱われますか？",
        answer:
          "位置情報はゲーム中だけ取得し、ゲームが終わると止まります。",
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
      history: [
        { date: "2026.03.24", title: "ケイドロ 第1回QA実施" },
        { date: "2026.04.08", title: "チーム・トンシム設立" },
        { date: "2026.04.28", title: "ケイドロ 第2回QA実施" },
        {
          date: "2026.07.04",
          title: "ソウルゲームタウン博覧会「ケイドロ」ブース出展",
        },
      ],
      awardsHeading: "受賞・選定歴",
      awards: [
        {
          date: "2026.05.08",
          title: "世宗 創業アイデアリーグ",
          award: "大賞",
        },
        {
          date: "2026.03.06",
          title: "世宗大学 アロム・デモデー",
          award: "特別賞",
        },
        {
          date: "2026.07",
          title: "世宗大学 下半期入居コンペ",
          award: "優秀創業アイテム賞",
        },
        {
          date: "2026.07",
          title: "世宗大学 創業サークルSSUP",
          award: "選定",
        },
      ],
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
};

const MESSAGES: Record<Locale, Messages> = { ko, en, ja };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
