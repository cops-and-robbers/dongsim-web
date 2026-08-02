import type { Locale } from "./config";

// 부스 미니게임(/play) 문구. 클라이언트 컴포넌트라 페이지 본문 사전(messages.ts)과
// 분리해 번들을 작게 유지한다. 모두 클라이언트끼리 넘기므로 보간에 함수를 써도 된다.
export type PlayText = {
  intro: {
    badge: string;
    title: string;
    descBefore: string;
    thief: string;
    descAfter: string;
    legendGood: string;
    legendBad: string;
    best: string;
    start: string;
  };
  play: {
    score: string;
    comboSuffix: string;
    timeLeft: string;
    wanted: string;
    wantedSub: string;
    holeAria: string;
    wantedAlt: string;
    cop: string;
  };
  result: {
    unit: string;
    caught: string;
    maxCombo: string;
    missed: string;
    people: (n: number) => string;
    rankLine: (total: number, rank: number) => string;
    nickname: string;
    save: string;
    restart: string;
    anon: string;
    downloadCta: string;
    qrAlt: string;
    download: string;
  };
  board: {
    title: string;
    myRank: (total: number, rank: number) => string;
    empty1: string;
    empty2: string;
    unit: string;
    close: string;
  };
};

const ko: PlayText = {
  intro: {
    badge: "미니게임",
    title: "치즈 도둑 검거 작전!",
    descBefore: "30초 안에 치즈 은행의 치즈를 절도한 ",
    thief: "도둑",
    descAfter: "을 최대한 많이 잡으세요!",
    legendGood: "득점",
    legendBad: "감점",
    best: "현재 최고 점수",
    start: "시작하기",
  },
  play: {
    score: "점수",
    comboSuffix: " 콤보",
    timeLeft: "남은 시간",
    wanted: "지명수배",
    wantedSub: "도둑을 전원 검거하라",
    holeAria: "쥐구멍",
    wantedAlt: "지명수배 도둑",
    cop: "경찰!",
  },
  result: {
    unit: "점",
    caught: "검거",
    maxCombo: "최대 콤보",
    missed: "놓침",
    people: (n) => `${n}명`,
    rankLine: (total, rank) => `전체 ${total}명 중 ${rank}위 · 랭킹 보기`,
    nickname: "닉네임",
    save: "기록 저장",
    restart: "다시 도전",
    anon: "익명",
    downloadCta: "앱 다운받고 밖에서 즐겨요 🏃",
    qrAlt: "앱 다운로드 QR",
    download: "앱 다운로드",
  },
  board: {
    title: "검거왕 랭킹",
    myRank: (total, rank) => `전체 ${total}명 중 ${rank}위`,
    empty1: "아직 기록이 없어요.",
    empty2: "첫 검거왕에 도전해보세요!",
    unit: "점",
    close: "닫기",
  },
};

const en: PlayText = {
  intro: {
    badge: "Mini-game",
    title: "Catch the cheese thieves!",
    descBefore: "Catch as many ",
    thief: "cheese thieves",
    descAfter: " as you can in 30 seconds!",
    legendGood: "Points",
    legendBad: "Penalty",
    best: "Current high score",
    start: "Start",
  },
  play: {
    score: "Score",
    comboSuffix: " combo",
    timeLeft: "Time left",
    wanted: "Wanted",
    wantedSub: "Catch every thief",
    holeAria: "Mouse hole",
    wantedAlt: "Wanted thief",
    cop: "Cop!",
  },
  result: {
    unit: "pts",
    caught: "Caught",
    maxCombo: "Max combo",
    missed: "Missed",
    people: (n) => `${n}`,
    rankLine: (total, rank) => `#${rank} of ${total} · View ranking`,
    nickname: "Nickname",
    save: "Save score",
    restart: "Play again",
    anon: "Anon",
    downloadCta: "Get the app and play outside 🏃",
    qrAlt: "App download QR",
    download: "Download app",
  },
  board: {
    title: "Top catchers",
    myRank: (total, rank) => `#${rank} of ${total}`,
    empty1: "No scores yet.",
    empty2: "Be the first top catcher!",
    unit: "pts",
    close: "Close",
  },
};

const ja: PlayText = {
  intro: {
    badge: "ミニゲーム",
    title: "チーズ泥棒をつかまえろ！",
    descBefore: "30秒で、チーズ銀行を襲った",
    thief: "泥棒",
    descAfter: "をできるだけ多くつかまえろ！",
    legendGood: "得点",
    legendBad: "減点",
    best: "現在のハイスコア",
    start: "スタート",
  },
  play: {
    score: "スコア",
    comboSuffix: " コンボ",
    timeLeft: "残り時間",
    wanted: "指名手配",
    wantedSub: "泥棒を全員つかまえろ",
    holeAria: "ねずみ穴",
    wantedAlt: "指名手配の泥棒",
    cop: "警察！",
  },
  result: {
    unit: "点",
    caught: "検挙",
    maxCombo: "最大コンボ",
    missed: "見逃し",
    people: (n) => `${n}人`,
    rankLine: (total, rank) => `${total}人中${rank}位 · ランキングを見る`,
    nickname: "ニックネーム",
    save: "記録を保存",
    restart: "もう一度",
    anon: "匿名",
    downloadCta: "アプリをダウンロードして外で遊ぼう 🏃",
    qrAlt: "アプリダウンロードQR",
    download: "アプリをダウンロード",
  },
  board: {
    title: "検挙王ランキング",
    myRank: (total, rank) => `${total}人中${rank}位`,
    empty1: "まだ記録がありません。",
    empty2: "最初の検挙王を目指そう！",
    unit: "点",
    close: "閉じる",
  },
};

export const PLAY_TEXT: Record<Locale, PlayText> = { ko, en, ja };
