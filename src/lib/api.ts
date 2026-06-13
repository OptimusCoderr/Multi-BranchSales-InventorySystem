/**
 * MongoDB Atlas Data API client.
 *
 * Atlas exposes a REST endpoint at:
 *   https://data.mongodb-api.com/app/{appId}/endpoint/data/v1/action/{action}
 *
 * All credentials come from Vite env vars that are baked at build-time and
 * are therefore visible to the browser — the same trust model as Supabase's
 * anon key.  Sensitive operations are protected server-side by Atlas App
 * Services rules (analogous to RLS).
 *
 * TOKEN SECURITY
 * --------------
 * We store the JWT in module-level memory only — never localStorage or
 * sessionStorage — so it cannot be stolen by an XSS script that reads
 * storage APIs.  The tradeoff is that the token is lost on page refresh,
 * which requires re-login (acceptable for an internal business tool).
 */

const BASE_URL = import.meta.env.VITE_MONGO_DATA_API_URL;
const API_KEY  = import.meta.env.VITE_MONGO_API_KEY;
const DB_NAME  = import.meta.env.VITE_MONGO_DB_NAME || 'biztrack';

if (!BASE_URL || !API_KEY) {
  console.error(
    '[api] VITE_MONGO_DATA_API_URL or VITE_MONGO_API_KEY is not set. ' +
    'Copy .env.example to .env and fill in the values.'
  );
}

// ─── In-memory auth token (never touches localStorage) ───────────────────────
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

// ─── Low-level fetch wrapper ──────────────────────────────────────────────────
async function dataApiRequest(action: string, body: object): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
  };

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const res = await fetch(`${BASE_URL}/action/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ dataSource: 'Cluster0', database: DB_NAME, ...body }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export async function findOne(collection: string, filter: object): Promise<any> {
  const data = await dataApiRequest('findOne', { collection, filter });
  return data.document ?? null;
}

export async function find(
  collection: string,
  filter: object = {},
  options: { sort?: object; limit?: number; projection?: object } = {}
): Promise<any[]> {
  const data = await dataApiRequest('find', { collection, filter, ...options });
  return data.documents ?? [];
}

export async function insertOne(collection: string, document: object): Promise<string> {
  const data = await dataApiRequest('insertOne', { collection, document });
  return data.insertedId;
}

export async function updateOne(
  collection: string,
  filter: object,
  update: object,
  upsert = false
): Promise<number> {
  const data = await dataApiRequest('updateOne', { collection, filter, update, upsert });
  return data.modifiedCount + (data.upsertedCount ?? 0);
}

export async function deleteOne(collection: string, filter: object): Promise<number> {
  const data = await dataApiRequest('deleteOne', { collection, filter });
  return data.deletedCount;
}

export async function aggregate(collection: string, pipeline: object[]): Promise<any[]> {
  const data = await dataApiRequest('aggregate', { collection, pipeline });
  return data.documents ?? [];
}

// ─── Typed collection names ───────────────────────────────────────────────────
export const Collections = {
  USERS:           'users',
  BRANCHES:        'branches',
  WAREHOUSES:      'warehouses',
  PRODUCTS:        'products',
  BRANCH_STOCK:    'branch_stock',
  WAREHOUSE_STOCK: 'warehouse_stock',
  SALES:           'sales',
  DAILY_REPORTS:   'daily_reports',
  DEPTORS:         'debtors',
  EXPENSES:        'expenses',
} as const;
