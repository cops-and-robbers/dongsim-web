"use client";

import dynamic from "next/dynamic";

// 움직이는 장면 목업은 체험하기 장면과 앱 문구 사전을 함께 싣는다. 첫 화면 번들에 넣지 않고
// 따로 받아 오고(코드 분할), 서버에서는 그리지 않는다 - 폰 틀(PhoneFrame)이 자리를 먼저 잡아 두어
// 내용이 늦게 들어와도 화면이 밀리지 않는다.
export const LazyStartSequenceMockup = dynamic(
  () => import("./SceneMockups").then((m) => m.StartSequenceMockup),
  { ssr: false },
);

export const LazyMvpMockup = dynamic(
  () => import("./SceneMockups").then((m) => m.MvpMockup),
  { ssr: false },
);
