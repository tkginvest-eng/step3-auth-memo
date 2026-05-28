create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  body text not null check (char_length(body) <= 800),
  status text not null default 'open' check (status in ('open', 'done')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memos enable row level security;

drop policy if exists "Users can read own memos" on public.memos;
create policy "Users can read own memos"
on public.memos
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own memos" on public.memos;
create policy "Users can create own memos"
on public.memos
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own memos" on public.memos;
create policy "Users can update own memos"
on public.memos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own memos" on public.memos;
create policy "Users can delete own memos"
on public.memos
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists memos_user_id_updated_at_idx
on public.memos (user_id, updated_at desc);
