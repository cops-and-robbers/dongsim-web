import type { Metadata } from "next";
import PostCard from "@/components/blog/PostCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CaptionedFigure from "@/components/ui/CaptionedFigure";
import CharacterDuo from "@/components/ui/CharacterDuo";
import Container from "@/components/ui/Container";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import SectionHeading from "@/components/ui/SectionHeading";
import UiSection from "@/components/ui/Section";
import type { BlogPost } from "@/lib/blog/notion";
import {
  ChatMockup,
  CommunityChatMockup,
  CommunityListMockup,
  CreateRoomMockup,
  LocationMockup,
  PhoneFrame,
  QrMockup,
  ZoneMockup,
} from "@/components/game/PhoneMockup";

// 내부용 스타일가이드 - 디자인 토큰과 UI 프리미티브를 한 페이지에 전시한다.
// 실제 프로덕션 컴포넌트를 그대로 렌더하므로 코드와 항상 동기화된다.
// 내비·sitemap에 노출하지 않고, 검색엔진 색인도 막는다.

export const metadata: Metadata = {
  title: "스타일가이드",
  robots: { index: false, follow: false },
};

const BRAND_COLORS = [
  { name: "brand-blue", className: "bg-brand-blue", note: "#3F63D9 · 경찰" },
  { name: "brand-green", className: "bg-brand-green", note: "#38F55B · 도둑" },
  { name: "brand-ink", className: "bg-brand-ink", note: "제목 텍스트" },
  { name: "brand-blue-bg", className: "bg-brand-blue-bg", note: "옅은 배경" },
  { name: "app-black", className: "bg-app-black", note: "다크 배경" },
  { name: "app-black-900", className: "bg-app-black-900", note: "다크 표면" },
  { name: "app-black-800", className: "bg-app-black-800", note: "다크 강조면" },
];

