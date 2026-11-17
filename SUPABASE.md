# Shared likes with Supabase — setup guide

The site currently stores likes **per browser** in `localStorage`. Follow this
once and every visitor will see the same, shared count.

The code is already in place (`supabase-config.js` + `script.js`). You only need
to create a free Supabase project, run one SQL query, and paste two values.

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
- **anon public** key — a long string starting with `eyJ...`

The anon key is *designed to be public* — it is safe to put in a static site.
The database is protected by Row Level Security (set up in the next step), so
nobody can use it to read or write anything except the like count.

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
create or replace function public.adjust_site_likes(delta integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update site_likes
     set count = greatest(0, count + delta)
   where id = 1
  returning count;
$$;

revoke all on function public.adjust_site_likes(integer) from public;
grant execute on function public.adjust_site_likes(integer) to anon, authenticated;
```

You should see `Success. No rows returned`. It is safe to run the query again.

## 4. Turn it on

Open `supabase-config.js` and fill in the two values from step 2:

```js
window.AZHAR_SUPABASE = {
  url: "https://abcdefgh.supabase.co",
  anonKey: "eyJ...",
};
```

Commit and push. Once GitHub Pages rebuilds, the heart count is shared by
everyone. If you would rather not edit files, just send me the URL and key and
I will do this step for you.

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
