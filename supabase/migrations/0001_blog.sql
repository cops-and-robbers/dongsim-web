-- 블로그 동기화 스키마 (#109).
--
-- 정본은 노션이다. 동기화(/api/blog/sync)가 노션 마크다운을 변환해 여기에
-- 채우고, 화면은 이 테이블만 읽는다 - 렌더 경로에 노션이 끼지 않는다.
-- upsert 기준은 notion_page_id (제목·슬러그가 바뀌어도 같은 글).
--
-- 개인 검증본(INSANE-P/blog)과 같은 구조에 팀 블로그 확장 둘을 더했다:
-- locale (ko/en/ja 세 블로그를 한 테이블에서) · author (팀원 작성자 표시).

create table if not exists posts (
  id             uuid primary key default gen_random_uuid(),
  notion_page_id text not null unique,
  slug           text not null,
  locale         text not null default 'ko' check (locale in ('ko', 'en', 'ja')),
  title          text not null,
  excerpt        text,
  content        text not null default '',
  cover_image    text,
  author         text,
  entry_date     date,
  tags           text[] not null default '{}',
  status         text not null default 'draft' check (status in ('draft', 'published')),
  published_at   timestamptz,
  synced_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- 같은 슬러그가 언어별로 존재할 수 있다 (라우트가 /blog, /en/blog, /ja/blog 로 갈림)
  unique (locale, slug)
);

create index if not exists posts_locale_status_date_idx
  on posts (locale, status, entry_date desc);

-- updated_at 은 "내용이 실제로 바뀐" 수정 시각이다. 동기화가 바뀐 글만 쓰는
-- 이유가 이것이다 - 사이트맵 lastmod 와 JSON-LD dateModified 가 이 값을 쓴다.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- 읽기는 서버(service role)만 하지만, 키 노출 사고에 대비해 RLS 를 켜 둔다.
-- anon 에게는 발행된 글만 보인다.
alter table posts enable row level security;

drop policy if exists "published posts are readable by anyone" on posts;
create policy "published posts are readable by anyone"
  on posts for select
  using (status = 'published');