// PostCard 데모용 가짜 글 - 노션 연동 없이도 카드 모양을 보여준다.
const SAMPLE_POST: BlogPost = {
  id: "sample",
  slug: "#",
  title: "샘플 글 제목이 이렇게 보여요",
  summary: "요약 문장이 카드에서 두 줄까지 보이고, 넘치면 말줄임돼요.",
  author: "박찬빈",
  date: "2026-07-04",
  tags: ["행사", "개발"],
  coverUrl: null,
  locale: "ko",
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-extrabold text-brand-ink dark:text-white">
        {title}
      </h2>
      {hint && (
        <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="py-16 md:py-20">
      <Container>
        <SectionHeading
          eyebrow="INTERNAL"
          title="스타일가이드"
          description="사이트를 조립하는 토큰과 부품들이에요. 새 UI를 만들기 전에 여기 있는 프리미티브부터 확인해 주세요. 규칙은 docs/conventions.md, 말투는 docs/copy-guide.md에 있어요."
        />

        <Section
          title="컬러 토큰"
          hint="라이트=경찰=brand-blue / 다크=도둑=brand-green. 포인트 색은 반드시 쌍으로"
        >
          <div className="flex flex-wrap gap-4">
            {BRAND_COLORS.map((c) => (
              <div key={c.name} className="w-36">
                <div
                  className={`h-20 rounded-2xl ring-1 ring-black/10 dark:ring-white/15 ${c.className}`}
                />
                <p className="mt-2 font-mono text-xs font-bold text-brand-ink dark:text-white">
                  {c.name}
                </p>
                <p className="font-mono text-xs text-slate-400">{c.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-brand-blue-bg p-5 font-mono text-sm text-brand-blue dark:bg-app-black-900 dark:text-brand-green">
            text-brand-blue dark:text-brand-green ← 이 페어가 기본 문법
          </div>
        </Section>

        <Section
          title="타이포그래피"
          hint="Pretendard · 제목은 extrabold + tracking-tight"
        >
          <div className="space-y-5">
            <p className="text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
              페이지 제목 (text-4xl~5xl)
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
              섹션 제목 (text-3xl~4xl)
            </p>
            <p className="text-xl font-bold text-brand-ink dark:text-white">
              소제목 (text-xl bold)
            </p>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              본문 리드 (text-lg slate-600). 다정하지만 군더더기 없는 해요체로
              써요.
            </p>
            <p className="max-w-xl leading-relaxed text-slate-600 dark:text-slate-300">
              본문 기본 (text-base slate-600 / dark:slate-300)
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              보조 정보 (text-sm slate-400 / dark:slate-500)
            </p>
          </div>
        </Section>

        <Section
          title="Button"
          hint='ui/Button - variant="primary|inverse|outline" · size="md|lg" · href 주면 Link로'
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button>기본 (primary md)</Button>
            <Button size="lg">크게 (lg)</Button>
            <Button variant="outline">아웃라인</Button>
            <Button disabled>비활성</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-blue p-5 dark:bg-app-black-900">
            <Button variant="inverse">브랜드 배경 위 (inverse)</Button>
          </div>
        </Section>

        <Section title="Badge" hint='ui/Badge - variant="soft|outline"'>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>soft (태그용)</Badge>
            <Badge variant="outline">outline (상태용)</Badge>
          </div>
        </Section>

        <Section
          title="SectionHeading"
          hint="ui/SectionHeading - eyebrow + title + description · center 옵션"
        >
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 dark:border-white/15">
            <SectionHeading
              eyebrow="EYEBROW"
              title="섹션 제목이 이렇게"
              description="설명이 이 자리에 와요. 아이브로·제목·설명이 한 세트예요."
            />
          </div>
        </Section>

        <Section
          title="CharacterDuo"
          hint='ui/CharacterDuo - pose="default|search" · size="sm|md|lg|xl" · 냥파와 도둥이는 함께 등장이 기본'
        >
          <div className="flex flex-wrap items-end gap-10">
            <div className="text-center">
              <CharacterDuo size="sm" />
              <p className="mt-2 font-mono text-xs text-slate-400">sm</p>
            </div>
            <div className="text-center">
              <CharacterDuo size="md" />
              <p className="mt-2 font-mono text-xs text-slate-400">md</p>
            </div>
            <div className="text-center">
              <CharacterDuo pose="search" size="lg" />
              <p className="mt-2 font-mono text-xs text-slate-400">
                lg · pose=&quot;search&quot;
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
            왼쪽이 냥파(특수치즈수사대 형사, 검거율 1.8%), 오른쪽이
            도둥이(유력 용의자, 반치즈주의자). 설정은 docs/copy-guide.md
          </p>
        </Section>

        <Section
          title="EmptyState"
          hint="ui/EmptyState - 빈 목록·준비중·감사 화면의 공통 골격"
        >
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15">
            <EmptyState
              title="아직 첫 이야기를 준비하고 있어요"
              description="곧 팀의 발자국으로 채워질 자리예요."
            />
          </div>
        </Section>

        <Section
          title="PostCard"
          hint='blog/PostCard - variant="full|compact" · 커버 없으면 캐릭터 플레이스홀더'
        >
          <div className="grid max-w-2xl gap-8 sm:grid-cols-2">
            <PostCard post={SAMPLE_POST} />
            <PostCard post={SAMPLE_POST} variant="compact" />
          </div>
        </Section>

        <Section
          title="Section"
          hint='ui/Section - 페이지 섹션 래퍼 · variant="plain|muted|brand"'
        >
          <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 dark:border-white/15 [&_section]:py-6 md:[&_section]:py-6">
            <UiSection>
              <p className="px-6 text-sm text-slate-500">plain - 기본 배경</p>
            </UiSection>
            <UiSection variant="muted">
              <p className="px-6 text-sm text-slate-500">muted - 옅은 배경</p>
            </UiSection>
            <UiSection variant="brand">
              <p className="px-6 text-sm">brand - CTA용 브랜드 배경</p>
            </UiSection>
          </div>
        </Section>

        <Section
          title="CaptionedFigure"
          hint="ui/CaptionedFigure - 고정 높이 삽화 박스 + 모노 캡션 (비율 달라도 정렬 유지)"
        >
          <CaptionedFigure src="/event/cheese.svg" label="봉인된 황금 치즈" />
        </Section>

        <Section
          title="Input"
          hint="ui/Input - 포커스 시 브랜드색 테두리"
        >
          <Input placeholder="닉네임" className="w-64" />
        </Section>

        <Section
          title="폰 목업"
          hint="game/mockups - 앱 실측값 목업. 위 4종은 /game 게재 중, 아래 3종은 v3 출시 대기(#67). 테마를 바꾸면 경찰/도둑 시점이 전환돼요"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
            <PhoneFrame><ZoneMockup /></PhoneFrame>
            <PhoneFrame><LocationMockup /></PhoneFrame>
            <PhoneFrame><QrMockup /></PhoneFrame>
            <PhoneFrame><ChatMockup /></PhoneFrame>
            <PhoneFrame><CreateRoomMockup /></PhoneFrame>
            <PhoneFrame><CommunityListMockup /></PhoneFrame>
            <PhoneFrame><CommunityChatMockup /></PhoneFrame>
          </div>
        </Section>

        <Section
          title="Modal"
          hint="ui/Modal - 포털 + 백드롭 + ESC 닫기 골격. 카드 내용은 children이 결정 (EventModal·GameResultModal·랭킹에서 사용 중)"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            오버레이 컴포넌트라 여기선 정적으로 전시하지 않아요. 사용 예시는
            components/home/EventModal.tsx를 참고하세요.
          </p>
        </Section>
      </Container>
    </main>
  );
}
