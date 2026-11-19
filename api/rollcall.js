// Roll call for the GIIP Insight day firm visits.
//
// Each staff member has their own private JSON blob:
//   rollcall/staff/<slug>.json = { records: { "<visit>|<person>": { visit, person, present, at } } }
// A record is one tap: "this girl is here" (present: true) or "not here"
// (present: false), with the time of the tap. For each girl at each visit the
// newest record across all staff wins.
//
// Why one blob per person: the first version kept everyone's taps in one
// shared file, so two phones saving at the same moment could overwrite each
// other and check-ins went missing. Now a phone only ever writes its own
// staff member's file, and it always sends every tap it has made, so a save
// that is retried or repeated can only add what is missing, never lose it.
// No ETag checks: in production they rejected every write as a conflict.
//
// The old shared file (rollcall/state.json) is still read, so the check-ins
// saved with the first version keep showing.
//
// No login: staff tap their name in the tab. The names are already public
// on the page, so the only thing stored here is who is present.

import { get, put } from '@vercel/blob';

const LEGACY_PATH = 'rollcall/state.json';
const VISITS = new Set([
  'am-priveq', 'am-urban-partners', 'am-monterro',
  'pm-novax', 'pm-axcel', 'pm-fsn-capital', 'pm-altor',
]);
const STAFF = ['Emily Quan', 'Salma Axelsson Luedtke', 'Emmy Sendow', 'Karin Nordin'];
const TEAM = 'GAIN team';
const MAX_RECORDS = 500;

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function staffPath(name) { return 'rollcall/staff/' + slug(name) + '.json'; }

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function storageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function readJson(path) {
  const res = await get(path, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200 || !res.stream) return { data: null, etag: null };
  const text = await new Response(res.stream).text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  return { data, etag: res.blob.etag };
}

function cleanRecord(r) {
  if (!r || typeof r !== 'object') return null;
  const { visit, person, present, at } = r;
  if (!VISITS.has(visit)) return null;
  if (typeof person !== 'string' || !person || person.length > 120) return null;
  if (typeof present !== 'boolean') return null;
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return null;
  return { visit, person, present, at: new Date(t).toISOString() };
}

function newer(a, b) { return !b || Date.parse(a.at) > Date.parse(b.at); }

// Every staff file plus the old shared file, merged: newest tap wins.
// `own` replaces one staff member's file with what was just written, so a
// read that lags behind the write cannot hide a fresh save.
async function readAll(own) {
  const names = [...STAFF, TEAM];
  const [legacy, ...files] = await Promise.all([
    readJson(LEGACY_PATH).catch(() => ({ data: null })),
    ...names.map((n) => readJson(staffPath(n))),
  ]);

  const best = {};
  const legacyChecks = legacy.data && typeof legacy.data.checks === 'object' ? legacy.data.checks : {};
  for (const visit of Object.keys(legacyChecks)) {
    for (const [person, c] of Object.entries(legacyChecks[visit] || {})) {
      const r = cleanRecord({ visit, person, present: true, at: c && c.at });
      if (r) best[visit + '|' + person] = { ...r, by: (c && c.by) || TEAM };
    }
  }
  names.forEach((name, i) => {
    const recs = own && own.name === name ? own.records : ((files[i].data && files[i].data.records) || {});
    for (const raw of Object.values(recs)) {
      const r = cleanRecord(raw);
      if (!r) continue;
      const key = r.visit + '|' + r.person;
      if (newer(r, best[key])) best[key] = { ...r, by: name };
    }
  });

  const checks = {};
  for (const r of Object.values(best)) {
    if (!r.present) continue;
    (checks[r.visit] || (checks[r.visit] = {}))[r.person] = { by: r.by, at: r.at };
  }
  return { checks };
}

export async function GET() {
  if (!storageReady()) return json({ error: 'no-storage' }, 503);
  try {
    const { checks } = await readAll();
    return json({ checks, now: new Date().toISOString() });
  } catch (err) {
    console.error('rollcall GET failed', err);
    return json({ error: 'read-failed' }, 500);
  }
}

export async function POST(request) {
  if (!storageReady()) return json({ error: 'no-storage' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
  body = body || {};
  const who = STAFF.includes(body.by) ? body.by : TEAM;

  // New pages send { by, records: [...] }. Pages still open from before send
  // a single tap { visit, person, present, by }.
  let incoming;
  if (Array.isArray(body.records)) {
    if (body.records.length > MAX_RECORDS) return json({ error: 'too-many' }, 400);
    incoming = body.records.map(cleanRecord);
    if (incoming.some((r) => !r)) return json({ error: 'bad-record' }, 400);
  } else {
    const r = cleanRecord({ ...body, at: new Date().toISOString() });
    if (!r) return json({ error: 'bad-record' }, 400);
    incoming = [r];
  }

  // Only this staff member's phone writes this file, and it always sends
  // every tap it has, so a plain overwrite is safe. The read is only there to
  // keep taps made earlier on another phone under the same name.
  const path = staffPath(who);
  try {
    const { data } = await readJson(path).catch(() => ({ data: null }));
    const records = { ...((data && data.records) || {}) };
    for (const r of incoming) {
      const key = r.visit + '|' + r.person;
      if (newer(r, records[key])) records[key] = r;
    }
    if (Object.keys(records).length > MAX_RECORDS) return json({ error: 'too-many' }, 400);
    await put(path, JSON.stringify({ records }), {
      access: 'private', contentType: 'application/json',
      addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
    });
    const { checks } = await readAll({ name: who, records });
    return json({ checks, saved: Object.values(records), by: who, now: new Date().toISOString() });
  } catch (err) {
    console.error('rollcall POST failed', err);
    return json({ error: 'write-failed', detail: String(err && err.message || err).slice(0, 200) }, 500);
  }
}
