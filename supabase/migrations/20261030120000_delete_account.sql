-- Lets a signed-in person delete their account from Profile. Their receipts and API keys go
-- with it (both reference auth.users on delete cascade), and so do their sessions.

create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
	uid uuid := auth.uid();
begin
	if uid is null then
		raise exception 'sign in to delete your account' using errcode = '42501';
	end if;
	delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
