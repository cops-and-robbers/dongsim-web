"use client";

import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import type { DemoScene } from "@/lib/demo/scenes";

// 폰에 말풍선으로 붙는 안내. 장면 데이터가 곧 안내가 된다 (#77).
// 지금 할 일 하나만 크게 말하고, 몇 번째인지 카운터로 보여준다.
// 데스크톱은 폰 오른쪽에 절대배치로 꼬리를 달고, 모바일은 폰 위의
// 일반 흐름에 두어 문구가 길어져도 다른 요소와 겹치지 않는다.
// 안내하는 캐릭터는 테마 진영을 따른다 - 라이트는 냥파, 다크는 도둥이 (#88).
export function DemoGuide({
  scene,
  done,
}: {
  scene: DemoScene;
  done: Set<string>;
}) {
  const { team } = useTheme();
  const current = scene.tasks.find((task) => !done.has(task.id));
  const message = current ? current.label : scene.intro;

  return (
    <div className="pointer-events-none z-10 mb-3 flex min-h-28 items-end justify-center lg:absolute lg:left-full lg:top-16 lg:mb-0 lg:ml-5 lg:min-h-0 lg:items-start lg:justify-start">
      <div className="relative w-max max-w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:max-w-56 xl:max-w-64 dark:border-slate-600 dark:bg-slate-800">
        {/* 꼬리 - 모바일은 아래(폰), 데스크톱은 왼쪽(폰). 카드와 같은 면·테두리를
            가진 회전 사각형이라 다크에서도 테두리 선이 끊기지 않고 이어진다 */}
        <span className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white lg:hidden dark:border-slate-600 dark:bg-slate-800" />
        <span className="absolute right-full top-6 hidden size-3 translate-x-1/2 rotate-45 border-b border-l border-slate-200 bg-white lg:block dark:border-slate-600 dark:bg-slate-800" />

        <div className="flex items-start gap-3">
          {/* 진영이 곧 안내자다. 캐릭터마다 비율이 달라 높이로 맞춘다 */}
          <Image
            src={team === "robber" ? "/characters/robber.svg" : "/characters/police.svg"}
            alt=""
            width={38}
            height={36}
            className="mt-0.5 shrink-0"
            style={{ height: 36, width: "auto" }}
          />
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 text-[11px] font-semibold text-brand-blue dark:text-brand-green">
              {scene.title}
              {/* 해볼 것이 여러 개일 때만 몇 번째인지 알려준다 */}
              {current && scene.tasks.length > 1 && (
                <span className="font-medium text-slate-400 dark:text-slate-500">
                  {scene.tasks.indexOf(current) + 1}/{scene.tasks.length}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
