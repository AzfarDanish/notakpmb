// D1 → Supabase data migration for NotaKPMB.
// Usage:
//   export $(grep -v '^#' .env.local | xargs)   # needs CLOUDFLARE_* + D1_DATABASE_ID + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   node scripts/migrate-d1-to-supabase.mjs
//
// - Reads every row from D1 via the Cloudflare REST API (source of truth, never modified).
// - Upserts into Supabase in foreign-key order (idempotent: safe to re-run).
// - Converts SQLite/D1 types to Postgres: 0/1 → boolean, datetime strings → ISO, numbers.
// - D1 `admin_sessions` is intentionally skipped (Supabase Auth replaces it).
// - Verifies record counts per table on both sides and exits non-zero on mismatch.

import { createClient } from '@supabase/supabase-js';

const {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  D1_DATABASE_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

for (const [k, v] of Object.entries({ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function d1Rows(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    },
  );
  if (!res.ok) throw new Error(`D1 query failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const result = data.result?.[0];
  if (!data.success || !result?.success) throw new Error(`D1 query failed: ${JSON.stringify(data).slice(0, 300)}`);
  return result.results ?? [];
}

async function d1Count(table) {
  try {
    const rows = await d1Rows(`SELECT COUNT(*) as n FROM ${table}`);
    return Number(rows[0]?.n ?? 0);
  } catch (e) {
    if (String(e.message).includes('no such table')) return null; // table never existed in D1 (e.g. 0007 tables)
    throw e;
  }
}

async function sbCount(table, pk = 'id') {
  const { count, error } = await supabase.from(table).select(pk, { count: 'exact', head: true });
  if (error) throw new Error(`Supabase count ${table}: ${error.message}`);
  return count ?? 0;
}

// 'YYYY-MM-DD HH:MM:SS' (D1) → ISO-8601 (Postgres timestamptz)
function ts(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return new Date(v).toISOString();
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?/.test(s)) return s.replace(' ', 'T') + 'Z';
  return s;
}
const num = (v, d = 0) => (v === null || v === undefined || v === '' ? d : Number(v));
const str = (v, d = '') => (v === null || v === undefined ? d : String(v));

const TABLES = [
  {
    d1: 'programmes',
    sb: 'programmes',
    map: (r) => ({ id: str(r.id), code: str(r.code), title: str(r.title), description: str(r.description), is_hidden: false, position: 0 }),
  },
  {
    d1: 'courses',
    sb: 'courses',
    map: (r) => ({ id: str(r.id), code: str(r.code), title: str(r.title), programme_id: str(r.programme_id), created_at: ts(r.created_at) }),
  },
  {
    d1: 'subjects',
    sb: 'subjects',
    map: (r) => ({ id: str(r.id), subject_id: str(r.subject_id), kind: str(r.kind), title: r.title == null ? null : str(r.title), code: r.code == null ? null : str(r.code), programme_id: r.programme_id == null ? null : str(r.programme_id), created_at: ts(r.created_at) }),
  },
  {
    d1: 'feedback_items',
    sb: 'feedback_items',
    map: (r) => ({ id: str(r.id), body: str(r.body), status: str(r.status) === 'open' ? 'new' : str(r.status), votes_count: num(r.votes_count), created_at: ts(r.created_at), updated_at: ts(r.updated_at) }),
  },
  {
    d1: 'feedback_votes',
    sb: 'feedback_votes',
    map: (r) => ({ feedback_id: str(r.feedback_id), voter_hash: str(r.voter_hash), created_at: ts(r.created_at) }),
  },
  {
    d1: 'feedback_rate_limits',
    sb: 'feedback_rate_limits',
    map: (r) => ({ key: str(r.key), voter_hash: str(r.voter_hash), action: str(r.action), window_start: num(r.window_start), count: num(r.count) }),
  },
];

let failed = false;
for (const t of TABLES) {
  const expected = await d1Count(t.d1);
  if (expected === null) {
    console.log(`${t.d1}: no such table in D1, skipping`);
    continue;
  }
  const rows = await d1Rows(`SELECT * FROM ${t.d1}`);
  if (rows.length) {
    const mapped = rows.map(t.map);
    // Upsert in chunks of 200
    for (let i = 0; i < mapped.length; i += 200) {
      const chunk = mapped.slice(i, i + 200);
      const pk = t.sb === 'feedback_votes' ? 'feedback_id,voter_hash' : t.sb === 'feedback_rate_limits' ? 'key' : 'id';
      const { error } = await supabase.from(t.sb).upsert(chunk, { onConflict: pk });
      if (error) {
        console.error(`${t.sb}: upsert failed: ${error.message}`);
        failed = true;
      }
    }
  }
  const got = await sbCount(t.sb, t.sb === 'feedback_votes' ? 'feedback_id' : t.sb === 'feedback_rate_limits' ? 'key' : 'id');
  const ok = got === expected;
  if (!ok) failed = true;
  console.log(`D1:${t.d1} = ${expected}  Supabase:${t.sb} = ${got}  ${ok ? 'OK' : 'MISMATCH'}`);
}

// Relationship spot-checks (fail loudly, migrate nothing)
const checks = [
  ['orphan votes', 'SELECT COUNT(*) as n FROM feedback_votes v LEFT JOIN feedback_items f ON f.id = v.feedback_id WHERE f.id IS NULL', 'n', 0],
];
for (const [label, sql, col, want] of checks) {
  const rows = await d1Rows(sql);
  const n = Number(rows[0]?.[col] ?? -1);
  console.log(`${label}: ${n} (want ${want}) ${n === want ? 'OK' : 'MISMATCH'}`);
  if (n !== want) failed = true;
}

if (failed) {
  console.error('MIGRATION FAILED verification — investigate before switching traffic.');
  process.exit(1);
}
console.log('Migration verified: all counts match.');
