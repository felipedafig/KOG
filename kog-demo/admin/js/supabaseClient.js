// ============================================================================
// DEMO MODE — drop-in replacement for the real Supabase client.
//
// The rest of the app is IDENTICAL to the production code; only this file is
// swapped. It answers every query from the in-memory fixtures in demo-data.js:
// no backend, no network, no authentication.
//
//   - Opening /admin/      -> you are a signed-in STAFF member
//   - Opening /mijn-pand/  -> you are a signed-in CLIENT (sees 2 of 4 properties,
//                             the same slice row-level security would give them)
//
// Writes (new property, new entry, photo upload, portal access) work and are
// visible immediately — they live in memory and reset on refresh.
// ============================================================================

import { DB, CLIENT_PROPERTY_IDS, DEMO_STAFF, DEMO_CLIENT } from './demo-data.js';

/* ---------------- role & session (derived from which app you opened) ------ */

const IS_STAFF = location.pathname.includes('/admin/');
const PERSONA = IS_STAFF ? DEMO_STAFF : DEMO_CLIENT;

const SESSION = {
  access_token: 'demo-token',
  user: {
    id: 'demo-user',
    email: PERSONA.email,
    app_metadata: { user_role: IS_STAFF ? 'staff' : 'client' },
    user_metadata: { full_name: PERSONA.full_name, must_change_password: false },
  },
};

/* ---------------- relations (mirrors the real schema's FKs) --------------- */

const PARENT = {
  building_components: { properties: 'property_id' },
  maintenance_entries: { building_components: 'component_id' },
  maintenance_photos: { maintenance_entries: 'entry_id' },
  quote_photos: { quote_requests: 'quote_id' },
  property_users: { properties: 'property_id' },
};

/* ---------------- tiny PostgREST-style select parser ---------------------- */

function splitTop(sel) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseSelect(sel) {
  return splitTop(sel || '*').map(tok => {
    const m = tok.match(/^([\w]+)\((.*)\)$/s);
    return m ? { rel: m[1], fields: parseSelect(m[2]) } : { field: tok };
  });
}

function project(table, row, fields) {
  const out = {};
  for (const f of fields) {
    if (f.field) {
      if (f.field === '*') Object.assign(out, row);
      else out[f.field] = row[f.field];
    } else {
      out[f.rel] = resolveRel(table, row, f.rel, f.fields);
    }
  }
  return out;
}

function resolveRel(table, row, rel, fields) {
  const up = PARENT[table]?.[rel];
  if (up) {
    const parent = (DB[rel] || []).find(r => r.id === row[up]);
    return parent ? project(rel, parent, fields) : null;
  }
  const down = PARENT[rel]?.[table];
  if (down) {
    return (DB[rel] || []).filter(r => r[down] === row.id).map(r => project(rel, r, fields));
  }
  return null;
}

/* ---------------- query builder ------------------------------------------- */

function rowsFor(tableName) {
  let rows = DB[tableName] || [];
  // Emulate RLS: a client only ever sees their own linked properties.
  if (!IS_STAFF && tableName === 'properties') {
    rows = rows.filter(r => CLIENT_PROPERTY_IDS.includes(r.id));
  }
  return rows;
}

class Query {
  constructor(tableName) {
    this.tableName = tableName;
    this.op = 'select';
    this.sel = '*';
    this.filters = [];
    this.orderings = [];
    this.wantSingle = false;
    this.payload = null;
  }
  select(sel) { if (this.op === 'select') this.sel = sel || '*'; return this; }
  insert(payload) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col, val) { this.filters.push(r => r[col] === val); return this; }
  not(col, operator, val) {
    if (operator === 'is' && val === null) this.filters.push(r => r[col] !== null && r[col] !== undefined);
    return this;
  }
  order(col, opts = {}) { this.orderings.push({ col, asc: opts.ascending !== false }); return this; }
  single() { this.wantSingle = true; return this; }

  exec() {
    try {
      if (this.op === 'insert') {
        const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(p => ({
          id: p.id || (crypto.randomUUID ? crypto.randomUUID() : 'demo-' + Math.random().toString(36).slice(2)),
          created_at: p.created_at || new Date().toISOString(),
          ...p,
        }));
        (DB[this.tableName] = DB[this.tableName] || []).push(...items);
        return this.finish(items);
      }

      let rows = rowsFor(this.tableName).filter(r => this.filters.every(f => f(r)));

      if (this.op === 'update') {
        rows.forEach(r => Object.assign(r, this.payload));
        return this.finish(rows);
      }
      if (this.op === 'delete') {
        DB[this.tableName] = (DB[this.tableName] || []).filter(r => !rows.includes(r));
        return this.finish(rows);
      }

      for (const { col, asc } of [...this.orderings].reverse()) {
        rows = [...rows].sort((a, b) => {
          const x = a[col] ?? '', y = b[col] ?? '';
          return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1);
        });
      }
      const fields = parseSelect(this.sel);
      return this.finish(rows.map(r => project(this.tableName, r, fields)));
    } catch (err) {
      return { data: null, error: { message: String(err?.message || err) } };
    }
  }

  finish(rows) {
    if (this.wantSingle) {
      return rows.length
        ? { data: rows[0], error: null }
        : { data: null, error: { message: 'Row not found (demo)' } };
    }
    return { data: rows, error: null };
  }

  // Awaiting the builder executes it, like supabase-js.
  then(resolve, reject) { return Promise.resolve(this.exec()).then(resolve, reject); }
}

/* ---------------- storage: photos resolve to bundled demo images ---------- */

const uploadedThisSession = new Map(); // storage_path -> object URL

const storage = {
  from() {
    return {
      async createSignedUrl(path) {
        const url = uploadedThisSession.get(path)
          || new URL('../../assets/' + path, import.meta.url).href;
        return { data: { signedUrl: url }, error: null };
      },
      async upload(path, file) {
        uploadedThisSession.set(path, URL.createObjectURL(file));
        return { data: { path }, error: null };
      },
    };
  },
};

/* ---------------- edge functions: portal-access management ---------------- */

function demoPassword() {
  return 'Kog-Demo-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-2026';
}

const functions = {
  async invoke(name, { body } = {}) {
    if (name === 'create-client-account') {
      if (body?.action === 'create') {
        DB.property_users.push({
          property_id: body.property_id,
          user_id: 'demo-' + Math.random().toString(36).slice(2, 10),
          email: body.email,
          created_at: new Date().toISOString(),
        });
        return { data: { status: 'created', temp_password: demoPassword() }, error: null };
      }
      if (body?.action === 'reset_password') {
        return { data: { status: 'reset_password', temp_password: demoPassword() }, error: null };
      }
    }
    return { data: null, error: { message: `demo: function ${name} not simulated` } };
  },
};

/* ---------------- auth: always signed in, role follows the app ------------ */

const auth = {
  async getSession() { return { data: { session: SESSION } }; },
  async refreshSession() { return { data: { session: SESSION } }; },
  onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
  async signOut() { location.href = '../'; return { error: null }; },
  async signInWithPassword() { return { data: { session: SESSION }, error: null }; },
  async updateUser() { return { data: { user: SESSION.user }, error: null }; },
};

export const supabase = {
  from: (tableName) => new Query(tableName),
  auth,
  storage,
  functions,
};
