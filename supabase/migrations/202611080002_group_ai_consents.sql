-- Explicit, per-member consent for manual AI analysis of group messages.
create table if not exists public.group_ai_consents (
  conversation_id uuid not null references public.group_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consented boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  constraint group_ai_consents_member_fk
    foreign key (conversation_id, user_id)
    references public.group_conversation_members(conversation_id, user_id)
    on delete cascade
);

create index if not exists group_ai_consents_group_idx
  on public.group_ai_consents(conversation_id, consented);

alter table public.group_ai_consents enable row level security;

drop policy if exists "Group members can view AI consent status" on public.group_ai_consents;
create policy "Group members can view AI consent status"
  on public.group_ai_consents for select to authenticated
  using (public.is_group_member(conversation_id, auth.uid()));

drop policy if exists "Members manage their own group AI consent" on public.group_ai_consents;
create policy "Members manage their own group AI consent"
  on public.group_ai_consents for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(conversation_id, auth.uid())
  );

drop policy if exists "Members update their own group AI consent" on public.group_ai_consents;
create policy "Members update their own group AI consent"
  on public.group_ai_consents for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_group_member(conversation_id, auth.uid())
  )
  with check (
    user_id = auth.uid()
    and public.is_group_member(conversation_id, auth.uid())
  );

revoke all on public.group_ai_consents from anon;
grant select, insert, update on public.group_ai_consents to authenticated;

comment on table public.group_ai_consents is
  'Per-member opt-in for manual AI processing of group messages. Missing rows mean no consent.';
