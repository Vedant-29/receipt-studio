-- Stub's data for signed-in people: their receipts and their API keys.
--
-- The app never holds a service-role key. Its Worker talks to this database with the
-- publishable key plus the signed-in person's own token, so row level security below is
-- what decides who can see and change what. Limits (sizes, counts) live here too, so they
-- hold even for requests that don't come through the app.

-- ---------- receipts: the history, saved as people edit ----------

create table public.receipts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	receipt jsonb not null,
	-- Kept beside the JSON so the history list doesn't load every receipt
	title text not null default '' check (char_length(title) <= 200),
	total text not null default '' check (char_length(total) <= 60),
	template text not null default 'default' check (template in ('default', 'self-service', 'barcode', 'ticket')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint receipt_is_object check (jsonb_typeof(receipt) = 'object'),
	-- Logos are stored inline, so a receipt can be big, but not unbounded
	constraint receipt_size check (octet_length(receipt::text) <= 1500000)
);

create index receipts_by_user on public.receipts (user_id, updated_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
	new.updated_at := now();
	return new;
end $$;

create trigger receipts_touch before update on public.receipts
for each row execute function public.touch_updated_at();

-- Up to 1000 receipts each (src/lib/limits.ts shows the same number)
create function public.receipts_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
	if (select count(*) from public.receipts r where r.user_id = new.user_id) >= 1000 then
		raise exception 'receipt limit reached' using errcode = 'P0001', hint = 'Delete some receipts to save new ones.';
	end if;
	return new;
end $$;

create trigger receipts_cap before insert on public.receipts
for each row execute function public.receipts_cap();

alter table public.receipts enable row level security;

create policy "Read own receipts" on public.receipts
	for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own receipts" on public.receipts
	for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own receipts" on public.receipts
	for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own receipts" on public.receipts
	for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.receipts from anon, authenticated;
grant select, insert, update, delete on public.receipts to authenticated;

-- ---------- API keys ----------
-- A key is "stub_" plus 32 random bytes in base64url. Only its SHA-256 is stored: the key is
-- shown once, when it's made, and can't be read back. Usage counters sit on the key's row.

create table public.api_keys (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	-- The first characters, to recognise a key without revealing it
	prefix text not null,
	hash text not null unique check (hash ~ '^[0-9a-f]{64}$'),
	label text check (label is null or char_length(label) between 1 and 40),
	created_at timestamptz not null default now(),
	last_used_at timestamptz,
	minute_start timestamptz,
	minute_count integer not null default 0,
	day_start date,
	day_count integer not null default 0
);

create index api_keys_by_user on public.api_keys (user_id);

alter table public.api_keys enable row level security;

create policy "Read own keys" on public.api_keys
	for select to authenticated using ((select auth.uid()) = user_id);
create policy "Revoke own keys" on public.api_keys
	for delete to authenticated using ((select auth.uid()) = user_id);

-- No one reads the hash back, and keys are only ever made by create_api_key()
revoke all on public.api_keys from anon, authenticated;
grant select (id, user_id, prefix, label, created_at, last_used_at, day_start, day_count) on public.api_keys to authenticated;
grant delete on public.api_keys to authenticated;

-- Makes a key for the signed-in person and returns it, the one time it's ever visible
create function public.create_api_key(p_label text default null)
returns table (id uuid, key text, prefix text, label text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
	uid uuid := auth.uid();
	new_key text;
	clean text := nullif(left(btrim(regexp_replace(coalesce(p_label, ''), '[[:cntrl:]]', '', 'g')), 40), '');
begin
	if uid is null then
		raise exception 'sign in to create a key' using errcode = '42501';
	end if;
	-- Up to 5 keys each (src/lib/limits.ts shows the same number)
	if (select count(*) from public.api_keys k where k.user_id = uid) >= 5 then
		raise exception 'key limit reached' using errcode = 'P0001', hint = 'You can have 5 keys. Revoke one to make another.';
	end if;
	new_key := 'stub_' || rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
	return query
		insert into public.api_keys as k (user_id, prefix, hash, label)
		values (uid, left(new_key, 12), encode(extensions.digest(new_key, 'sha256'), 'hex'), clean)
		returning k.id, new_key, k.prefix, k.label, k.created_at;
end $$;

-- Counts one API request against a key, by the key's hash. Called by the Worker with the
-- publishable key; knowing a hash means knowing the key, so this gives nothing away.
-- The limits match src/lib/limits.ts.
create function public.use_api_key(p_hash text)
returns json
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
	this_minute timestamptz := date_trunc('minute', now());
	today date := (now() at time zone 'utc')::date;
	per_minute constant integer := 30;
	per_day constant integer := 1000;
	used record;
begin
	if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
		return json_build_object('ok', false, 'reason', 'invalid');
	end if;

	update public.api_keys set
		minute_count = case when minute_start = this_minute then minute_count + 1 else 1 end,
		minute_start = this_minute,
		day_count = case when day_start = today then day_count + 1 else 1 end,
		day_start = today,
		last_used_at = now()
	where hash = p_hash
	returning minute_count, day_count into used;

	if not found then
		return json_build_object('ok', false, 'reason', 'invalid');
	end if;
	if used.minute_count > per_minute then
		return json_build_object('ok', false, 'reason', 'minute', 'limit', per_minute,
			'retry_after', greatest(1, 60 - extract(second from now())::integer));
	end if;
	if used.day_count > per_day then
		return json_build_object('ok', false, 'reason', 'day', 'limit', per_day,
			'retry_after', greatest(1, extract(epoch from (today + 1)::timestamp - (now() at time zone 'utc'))::integer));
	end if;
	return json_build_object('ok', true, 'minute_left', per_minute - used.minute_count, 'day_left', per_day - used.day_count);
end $$;

-- Functions are callable by everyone unless told otherwise
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.receipts_cap() from public, anon, authenticated;
revoke execute on function public.create_api_key(text) from public, anon;
grant execute on function public.create_api_key(text) to authenticated;
revoke execute on function public.use_api_key(text) from public;
grant execute on function public.use_api_key(text) to anon, authenticated;
