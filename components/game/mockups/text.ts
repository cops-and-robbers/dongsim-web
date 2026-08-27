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
