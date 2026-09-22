# GIIP Startup Day — GAIN Sweden

A self-contained static landing page for GIIP Startup Day. The whole page is a
single file — [`index.html`](index.html) — with no build step and no backend.

## Deploy

Hosted on Vercel, which auto-deploys on every push to `main`. Once the repo is
imported in Vercel (framework preset **Other**, no build command), deploying is
just `git push`.

## Roll call

[`rollcall.html`](rollcall.html) is a separate single-file page, served at
`/rollcall`, for checking students in on the day.

This repo is public, so the student list is **not** stored in the clear. It is
AES-256-GCM ciphertext, unlocked in the browser with a key derived from a shared
team code via PBKDF2-SHA256. Without the code the page shows only a lock screen,
and the repository source shows only base64. The code is shared with the team
directly and is deliberately not recorded here.

Check-ins are held in `localStorage`, per browser and per device. Nothing is sent
to a server, and the page is served `noindex`.

To change the list or the code, re-encrypt the roster and replace the `VAULT`
literal near the top of the page's script.
