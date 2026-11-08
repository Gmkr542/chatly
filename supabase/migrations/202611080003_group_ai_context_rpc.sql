-- Return a consented group transcript in one database statement.
create or replace function public.get_group_ai_context(p_conversation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_user_id uuid := auth.uid(); v_messages jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.group_conversation_members m where m.conversation_id = p_conversation_id and m.user_id = v_user_id) then
    raise exception 'You are not a member of this group' using errcode = '42501';
  end if;
  if exists (select 1 from public.group_conversation_members m left join public.group_ai_consents c on c.conversation_id = m.conversation_id and c.user_id = m.user_id where m.conversation_id = p_conversation_id and coalesce(c.consented, false) is not true) then
    raise exception 'Every current group member must opt in before AI analysis can run' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('sender', recent.sender_id, 'text', left(recent.body, 4000), 'sentAt', recent.created_at) order by recent.created_at asc), '[]'::jsonb)
  into v_messages from (select sender_id, body, created_at from public.group_messages where conversation_id = p_conversation_id order by created_at desc limit 80) recent;
  return jsonb_build_object('messages', v_messages);
end;
$function$;
revoke all on function public.get_group_ai_context(uuid) from public, anon;
grant execute on function public.get_group_ai_context(uuid) to authenticated;
