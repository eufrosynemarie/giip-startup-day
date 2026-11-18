// Roll call for the GIIP Insight day firm visits.
//
// One private JSON blob holds every check-in:
//   { checks: { "<visitId>": { "<participant>": { by, at } } } }
// Writes use the blob's ETag (ifMatch) so two staff ticking girls at the
// same moment never overwrite each other; a conflict just retries.
//
// No login: staff tap their name in the tab. The names are already public
// on the page, so the only thing stored here is who is present.

import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

const PATH = 'rollcall/state.json';
const VISITS = new Set([
  'am-priveq', 'am-urban-partners', 'am-monterro',
  'pm-novax', 'pm-axcel', 'pm-fsn-capital', 'pm-altor',
]);
const STAFF = new Set(['Emily Quan', 'Salma Axelsson Luedtke', 'Emmy Sendow', 'Karin Nordin']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function storageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function readState() {
  const res = await get(PATH, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { state: { checks: {} }, etag: null };
  const text = await new Response(res.stream).text();
  let state;
  try { state = JSON.parse(text); } catch { state = { checks: {} }; }
  if (!state || typeof state.checks !== 'object') state = { checks: {} };
  return { state, etag: res.blob.etag };
}

async function writeState(state, etag) {
  const opts = {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
  };
  if (etag) { opts.allowOverwrite = true; opts.ifMatch = etag; }
  else { opts.allowOverwrite = false; } // first write: fail if someone beat us to it
  await put(PATH, JSON.stringify(state), opts);
}

export async function GET() {
  if (!storageReady()) return json({ error: 'no-storage' }, 503);
  try {
    const { state } = await readState();
    return json({ checks: state.checks, now: new Date().toISOString() });
  } catch (err) {
    console.error('rollcall GET failed', err);
    return json({ error: 'read-failed' }, 500);
  }
}

export async function POST(request) {
  if (!storageReady()) return json({ error: 'no-storage' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const { visit, person, present, by } = body || {};
  if (!VISITS.has(visit)) return json({ error: 'bad-visit' }, 400);
  if (typeof person !== 'string' || !person || person.length > 120) return json({ error: 'bad-person' }, 400);
  if (typeof present !== 'boolean') return json({ error: 'bad-present' }, 400);
  const who = STAFF.has(by) ? by : 'GAIN team';

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { state, etag } = await readState();
      const visitChecks = state.checks[visit] || (state.checks[visit] = {});
      if (present) {
        if (!visitChecks[person]) visitChecks[person] = { by: who, at: new Date().toISOString() };
      } else {
        delete visitChecks[person];
      }
      await writeState(state, etag);
      return json({ checks: state.checks, now: new Date().toISOString() });
    } catch (err) {
      const conflict = err instanceof BlobPreconditionFailedError ||
        /already exists|precondition/i.test(String(err && err.message));
      if (!conflict) {
        console.error('rollcall POST failed', err);
        return json({ error: 'write-failed' }, 500);
      }
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
    }
  }
  return json({ error: 'busy' }, 409);
}
