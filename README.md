# GIIP Startup Day — GAIN Sweden

A self-contained static landing page for GIIP Startup Day. The page is a
single file — [`index.html`](index.html) — with no build step.

Live at https://giip-gain-swe.vercel.app/

## Roll call tab

The **Roll call** tab (direct link: `/#rollcall`) lets the GAIN team tick off
each girl as she arrives at each firm visit. Taps are kept on the phone until
you press **Save roll call**; the button says *All saved ✓* only once the
server has sent every tap back. It talks to one serverless function,
[`api/rollcall.js`](api/rollcall.js), which keeps each staff member's taps in
their own private Vercel Blob (`rollcall/staff/<name>.json`), so two phones
saving at once can't overwrite each other. The newest tap for each girl wins.
The old shared file (`rollcall/state.json`) is still read for check-ins saved
before this change. Everyone polling the tab sees the same list within a few
seconds.

There is no login: each person taps their name once and the phone remembers
it. Storage comes from the `giip-rollcall` Blob store connected to the
project (Vercel dashboard → Storage), which sets `BLOB_STORE_ID`.

The girls' names come from the group cards already in the page, so no new
personal data lives in the repo.

## Deploy

Hosted on Vercel, which auto-deploys on every push to `main`. Vercel installs
`@vercel/blob` for the function; there is no build command.
