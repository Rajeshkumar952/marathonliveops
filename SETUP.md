# Supabase setup — Marathon LiveOps Premium V3

1. Create a new Supabase project in the region closest to the event operations.
2. Run `schema.sql` in the SQL Editor.
3. Create the first project row and copy its UUID.
4. Create Auth users for Admin, Ops and Client. For the current UI convention use aliases such as:
   - `admin@users.marathonliveops.in`
   - `ops001@users.marathonliveops.in`
   - `client001@users.marathonliveops.in`
5. Insert matching rows into `profiles` and `project_memberships`.
6. Copy `config.example.js` to `config.js` and enter the Project URL, anon key and project UUID.
7. Change `mode` from `demo` to `cloud`.
8. In Database → Replication/Realtime, enable realtime for `project_snapshots` if not enabled automatically.
9. Keep the `proofs` bucket private. For final launch, replace the demo public-URL helper with signed URLs after Admin verification.
10. Host the folder on Netlify/Vercel/Cloudflare Pages or your production web host over HTTPS.

## Security rule
Never put the Supabase `service_role` key in `config.js`, HTML or browser JavaScript. User provisioning and password resets that need elevated privileges must run in a Supabase Edge Function or another trusted server.
