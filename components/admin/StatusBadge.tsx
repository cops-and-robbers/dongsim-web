import type { ReactNode } from "react";
import { SocialIcon } from "@/components/admin/icons";
import {
  GAME_STATUS_LABEL,
  PARTICIPANT_STATUS_LABEL,
  ROLE_LABEL,
  SOCIAL_LABEL,
  TEAM_LABEL,
  REPORT_STATUS_LABEL,
  BUG_STATUS_LABEL,
  REPORT_TYPE_LABEL,
  REPORT_SOURCE_LABEL,
  labelOf,
} from "@/lib/admin/format";

// 상태 배지. 색은 최소 세트만(회색·파랑·초록·앰버·빨강). 팀 색은 경찰=파랑/도둑=초록.
type Tone = "slate" | "blue" | "green" | "amber" | "red";

const TONE: Record<Tone, string> = {
  slate: "bg-sd-gray-200 text-sd-fg-muted",
  blue: "bg-sd-info-weak text-sd-info",
  green: "bg-sd-positive-weak text-sd-positive",
  amber: "bg-sd-warning-weak text-sd-warning",
  red: "bg-sd-critical-weak text-sd-critical",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

const GAME_STATUS_TONE: Record<string, Tone> = {
  WAITING: "amber",
  IN_PROGRESS: "green",
  FINISHED: "slate",
  CANCELED: "red",
};

export function GameStatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={GAME_STATUS_TONE[status] ?? "slate"}>
      {labelOf(GAME_STATUS_LABEL, status)}
    </Pill>
  );
}

const PARTICIPANT_TONE: Record<string, Tone> = {
  ALIVE: "green",
  JAILED: "red",
  WAITING: "slate",
  POLICE_WAITING: "blue",
};

export function ParticipantStatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={PARTICIPANT_TONE[status] ?? "slate"}>
      {labelOf(PARTICIPANT_STATUS_LABEL, status)}
    </Pill>
  );
}

export function TeamBadge({ team }: { team: string | null | undefined }) {
  if (!team)
    return <span className="text-sd-disabled">-</span>;
  return (
    <Pill tone={team === "POLICE" ? "blue" : "green"}>
      {labelOf(TEAM_LABEL, team)}
    </Pill>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (role !== "ADMIN")
    return (
      <span className="text-[13px] text-sd-fg-subtle">
        {labelOf(ROLE_LABEL, role)}
      </span>
    );
  return <Pill tone="blue">운영자</Pill>;
}

const REPORT_STATUS_TONE: Record<string, Tone> = {
  PENDING: "amber",
  RESOLVED: "green",
  DISMISSED: "slate",
};

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={REPORT_STATUS_TONE[status] ?? "slate"}>
      {labelOf(REPORT_STATUS_LABEL, status)}
    </Pill>
  );
}

export function BugStatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={status === "RESOLVED" ? "green" : "amber"}>
      {labelOf(BUG_STATUS_LABEL, status)}
    </Pill>
  );
}

export function ReportTypeBadge({ type }: { type: string }) {
  return <Pill tone="slate">{labelOf(REPORT_TYPE_LABEL, type)}</Pill>;
}

const REPORT_SOURCE_TONE: Record<string, Tone> = {
  GAME_CHAT: "blue",
  COMMUNITY_POST: "green",
  COMMUNITY_CHAT: "amber",
};

export function ReportSourceBadge({ source }: { source: string }) {
  return (
    <Pill tone={REPORT_SOURCE_TONE[source] ?? "slate"}>
      {labelOf(REPORT_SOURCE_LABEL, source)}
    </Pill>
  );
}

export function SocialBadge({ social }: { social: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-sd-gray-200 px-2 py-0.5 text-[12px] font-semibold text-sd-fg-muted">
      <SocialIcon type={social} className="h-3.5 w-3.5" />
      {labelOf(SOCIAL_LABEL, social)}
    </span>
  );
}
