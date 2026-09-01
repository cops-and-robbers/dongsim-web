import type { Locale } from "@/lib/i18n/config";

// 폰 목업 안에 들어가는 화면 텍스트(로케일별). 앱 l10n 의 실제 문구를 그대로 쓴다.
export type ChatBubbleData = {
  name?: string;
  text: string;
  side: "left" | "right";
};

export type MockupText = {
  zone: {
    toggleDistance: string;
    togglePin: string;
    desc: string;
    radiusPrefix: string;
    radiusValue: string;
    button: string;
  };
  location: { timer: string; countdown: string };
  qr: { scanTitle: string; title: string; message: string; close: string };
  chat: { title: string; input: string; bubbles: ChatBubbleData[] };
  v3: {
    create: {
      title: string;
      sub: string;
      label: string;
      value: string;
      valueStep: string;
      hint: string;
      next: string;
      chips: [string, string, string];
    };
    nav: { home: string; community: string; my: string };
    communityList: {
      pageTitle: string;
      posts: {
        status: string;
        title: string;
        location: string;
        date: string;
        count: string;
      }[];
    };
    communityChat: {
      roomTitle: string;
      bubbles: ChatBubbleData[];
    };
  };
};

export const MOCKUP_TEXT: Record<Locale, MockupText> = {
  ko: {
    zone: {
      toggleDistance: "거리로 설정",
      togglePin: "핀으로 설정",
      desc: "게임이 진행될 전체 구역의 크기를 설정해요",
      radiusPrefix: "반경",
      radiusValue: "500m",
      button: "완료",
    },
    location: {
      timer: "18:42",
      countdown: "다음 도둑 위치 공개까지 2:41",
    },
    qr: {
      scanTitle: "도둑의 수배 QR을 스캔하세요",
      title: "수배 QR",
      message: "경찰에게 QR을 보여주세요",
      close: "닫기",
    },
    v3: {
      create: {
        title: "기본 정보를 설정해요",
        sub: "게임을 진행할 때, 꼭 필요한 정보들이에요",
        label: "참여 인원",
        value: "50명",
        valueStep: "5명",
        hint: "최소 2명부터 게임 진행이 가능해요",
        next: "다음",
        chips: ["+ 5명", "+ 10명", "+ 20명"],
      },
      nav: { home: "홈", community: "커뮤니티", my: "마이페이지" },
      communityList: {
        pageTitle: "커뮤니티",
        posts: [
          {
            status: "모집중",
            title: "어린이대공원에서 4시에 뛰실 분",
            location: "광진구 능동",
            date: "8월 30일 오후 4시",
            count: "5/8",
          },
          {
            status: "모집중",
            title: "한강공원 야간 술래잡기",
            location: "여의도 한강공원",
            date: "8월 31일 오후 7시",
            count: "3/10",
          },
        ],
      },
      communityChat: {
        roomTitle: "어린이대공원에서 4시에 뛰실 분",
        bubbles: [
          { name: "솔", text: "내일 몇 시에 모여요?", side: "left" },
          { text: "4시까지 정문 앞이요!", side: "right" },
          { name: "준", text: "물 챙겨갈게요", side: "left" },
          { text: "좋아요, 내일 봬요", side: "right" },
        ],
      },
    },
    chat: {
      title: "팀 채팅",
      input: "채팅을 입력하세요",
      bubbles: [
        { name: "상희", text: "공원 입구로 집결하자", side: "left" },
        { name: "혜림", text: "도둑 2명 북쪽 근처", side: "left" },
        { text: "돌아서 접근할게", side: "right" },
        { name: "지희", text: "1명 체포 완료", side: "left" },
        { text: "굿, 나머지 찾는 중", side: "right" },
      ],
    },
  },
  en: {
    zone: {
      toggleDistance: "Set by distance",
      togglePin: "Set by pins",
      desc: "Set up the size of the total game area where the game will take place",
      radiusPrefix: "Radius",
      radiusValue: "500m",
      button: "Confirm",
    },
    location: {
      timer: "18:42",
      countdown: "Until next Robber location reveal: 2:41",
    },
    qr: {
      scanTitle: "Scan the Robber's wanted QR code",
      title: "Wanted QR code",
      message: "Please show the QR code to the Cops",
      close: "Close",
    },
    v3: {
      create: {
        title: "Set up basic information",
        sub: "This information is essential for running the game",
        label: "Player count",
        value: "50 people",
        valueStep: "5 people",
        hint: "A minimum of 2 players is required to play the game",
        next: "Next",
        chips: ["+ 5", "+ 10", "+ 20"],
      },
      nav: { home: "Home", community: "Community", my: "My Page" },
      communityList: {
        pageTitle: "Community",
        posts: [
          {
            status: "Open",
            title: "Tag at Central Park, 4 PM",
            location: "Upper West Side",
            date: "Aug 30, 4:00 PM",
            count: "5/8",
          },
          {
            status: "Open",
            title: "Night tag at Brooklyn Bridge Park",
            location: "DUMBO, Brooklyn",
            date: "Aug 31, 7:00 PM",
            count: "3/10",
          },
        ],
      },
      communityChat: {
        roomTitle: "Tag at Central Park, 4 PM",
        bubbles: [
          { name: "Sol", text: "What time are we meeting?", side: "left" },
          { text: "By the fountain at 4!", side: "right" },
          { name: "Jun", text: "I'll bring some water", side: "left" },
          { text: "Great, see you tomorrow", side: "right" },
        ],
      },
    },
    chat: {
      title: "Team chat",
      input: "Enter chat message",
      bubbles: [
        { name: "Alex", text: "Regroup at the park entrance", side: "left" },
        { name: "Mia", text: "2 robbers near the north side", side: "left" },
        { text: "I'll circle around", side: "right" },
        { name: "Sam", text: "One caught", side: "left" },
        { text: "Nice, finding the rest", side: "right" },
      ],
    },
  },
  ja: {
    zone: {
      toggleDistance: "距離で設定",
      togglePin: "ピンで設定",
      desc: "ゲームを行うエリア全体の大きさを設定します",
      radiusPrefix: "半径",
      radiusValue: "500m",
      button: "完了",
    },
    location: {
      timer: "18:42",
      countdown: "次の泥棒の位置公開まで 2:41",
    },
    qr: {
      scanTitle: "泥棒の指名手配QRをスキャンしてください",
      title: "指名手配QR",
      message: "警察にQRコードを見せてください",
      close: "閉じる",
    },
    v3: {
      create: {
        title: "基本情報を設定します",
        sub: "ゲームを進行する際、必ず必要な情報です",
        label: "参加人数",
        value: "50人",
        valueStep: "5人",
        hint: "最低2人からゲームの進行が可能です",
        next: "次へ",
        chips: ["+ 5人", "+ 10人", "+ 20人"],
      },
      nav: { home: "ホーム", community: "コミュニティ", my: "マイページ" },
      communityList: {
        pageTitle: "コミュニティ",
        posts: [
          {
            status: "募集中",
            title: "代々木公園で16時に走る人",
            location: "渋谷区 代々木",
            date: "8月30日 16:00",
            count: "5/8",
          },
          {
            status: "募集中",
            title: "多摩川河川敷でナイトケイドロ",
            location: "世田谷区 二子玉川",
            date: "8月31日 19:00",
            count: "3/10",
          },
        ],
      },
      communityChat: {
        roomTitle: "代々木公園で16時に走る人",
        bubbles: [
          { name: "ソル", text: "明日は何時に集合ですか？", side: "left" },
          { text: "16時に原宿門で！", side: "right" },
          { name: "ジュン", text: "水を持っていきますね", side: "left" },
          { text: "いいですね、また明日", side: "right" },
        ],
      },
    },
    chat: {
      title: "チームチャット",
      input: "チャットを入力してください",
      bubbles: [
        { name: "ハル", text: "公園の入口に集合", side: "left" },
        { name: "リン", text: "北側に泥棒が2人", side: "left" },
        { text: "回り込むね", side: "right" },
        { name: "ソラ", text: "1人つかまえた", side: "left" },
        { text: "ナイス、残りを探す", side: "right" },
      ],
    },
  },
};
