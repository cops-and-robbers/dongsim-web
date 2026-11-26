"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import CharacterDuo from "@/components/ui/CharacterDuo";
import Modal from "@/components/ui/Modal";
import { SocialIcon } from "@/components/admin/icons/brand";
import {
  preloadFirebase,
  startAccountDeletion,
  type DeletionPlatform,
  type DeletionSession,
} from "@/lib/account-deletion/client";
import {
  AccountDeletionError,
  isInAppBrowser,
  type DeletionErrorKind,
} from "@/lib/account-deletion/errors";
import { BRAND } from "@/lib/constants";
import type { Messages } from "@/lib/i18n/messages";

type Copy = Messages["accountDeletion"]["flow"];
type Intro = Messages["accountDeletion"]["web"];

type Stage =
  | { name: "idle" }
  | { name: "signingIn"; platform: DeletionPlatform }
  | { name: "confirm"; session: DeletionSession }
  | { name: "deleting"; session: DeletionSession }
  | { name: "done" };

const PLATFORMS: DeletionPlatform[] = ["GOOGLE", "APPLE"];

const subscribeNothing = () => () => {};

function errorKindOf(error: unknown): DeletionErrorKind {
  return error instanceof AccountDeletionError ? error.kind : "failed";
}

export default function AccountDeletionFlow({
  intro,
  copy,
  homeHref,
}: {
  intro: Intro;
  copy: Copy;
  homeHref: string;
}) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [error, setError] = useState<DeletionErrorKind | null>(null);
  const inAppBrowser = useSyncExternalStore(
    subscribeNothing,
    () => isInAppBrowser(navigator.userAgent),
    () => false,
  );

  useEffect(preloadFirebase, []);

  async function signIn(platform: DeletionPlatform) {
    setError(null);
    setStage({ name: "signingIn", platform });
    try {
      const session = await startAccountDeletion(platform);
      if (!session) {
        setStage({ name: "idle" });
        return;
      }
      if (session.inActiveGame) {
        await session.cancel();
        setError("activeGame");
        setStage({ name: "idle" });
        return;
      }
      setStage({ name: "confirm", session });
    } catch (caught) {
      setError(errorKindOf(caught));
      setStage({ name: "idle" });
    }
  }

  async function confirmDeletion(session: DeletionSession) {
    setStage({ name: "deleting", session });
    try {
      await session.confirm();
      setStage({ name: "done" });
    } catch (caught) {
      setError(errorKindOf(caught));
      setStage({ name: "idle" });
    }
  }

  async function cancelDeletion(session: DeletionSession) {
    setStage({ name: "idle" });
    await session.cancel();
  }

  if (stage.name === "done") {
    return (
      <div role="status" className="text-center">
        <CharacterDuo className="mb-5" />
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {copy.done.title}
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {copy.done.body}
        </p>
        <Button href={homeHref} className="mt-6">
          {copy.done.home}
        </Button>
      </div>
    );
  }

  const busy = stage.name !== "idle";
  const dialog =
    stage.name === "confirm" || stage.name === "deleting" ? stage : null;

  return (
    <>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        {intro.title}
      </h2>
      <p className="mt-2 mb-6 leading-relaxed text-slate-600 dark:text-slate-300">
        {intro.body}
      </p>

      {inAppBrowser && (
        <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
          {copy.inAppBrowser}
        </p>
      )}

      <div className="grid gap-3">
        {PLATFORMS.map((platform) => (
          <Button
            key={platform}
            variant="outline"
            disabled={busy}
            className="w-full bg-white dark:bg-white/5"
            onClick={() => signIn(platform)}
          >
            <span className="flex items-center justify-center gap-2.5">
              <SocialIcon type={platform} className="h-5 w-5" />
              {stage.name === "signingIn" && stage.platform === platform
                ? copy.signingIn
                : copy.signIn[platform]}
            </span>
          </Button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 text-sm font-medium text-red-600 dark:text-red-400"
        >
          {copy.errors[error]}
          {error === "failed" && (
            <>
              {" "}
              <a href={`mailto:${BRAND.email}`} className="underline underline-offset-4">
                {BRAND.email}
              </a>
            </>
          )}
        </p>
      )}

      {dialog && (
        <Modal
          labelledBy="account-deletion-confirm"
          onClose={() => {
            if (dialog.name === "confirm") cancelDeletion(dialog.session);
          }}
        >
          <div className="rounded-3xl bg-white p-7 dark:bg-app-black-900">
            <h3
              id="account-deletion-confirm"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              {copy.confirm.title.replace("{nickname}", dialog.session.nickname)}
            </h3>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              {copy.confirm.body}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                disabled={dialog.name === "deleting"}
                className="w-full px-3! whitespace-nowrap"
                onClick={() => cancelDeletion(dialog.session)}
              >
                {copy.confirm.cancel}
              </Button>
              <Button
                variant="danger"
                disabled={dialog.name === "deleting"}
                className="w-full px-3! whitespace-nowrap"
                onClick={() => confirmDeletion(dialog.session)}
              >
                {dialog.name === "deleting"
                  ? copy.confirm.deleting
                  : copy.confirm.delete}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
