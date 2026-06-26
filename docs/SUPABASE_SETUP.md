# Global leaderboard setup (Supabase)

Cosmic Merge can show a global "top scores" board backed by a free
[Supabase](https://supabase.com) project. Until configured, the game
automatically falls back to the local (per-browser) leaderboard — no setup
is required to play.

## 1. Create a free Supabase project

1. Go to https://supabase.com and sign in / sign up.
2. Click **New project**, pick an organization, name, password, and region.
3. Wait for the project to finish provisioning.

## 2. Create the `scores` table

Open **SQL Editor** in the Supabase dashboard, paste the following, and run it:

```sql
create table if not exists scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) <= 20),
  score int not null check (score >= 0),
  max_tier int not null default 0,
  created_at timestamptz default now()
);

alter table scores enable row level security;

create policy "anon can insert" on scores for insert to anon with check (true);
create policy "anon can read" on scores for select to anon using (true);
```

This creates the table and allows the public (anon) API key to insert new
scores and read the leaderboard, without exposing any other tables/data.

### Enabling country flags (optional)

To show a country flag next to each name, add a `country` column. The game
already sends/reads it and degrades gracefully until this runs — scores keep
working without flags in the meantime, so this can be applied any time:

```sql
alter table scores add column if not exists country text;
```

Once added, new scores store the player's chosen country (ISO alpha-2 code)
and the leaderboard shows the matching flag emoji. Existing rows stay
flag-less (their `country` is null).

## 3. Copy your API credentials

1. In the Supabase dashboard, go to **Settings → API**.
2. Copy the **Project URL** (e.g. `https://xxxxxxxx.supabase.co`).
3. Copy the **anon / public** API key (this key is safe to ship in a
   client-side app — it can only do what the RLS policies above allow).

## 4. Paste into `src/config.ts`

Edit `src/config.ts`:

```ts
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJ...'
```

Leave both as empty strings (`''`) to keep using the local-only
leaderboard.

## 5. Commit and deploy

Commit your changes and push to `main` — GitHub Actions will build and
deploy automatically.

```sh
git add src/config.ts
git commit -m "config: enable global leaderboard via Supabase"
git push origin main
```

Once deployed, the game-over screen will submit each final score to the
`scores` table and show the global top 10.
