# Hindu Mahabala Yuva Sena- DDML — Ganesh Festival Tracker

Minimal Supabase-powered webapp for tracking festival income and expenses.

## Current access model
- No account/login screen.
- Everyone opens as a viewer.
- Editors tap "Unlock editor", enter their name and an editor PIN.
- Editors can add and delete transactions.
- All users can view the shared dashboard and export CSV.
- The editor PIN is stored in `app.js`; change it before hosting.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` in `app.js`.
4. Change `EDITOR_PIN` in `app.js`.
5. Host the folder on your preferred static host.

## Important security note
This soft-login design is convenient but is not strong authentication. Anyone who can inspect the frontend can discover the PIN. It is suitable for a trusted village/team environment where the main goal is simplicity. For stronger editor security, use Supabase Auth and role-based RLS later.
