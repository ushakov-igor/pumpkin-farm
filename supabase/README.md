# Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor and run:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
   - `supabase/policies.sql`
3. Enable Realtime for `public.presence` table in Dashboard (Database -> Replication).
4. Copy `Project URL` and `anon public key` into `src/services/supabase.js`.

Notes:
- Current policies are permissive for MVP. Tighten later.
- Presence updates should be throttled to reduce writes.
