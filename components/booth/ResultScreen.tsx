"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppleIcon, PlayIcon } from "@/components/ui/StoreIcons";
import { APP_LINKS } from "@/lib/constants";
import Shell from "./Shell";
import { type Game } from "./types";
import {
  getLastName,
  getTopScores,
  setLastName,
  submitScore,
  type Score,
} from "./leaderboard";

export default function ResultScreen({
  game,
  onRestart,
}: {
  game: Game;
  onRestart: () => void;
}) {
  const [name, setName] = useState("");
  const [top, setTop] = useState<Score[]>([]);
  const [saved, setSaved] = useState<{ rank: number; total: number } | null>(
    null,
  );
  const [showBoard, setShowBoard] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const last = getLastName();
      const list = await getTopScores(5);
      if (!alive) return;
      setName(last);
      setTop(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    const trimmed = name.trim().slice(0, 12) || "익명";
    setLastName(trimmed);
    const res = await submitScore({
      name: trimmed,
      score: game.score,
      caught: game.caught,
    });
    setSaved(res);
    setTop(await getTopScores(5));
    setShowBoard(true);
  };

  return (
    <Shell variant="scroll">
      <div className="relative z-10 mx-auto w-full max-w-85 pt-36 lg:grid lg:w-fit lg:max-w-none lg:grid-cols-[320px_300px] lg:items-stretch lg:gap-5">
        {/* 결과 카드 — 결과 모달 스타일(경찰이 카드 위로 빼꼼) */}
        <div className="relative">
          <div
            className="pointer-events-none absolute bottom-full left-1/2 z-0"
            style={{ transform: "translate(-50%, 5px)" }}
          >
            <Image
              src="/characters/police-win-body.svg"
              alt=""
              width={180}
              height={140}
              unoptimized
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 rounded-3xl bg-white px-4 pb-5 pt-7 text-center shadow-2xl ring-1 ring-slate-200 dark:bg-app-black dark:ring-white/10">
            <p className="font-mono text-6xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {game.score}
            </p>
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
              점
            </p>

            <dl className="mt-5 space-y-2.5 px-2 text-base">
              <Row label="검거" value={`${game.caught}명`} />
              <Row label="최대 콤보" value={`x${game.maxCombo}`} />
              <Row label="놓침" value={`${game.misses}명`} />
            </dl>

            {saved ? (
              <button
                type="button"
                onClick={() => setShowBoard(true)}
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-blue/10 px-4 py-3 text-sm font-bold text-brand-blue transition-colors hover:bg-brand-blue/15 dark:bg-brand-green/15 dark:text-brand-green dark:hover:bg-brand-green/25"
              >
                🏆 전체 {saved.total}명 중 {saved.rank}위 · 랭킹 보기
              </button>
            ) : (
              <div className="mt-5 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  placeholder="닉네임"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-brand-blue dark:border-white/10 dark:bg-app-black-900 dark:text-white dark:focus:border-brand-green"
                />
                <button
                  type="button"
                  onClick={save}
                  className="shrink-0 rounded-xl bg-app-black px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-app-black"
                >
                  기록 저장
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onRestart}
              className="mt-3 w-full rounded-2xl bg-brand-blue px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-blue/30 transition-transform hover:-translate-y-0.5 dark:bg-brand-green dark:text-app-black dark:shadow-none"
            >
              다시 도전
            </button>
          </div>

          {/* 카드 모서리에 걸친 양손 */}
          <div className="pointer-events-none absolute left-15.75 top-0 z-20 -translate-y-1/2">
            <Image
              src="/characters/police-win-arm-left.svg"
              alt=""
              width={34}
              height={22}
              unoptimized
              aria-hidden="true"
            />
          </div>
          <div className="pointer-events-none absolute right-15.75 top-0 z-20 -translate-y-1/2">
            <Image
              src="/characters/police-win-arm-right.svg"
              alt=""
              width={34}
              height={22}
              unoptimized
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 오른쪽: 다운로드 + 랭킹 — 데스크탑에선 결과 카드와 나란한 한 장의 카드 */}
        <div className="mt-3 lg:mt-0">
          <div className="flex h-full flex-col rounded-3xl bg-brand-blue p-4 text-white shadow-lg shadow-brand-blue/30 dark:bg-app-black-900 dark:shadow-none dark:ring-1 dark:ring-white/10">
            {/* 앱 다운로드 — 데스크탑은 QR + 스토어 버튼, 모바일은 단일 버튼 */}
            <p className="text-center text-sm font-extrabold">
              앱 다운받고 밖에서 즐겨요 🏃
            </p>

            {/* 데스크탑: QR(폰으로 스캔) — 남는 높이를 채워 결과 카드와 맞춤 */}
            <div className="hidden flex-1 items-center justify-center py-3 lg:flex">
              <Image
                src="/brand/qr-download.svg"
                alt="앱 다운로드 QR"
                width={176}
                height={176}
                unoptimized
                className="h-40 w-40 rounded-xl bg-white p-2.5"
              />
            </div>
            <div className="mt-3 hidden flex-col gap-2 lg:flex">
              <a
                href={APP_LINKS.appStore}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-app-black transition-opacity hover:opacity-90"
              >
                <AppleIcon className="h-5 w-5 fill-current" />
                App Store
              </a>
              <a
                href={APP_LINKS.googlePlay}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-app-black transition-opacity hover:opacity-90"
              >
                <PlayIcon className="h-5 w-auto" />
                Google Play
              </a>
            </div>

            {/* 모바일: QR 없이, 기기에 맞는 스토어로 보내는 단일 버튼 */}
            <a
              href="/download"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-base font-bold text-app-black transition-opacity hover:opacity-90 lg:hidden"
            >
              <DownloadIcon className="h-5 w-5" />
              앱 다운로드
            </a>
          </div>
        </div>
      </div>

      {showBoard && (
        <Leaderboard
          top={top}
          myRank={saved?.rank ?? null}
          total={saved?.total ?? null}
          onClose={() => setShowBoard(false)}
        />
      )}
    </Shell>
  );
}

function Leaderboard({
  top,
  myRank,
  total,
  onClose,
}: {
  top: Score[];
  myRank: number | null;
  total: number | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="검거왕 랭킹"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-app-black dark:ring-white/10">
        <p className="text-center text-lg font-extrabold text-slate-900 dark:text-white">
          🏆 검거왕 랭킹
        </p>

        {myRank != null && total != null && (
          <p className="mt-3 rounded-xl bg-brand-blue/10 px-4 py-2.5 text-center text-sm font-bold text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
            전체 {total}명 중 {myRank}위
          </p>
        )}

        <ol className="mt-4 space-y-2">
          {top.map((s, i) => {
            const mine = myRank != null && i === myRank - 1;
            return (
              <li
                key={s.at}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-base ${
                  mine
                    ? "bg-brand-blue/10 ring-1 ring-brand-blue/30 dark:bg-brand-green/15 dark:ring-brand-green/30"
                    : "bg-slate-50 dark:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-brand-blue text-white dark:bg-brand-green dark:text-app-black"
                        : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {s.name}
                  </span>
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {s.score}
                </span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-app-black px-6 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-app-black"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="font-medium text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
