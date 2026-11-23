# Shared likes with Supabase — setup guide

The site currently stores likes **per browser** in `localStorage`. Follow this
once and every visitor will see the same, shared count.

The code is already in place (`script.js` + the config generator). You only need
to create a free Supabase project, run one SQL query, and set two environment
variables. `supabase-config.js` is generated from them — never edited by hand.

---

## 1. Create the free project

1. Go to <https://supabase.com> and click **Start your project**.
2. Sign in with GitHub or Google.
3. Click **New project** and fill in:
   - **Name:** anything, e.g. `azhar-likes`
   - **Database password:** make one up and save it somewhere safe (you won't
     need it for this site, but Supabase asks for it).
   - **Region:** pick the one closest to you (e.g. `Southeast Asia (Singapore)`).
4. Click **Create new project** and wait ~2 minutes for it to start.

## 2. Copy your two values

In the left sidebar click the **gear icon → Project Settings → API**.

Copy:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **publishable** key (shown as "anon public" in older dashboards) — a long
  string starting with `eyJ...` or `sb_publishable_...`

This key is _designed to be public_ — it is safe in a static site. The database
is protected by Row Level Security (set up in the next step), so nobody can use
it to read or write anything except the like count. Even so, keeping it in
environment variables / repository secrets keeps it out of the source files and
makes rotation a settings change rather than a code change.

## 3. Create the counter (one SQL query)

In the left sidebar click **SQL Editor → New query**, paste the whole block
below, then click **Run** (or press `Ctrl+Enter`).

```sql
-- One row holds the shared count.
create table if not exists public.site_likes (
  id smallint primary key,
  count integer not null default 0
);

insert into public.site_likes (id, count)
values (1, 0)
on conflict (id) do nothing;

-- Visitors may read the count, but cannot write to the table directly.
alter table public.site_likes enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.site_likes to anon, authenticated;

drop policy if exists "Anyone can read the like count" on public.site_likes;
create policy "Anyone can read the like count"
  on public.site_likes for select to anon, authenticated
  using (true);

-- The only way to change it: a function that adds +1 / -1 and returns the new
-- count. SECURITY DEFINER lets it update the row even though RLS blocks direct
-- writes, and it clamps the value at zero.
--
-- Abuse guards: only +1/-1 is accepted, and each client IP may change the count
-- at most 10 times an hour. This is best effort — a static site cannot prove
-- identity, so a hard per-account limit needs Supabase auth or a server
-- endpoint (see "Security notes" below).
create table if not exists public.like_rate (
  ip_hash text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.like_rate enable row level security;
revoke all on table public.like_rate from anon, authenticated;

create or replace function public.adjust_site_likes(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  client_ip text;
  bucket public.like_rate;
  new_count integer;
begin
  if delta not in (-1, 1) then
    return (select count from site_likes where id = 1);
  end if;

  client_ip := coalesce(
    current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for',
    'unknown'
  );

  insert into like_rate (ip_hash, hits) values (md5(client_ip), 1)
  on conflict (ip_hash) do update set
    hits = case when like_rate.window_start < now() - interval '1 hour'
                then 1 else like_rate.hits + 1 end,
    window_start = case when like_rate.window_start < now() - interval '1 hour'
                then now() else like_rate.window_start end
  returning * into bucket;

  if bucket.hits > 10 then
    return (select count from site_likes where id = 1);
  end if;

  update site_likes
     set count = greatest(0, count + delta)
   where id = 1
  returning count into new_count;

  return new_count;
end;
$$;

revoke all on function public.adjust_site_likes(integer) from public;
grant execute on function public.adjust_site_likes(integer) to anon, authenticated;
```

You should see `Success. No rows returned`. It is safe to run the query again.

## 4. Turn it on

**Locally:** copy `.env.example` to `.env`, fill in the two values from step 2,
then run `npm run config`. This writes `supabase-config.js` (which is gitignored).

```dotenv
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

**On GitHub:** add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under
**Settings → Secrets and variables → Actions → New repository secret**. The
deploy workflow reads them and generates the config during the Pages build.

Push to `main`. Once the workflow finishes, the heart count is shared by
everyone. If either value is missing, the site falls back to the local counter.

> **Key rotation:** an earlier version of this repository contained a real
> publishable key in a committed `supabase-config.js`. The current files are
> clean, but that key is still in git history. Rotate it in
> **Project Settings → API → Rotate key** and use the new value in `.env` and
> the repository secrets.

---

## How it behaves

- The count is read from Supabase when the page loads.
- Clicking the heart calls `adjust_site_likes(1)`; unliking calls it with `-1`.
- `localStorage` still remembers **your** liked/unliked state, so refreshing
  the page does not let the same browser keep adding likes.
- If Supabase is unreachable (or the values are still blank), the site quietly
  falls back to the old per-browser counter — the button never breaks.

## Resetting the count

In **SQL Editor** run:

```sql
update public.site_likes set count = 0 where id = 1;
```

---

## Security notes

The publishable (formerly "anon") key is designed to be sent to browsers, so it
is **not a secret** in the cryptographic sense. We still keep it out of the
source files: it lives in `.env` locally and in repository secrets for deploys,
and `supabase-config.js` is generated at build time. That keeps the current
repository clean and makes rotation easy — but the real security boundary is
always the Supabase project, not the repository.

Security is enforced in the Supabase project, not in this repository. To audit
it, paste the following **read-only** query into **SQL Editor → New query** and
run it. It changes nothing; it reports the live RLS, grants and RPC state.

```sql
-- 1. RLS should be enabled (rls_enabled = true).
select relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where oid = 'public.site_likes'::regclass;

-- 2. There should be exactly one SELECT policy for anon/authenticated.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'site_likes';

-- 3. anon/authenticated should have SELECT only — no INSERT/UPDATE/DELETE/ALL.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'site_likes'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 4. The RPC should be SECURITY DEFINER, executable by anon/authenticated,
--    accept only ±1, and clamp the value with greatest(0, count + delta).
select p.proname,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'adjust_site_likes';
```

Then periodically verify the following (or compare the query output against it):

1. **RLS is enabled** on `public.site_likes` (the SQL in section 3 does this).
2. **Only SELECT is granted** to `anon` / `authenticated` on the table. There
   must be no INSERT, UPDATE or DELETE grant.
3. **The read policy exists** and only allows SELECT (`Anyone can read the like
count`).
4. **The RPC is the only write path.**
   `public.adjust_site_likes(integer)` is `SECURITY DEFINER`, accepts only
   `+1`/`-1` (anything else is ignored), throttles each client IP to 10 changes
   an hour, clamps the value with `greatest(0, count + delta)`, and EXECUTE is
   granted only to `anon`/`authenticated`. Confirm `revoke all ... from public`
   was run.
5. **The client still only sends ±1.** `script.js` calls it with `1` or `-1`,
   and the function rejects anything else. The per-IP throttle is best effort:
   a client that spoofs `x-forwarded-for` can bypass it, and a static site has
   no per-account identity. A hard limit needs Supabase auth or a server
   endpoint that holds the secret.
6. **Rotate the old key** (see step 4) because it remains in git history, and
   rotate again whenever you suspect misuse. Treat a publishable key as a public
   identifier, not a credential — but do not reintroduce it into tracked files.

If you cannot confirm items 1–5, leave the environment variables unset — the
site works fine with the per-browser fallback counter.
