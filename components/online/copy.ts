"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/config";

// 장면 그림 속 글자. 게임 화면과 같은 말을 쓴다(cops-and-robbers-web-game client/i18n.js). 바꾸면 게임 쪽도 같이 본다
const SCENE = {
  ko: {
    jail: "감옥", revealCop: "도둑 위치 공개", revealRob: "내 위치 공개", sec: "초", run: "달리기", catch: "잡기", me: "나",
    names: { cheese: "치즈손", sneak: "살금이", flash: "번개발" },
    caught: (n: string) => `${n}을 잡았어요`,
    revealed: "도둑 위치가 공개됐어요. 빨간 표시가 있는 곳으로 가요",
    rescued: (n: number) => `동료 ${n}명을 구했어요`,
    label: {
      chase: "경찰이 수풀에서 뛰쳐나온 도둑을 쫓아가 잡는 장면",
      hide: "밤 골목 수풀에 숨은 도둑 앞으로 경찰이 지나가는 장면",
      reveal: "도둑 위치가 공개돼 빨간 표시가 뜨고 경찰이 그쪽으로 달려가는 장면",
      jail: "감옥 문 앞에 선 도둑이 갇힌 동료를 꺼내 함께 달아나는 장면",
      lobby: "대기실에서 친구들이 경찰 칸과 도둑 칸으로 걸어가 편을 고르는 장면",
      shrink: "구역이 줄어들기 직전, 도둑이 흰 선 안으로 뛰어 들어가고 빨간 경계가 흰 선까지 걸어 들어오는 장면",
      bite: "밤길에서 좀비가 생존자를 물고, 물린 생존자가 좀비로 일어나 함께 쫓아오는 장면",
      van: "무전으로 알려진 정류장에 노란 구조차가 서고, 생존자가 차 옆에서 버텨 올라타는 장면",
    },
    zone: { next: "구역 축소", moving: "줄어드는 중", soon: (n: number) => `${n}초 뒤 구역이 줄어들어요`, goIn: "흰 선 안으로 들어가요", shrunk: (n: number, m: number) => `구역이 줄었어요 (${n}/${m})` },
    zb: { vanComing: "구조차 오기까지", vanHere: "구조차가 섰어요", vanOpen: "구조차가 섰어요! 차 옆에서 버텨요", escaped: "구조차를 탔어요!", infected: (n: string) => `${n}이 감염됐어요`, radio: (n: number) => `무전: ${n}초 뒤 구조차가 와요` },
    lobby: { code: "방 코드", invite: "친구 부르기", hint: "하고 싶은 편으로 걸어가요", seats: "인원", quit: "나가기", start: "시작하기", host: "방장", people: ["하늘", "도윤", "서아", "찬빈"] },
  },
  en: {
    jail: "Jail", revealCop: "Robber reveal", revealRob: "Your reveal", sec: "s", run: "Run", catch: "Catch", me: "Me",
    names: { cheese: "Cheesehands", sneak: "Sneaky", flash: "Flash" },
    caught: (n: string) => `You caught ${n}`,
    revealed: "Robbers revealed. Head for the red marks",
    rescued: (n: number) => `You freed ${n} teammates`,
    label: {
      chase: "A cop chases down a robber who bursts out of a bush and catches them",
      hide: "A cop walks past a robber hiding in a bush in a night alley",
      reveal: "A robber's spot is revealed with a red mark and the cop runs toward it",
      jail: "A robber at the jail door frees trapped teammates and they run off together",
      lobby: "Friends in the lobby walk into the cops' zone and the robbers' zone to pick sides",
      shrink: "Just before the zone shrinks, a robber runs inside the white line and the red edge walks in to meet it",
      bite: "On a night street a zombie bites a survivor, who rises as a zombie and joins the chase",
      van: "A yellow rescue van pulls up at the stop the radio announced, and a survivor holds on beside it and climbs aboard",
    },
    zone: { next: "Shrinks in", moving: "Shrinking", soon: (n: number) => `The zone shrinks in ${n}s`, goIn: "Get inside the white line", shrunk: (n: number, m: number) => `The zone got smaller (${n}/${m})` },
    zb: { vanComing: "Rescue van in", vanHere: "The van is here", vanOpen: "The van is here! Stay next to it", escaped: "You made it onto the van!", infected: (n: string) => `${n} got infected`, radio: (n: number) => `Radio: rescue van in ${n}s` },
    lobby: { code: "Room code", invite: "Invite friends", hint: "Walk to the side you want", seats: "Players", quit: "Leave", start: "Start", host: "Host", people: ["Mia", "Leo", "Ava", "Sam"] },
  },
  ja: {
    jail: "牢屋", revealCop: "泥棒の位置公開", revealRob: "自分の位置公開", sec: "秒", run: "ダッシュ", catch: "捕まえる", me: "自分",
    names: { cheese: "チーズハンド", sneak: "こっそり", flash: "いなずま" },
    caught: (n: string) => `${n}を捕まえました`,
    revealed: "泥棒の位置が見えるよ。赤い印へ向かおう",
    rescued: (n: number) => `仲間を${n}人助けました`,
    label: {
      chase: "茂みから飛び出した泥棒を警察が追いかけて捕まえる場面",
      hide: "夜の路地で茂みに隠れた泥棒の前を警察が通り過ぎる場面",
      reveal: "泥棒の位置が赤い印で公開され、警察がそこへ走っていく場面",
      jail: "牢屋の扉の前に立った泥棒が、捕まった仲間を出していっしょに逃げる場面",
      lobby: "ロビーで友だちが警察エリアと泥棒エリアに歩いてチームを選ぶ場面",
      shrink: "エリアが狭くなる直前、泥棒が白い線の中へ走り込み、赤い境界が白い線まで迫ってくる場面",
      bite: "夜道でゾンビが生存者をかみ、かまれた生存者がゾンビになって一緒に追いかけてくる場面",
      van: "無線で知らされた停留所に黄色い救助車が着き、生存者が車のそばで待って乗り込む場面",
    },
    zone: { next: "縮小まで", moving: "縮小中", soon: (n: number) => `${n}秒後にエリアが狭くなるよ`, goIn: "白い線の中に入ろう", shrunk: (n: number, m: number) => `エリアが狭くなったよ (${n}/${m})` },
    zb: { vanComing: "救助車まで", vanHere: "救助車が着きました", vanOpen: "救助車が着きました！車のそばで待ちましょう", escaped: "救助車に乗れました！", infected: (n: string) => `${n}が感染しました`, radio: (n: number) => `無線: ${n}秒後に救助車が来ます` },
    lobby: { code: "部屋コード", invite: "友だちを呼ぶ", hint: "やりたいチームのほうへ歩こう", seats: "人数", quit: "退出", start: "スタート", host: "ホスト", people: ["ハル", "ユイ", "ソラ", "レン"] },
  },
} satisfies Record<Locale, unknown>;

export type SceneCopy = (typeof SCENE)["ko"];
// 영어, 일본어가 한국어와 같은 칸을 다 갖췄는지 빌드에서 확인한다
const SAME_SHAPE: Record<Locale, SceneCopy> = SCENE;
void SAME_SHAPE;

/** 한국어 사전. 한국어 장면은 원래 크기 그대로 두려고 비교한다 */
export const SCENE_KO = SCENE.ko;

export function useSceneCopy(): SceneCopy {
  return SCENE[useLocale()];
}

/** 글자 폭 어림값(굵은 글씨). 한글, 가나, 한자는 글자 크기만큼, 나머지는 0.6배. 언어마다 길이가 달라 상자 폭을 맞출 때 쓴다 */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? size : size * 0.6;
  return w;
}
