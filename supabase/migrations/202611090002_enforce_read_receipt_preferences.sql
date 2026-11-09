-- Enforce the account owner's read-receipt preference inside the trusted RPC.
begin;

alter table public.profiles
  add column if not exists read_receipts_enabled boolean not null default true;

create or replace function public.mark_message_read(p_message_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.read_receipts_enabled = true
  ) then
    return;
  end if;

  update public.messages
  set read_at = pg_catalog.now()
  where id = p_message_id
    and recipient_id = auth.uid()
    and read_at is null;
end;
$function$;

revoke all on function public.mark_message_read(bigint) from public, anon;
grant execute on function public.mark_message_read(bigint) to authenticated;

commit;
