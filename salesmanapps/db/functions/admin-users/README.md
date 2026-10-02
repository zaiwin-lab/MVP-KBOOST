# admin-users

The deployed source of this function lives in the Supabase project
(`ebjsyramwnyekufvowft`), where it is versioned by Supabase itself. It is
recorded here so the repository is not silent about a piece of server-side code
the portal depends on.

It holds the **service role key** as a function secret. That key bypasses row
level security entirely, which is why opening a login, changing a password and
revoking access cannot be done from the browser.

Every request is authorised twice — the caller's token must be valid, and the
profile behind it must be management and active. See `../README.md` for the
rules it enforces and what each action does.

To read or redeploy it, use the Supabase dashboard or CLI for this project.
