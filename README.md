# GIIP Startup Day — GAIN Sweden

A self-contained static landing page for GIIP Startup Day. The page is a
single file — [`index.html`](index.html) — with no build step.

Live at https://giip-gain-swe.vercel.app/

## Roll call tab

The **Roll call** tab (direct link: `/#rollcall`) lets the GAIN team tick off
each girl as she arrives at each firm visit. It talks to one serverless
function, [`api/rollcall.js`](api/rollcall.js), which keeps every check-in in
a private Vercel Blob (`rollcall/state.json`). Everyone polling the tab sees
the same list within a few seconds.

Needs two environment variables on the Vercel project:

- `ROLLCALL_CODE` — the staff code typed once on each phone
- `BLOB_READ_WRITE_TOKEN` — added automatically when a Blob store is
  connected to the project (Vercel dashboard → Storage)

The girls' names come from the group cards already in the page, so no new
personal data lives in the repo.

## Deploy

Hosted on Vercel, which auto-deploys on every push to `main`. Vercel installs
`@vercel/blob` for the function; there is no build command.
