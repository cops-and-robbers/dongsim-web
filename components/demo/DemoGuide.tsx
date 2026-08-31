import Image from "next/image";
import type { DemoScene } from "@/lib/demo/scenes";

// 폰에 말풍선으로 붙는 안내. 장면 데이터가 곧 안내가 된다 (#77).
// 지금 할 일 하나만 크게 말하고, 몇 번째인지 카운터로 보여준다.
// 데스크톱은 폰 오른쪽에 절대배치로 꼬리를 달고, 모바일은 폰 위의
// 일반 흐름에 두어 문구가 길어져도 다른 요소와 겹치지 않는다.
export function DemoGuide({
  scene,
  done,
}: {
  scene: DemoScene;
  done: Set<string>;
}) {
  const current = scene.tasks.find((task) => !done.has(task.id));
  const message = current ? current.label : scene.intro;

  return (
    <div className="pointer-events-none z-10 mb-3 flex min-h-28 items-end justify-center lg:absolute lg:left-full lg:top-16 lg:mb-0 lg:ml-5 lg:min-h-0 lg:items-start lg:justify-start">
      <div className="relative w-max max-w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:max-w-56 xl:max-w-64 dark:border-slate-600 dark:bg-slate-800">
        {/* 꼬리 - 모바일은 아래(폰), 데스크톱은 왼쪽(폰) */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white drop-shadow-sm lg:hidden dark:border-t-slate-800" />
        <span className="absolute right-full top-6 hidden border-y-8 border-r-8 border-y-transparent border-r-white lg:block dark:border-r-slate-800" />

        <div className="flex items-start gap-3">
          <Image
            src="/characters/police.svg"
            alt=""
            width={34}
            height={38}
            className="mt-0.5 shrink-0"
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
