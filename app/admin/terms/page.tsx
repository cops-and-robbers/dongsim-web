"use client";

import { useRef, useState } from "react";
import { useRelayEnvironment, fetchQuery, commitMutation } from "react-relay";
import { ListPage, PageHeader, Card } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { TermsResetPreviewQuery } from "@/lib/admin/gql/TermsResetPreview";
import { ResetTermsAgreementMutation } from "@/lib/admin/gql/ResetTermsAgreement";
import type { TermsResetPreview } from "@/__generated__/TermsResetPreview.graphql";
import type { ResetTermsAgreement } from "@/__generated__/ResetTermsAgreement.graphql";

type TermsType = "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | "LOCATION_TERMS" | "MARKETING";

const TERMS: { type: TermsType; label: string; required: boolean; note: string }[] = [
  {
    type: "TERMS_OF_SERVICE",
    label: "서비스 이용약관",
    required: true,
    note: "재동의 전까지 앱이 약관 화면에서 막혀요",
  },
  {
    type: "PRIVACY_POLICY",
    label: "개인정보 처리방침",
    required: true,
    note: "재동의 전까지 앱이 약관 화면에서 막혀요",
  },
  {
    type: "LOCATION_TERMS",
    label: "위치정보 이용약관",
    required: true,
    note: "재동의 전까지 앱이 약관 화면에서 막혀요",
  },
  {
    type: "MARKETING",
    label: "마케팅 정보 수신",
    required: false,
    note: "선택 동의라 앱 사용은 막히지 않아요",
  },
];

export default function AdminTermsPage() {
  const environment = useRelayEnvironment();
  const toast = useToast();
  const [selected, setSelected] = useState<TermsType[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);

  // 연타로 조회가 겹칠 때 마지막 선택의 결과만 반영하기 위한 순번
  const previewSeq = useRef(0);

  /** 선택이 바뀔 때마다 대상 인원을 실행 없이 미리 계산한다. */
  const requestPreview = (types: TermsType[]) => {
    const seq = ++previewSeq.current;
    if (types.length === 0) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    fetchQuery<TermsResetPreview>(
      environment,
      TermsResetPreviewQuery,
      { types },
      { fetchPolicy: "network-only" }
    )
      .toPromise()
      .then((data) => {
        if (seq !== previewSeq.current) return;
        setPreview(data?.termsResetPreview.affectedUsers ?? null);
      })
      .catch(() => {
        if (seq !== previewSeq.current) return;
        setPreview(null);
        toast("대상 인원을 불러오지 못했어요");
      })
      .finally(() => {
        if (seq === previewSeq.current) setPreviewLoading(false);
      });
  };

  const toggle = (type: TermsType) => {
    const next = selected.includes(type)
      ? selected.filter((t) => t !== type)
      : [...selected, type];
    setSelected(next);
    requestPreview(next);
  };

  const run = () => {
    setRunning(true);
    commitMutation<ResetTermsAgreement>(environment, {
      mutation: ResetTermsAgreementMutation,
      variables: { types: selected },
      onCompleted: (data) => {
        setRunning(false);
        setConfirming(false);
        setSelected([]);
        setPreview(null);
        toast(`${data.resetTermsAgreement.affectedUsers}명의 동의를 초기화했어요`);
      },
      onError: () => {
        setRunning(false);
        toast("초기화에 실패했어요. 잠시 후 다시 시도해 주세요");
      },
    });
  };

  const selectedLabels = TERMS.filter((t) => selected.includes(t.type))
    .map((t) => t.label)
    .join(", ");
  const hasRequired = TERMS.some((t) => selected.includes(t.type) && t.required);

  return (
    <ListPage>
      <PageHeader
        title="약관 재동의"
        description="약관이 개정되면 대상 약관을 골라 사용자에게 다시 동의를 받아요."
      />

      <div className="mb-5">
        <Callout variant="warning" title="실행 전에 확인하세요">
          개정판 약관이 웹사이트에 먼저 배포되어 있어야 해요. 필수 약관을
          초기화하면 대상 사용자는 다시 동의할 때까지 앱이 약관 화면에서 막히고,
          이 작업은 되돌릴 수 없어요.
        </Callout>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-[13px] font-semibold text-sd-fg-subtle">
          초기화할 약관
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TERMS.map((term) => {
            const active = selected.includes(term.type);
            return (
              <button
                key={term.type}
                type="button"
                onClick={() => toggle(term.type)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-accent bg-accent-weak"
                    : "border-sd-line bg-sd-surface hover:border-sd-fg-subtle"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-sd-fg">
                    {term.label}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      term.required
                        ? "bg-sd-warning-weak text-sd-warning"
                        : "bg-sd-gray-200 text-sd-fg-muted"
                    }`}
                  >
                    {term.required ? "필수" : "선택"}
                  </span>
                </span>
                <span className="mt-1 block text-[12px] text-sd-fg-subtle">
                  {term.note}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sd-hairline pt-4">
          <p className="text-[13px] text-sd-fg-muted">
            {selected.length === 0
              ? "초기화할 약관을 선택하면 대상 인원을 미리 보여드려요."
              : previewLoading
                ? "대상 인원을 확인하는 중..."
                : preview === null
                  ? "대상 인원을 불러오지 못했어요."
                  : `현재 동의 상태 기준, ${preview.toLocaleString()}명이 재동의 대상이에요.`}
          </p>
          <Button
            variant="danger"
            disabled={selected.length === 0 || previewLoading || preview === null}
            onClick={() => setConfirming(true)}
          >
            재동의 요청
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming}
        danger
        pending={running}
        title="약관 동의를 초기화할까요?"
        message={
          <>
            {selectedLabels}에 대해 {preview?.toLocaleString()}명의 동의가
            해제돼요. {hasRequired && "대상 사용자는 다시 동의할 때까지 앱을 쓸 수 없어요. "}
            이 작업은 되돌릴 수 없어요.
          </>
        }
        confirmText="초기화 실행"
        onConfirm={run}
        onClose={() => !running && setConfirming(false)}
      />
    </ListPage>
  );
}
