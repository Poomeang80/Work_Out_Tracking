# Iron Home — GitHub Pages + Supabase

1. Open `index.html` and replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the Project URL and anon/publishable key from Supabase. Never use the `service_role` key.
2. Run both SQL files in filename order in Supabase SQL Editor.
3. In Supabase Authentication → URL Configuration, set Site URL to your GitHub Pages URL and add it to Redirect URLs.
4. Deploy this folder to GitHub Pages.
5. In the app, open Settings and create/sign in to a Supabase Auth account. Use the same email on every device. The app login is not a GitHub login.
6. After updating, hard refresh each device once. Realtime, focus/visibility refresh, and 30-second polling then keep open devices current.

`Sync now` downloads the Cloud row. Local changes auto-save after a short debounce. The local cache remains available offline.
