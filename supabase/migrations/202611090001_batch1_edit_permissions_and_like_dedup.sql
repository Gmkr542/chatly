-- Chatly Batch 1 / Commit 1: make post and comment edits persist under RLS.
-- Also make like notifications idempotent across unlike/re-like cycles.

begin;

alter table public.posts
  add column if not exists edited_at timestamptz;

alter table public.post_comments
  add column if not exists edited_at timestamptz;

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own post comments" on public.post_comments;
drop policy if exists "Users can update their own comments" on public.post_comments;
create policy "Users can update their own post comments"
  on public.post_comments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update (body, edited_at) on public.posts to authenticated;
grant update (body, edited_at) on public.post_comments to authenticated;

-- Keep the most recent existing like notification for each actor/post pair.
delete from public.notifications older
using public.notifications newer
where older.type = 'like'
  and newer.type = 'like'
  and older.recipient_id = newer.recipient_id
  and older.actor_id = newer.actor_id
  and older.post_id = newer.post_id
  and older.post_id is not null
  and (older.created_at, older.id) < (newer.created_at, newer.id);

create unique index if not exists notifications_like_once_per_actor_post_uidx
  on public.notifications (recipient_id, actor_id, post_id)
  where type = 'like' and post_id is not null;

create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select p.user_id into owner_id
  from public.posts p
  where p.id = new.post_id;

  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, type, post_id)
    values (owner_id, new.user_id, 'like', new.post_id)
    on conflict (recipient_id, actor_id, post_id)
      where type = 'like' and post_id is not null
      do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.create_post_like_notification() from public, anon;

commit;
