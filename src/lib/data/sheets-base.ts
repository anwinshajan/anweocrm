// ============================================================
// Google Sheets Base Layer
// - Batched reads/writes
// - In-memory cache with TTL + invalidation
// - Retry with exponential backoff on 429
// - Write queue to prevent concurrent overwrites
// - Tolerates extra/missing columns
// ============================================================

import { getSheetsClient, SHEET_ID } from './sheets-client';
import { TABS, HEADERS } from './tabs';

// ─── Cache ───────────────────────────────────────────────────

interface CacheEntry {
  data: string[][];
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry>();

function cacheKey(tab: string) {
  return tab;
}

function getFromCache(tab: string): string[][] | null {
  const entry = cache.get(cacheKey(tab));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(cacheKey(tab));
    return null;
  }
  return entry.data;
}

function setCache(tab: string, data: string[][]) {
  cache.set(cacheKey(tab), { data, fetchedAt: Date.now() });
}

export function invalidateCache(tab?: string) {
  if (tab) {
    cache.delete(cacheKey(tab));
  } else {
    cache.clear();
  }
}

// ─── Retry ───────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { code?: number; status?: number; message?: string };
      const isRateLimit =
        e?.code === 429 || e?.status === 429 ||
        (e?.message ?? '').includes('Quota exceeded') ||
        (e?.message ?? '').includes('RESOURCE_EXHAUSTED');
      if (!isRateLimit || i === retries) {
        lastError = err;
        break;
      }
      const delay = Math.min(1000 * 2 ** i + Math.random() * 500, 32_000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Write queue ─────────────────────────────────────────────

type QueuedWrite = {
  tab: string;
  range: string;
  values: string[][];
  resolve: (v: void) => void;
  reject: (e: unknown) => void;
};

let writeQueue: QueuedWrite[] = [];
let queueRunning = false;

async function flushWriteQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (writeQueue.length > 0) {
    const item = writeQueue.shift()!;
    try {
      await withRetry(() =>
        getSheetsClient().spreadsheets.values.update({
          spreadsheetId: SHEET_ID(),
          range: item.range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: item.values },
        })
      );
      item.resolve();
    } catch (e) {
      item.reject(e);
    }
    // small pause to avoid burst writes
    await new Promise((r) => setTimeout(r, 100));
  }
  queueRunning = false;
}

function enqueueWrite(tab: string, range: string, values: string[][]): Promise<void> {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    writeQueue.push({ tab, range, values, resolve, reject });
    flushWriteQueue();
  });
}

// ─── Apps Script Adapter ──────────────────────────────────────

async function callAppsScript<T>(payload: { action: string; [key: string]: unknown }): Promise<T> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) throw new Error('GOOGLE_APPS_SCRIPT_URL is not set');

  const res = await withRetry(async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Apps Script responded with status ${response.status}`);
    }
    const json = await response.json();
    if (json.error) {
      throw new Error(`Apps Script Error: ${json.error}`);
    }
    return json as T;
  });

  return res;
}

// ─── Public helpers ───────────────────────────────────────────

/**
 * Read all rows from a tab (with cache). Returns raw 2D string array.
 */
export async function readTab(tab: string): Promise<string[][]> {
  const cached = getFromCache(tab);
  if (cached) return cached;

  // 1. Google Apps Script Webhook
  if (process.env.GOOGLE_APPS_SCRIPT_URL && !process.env.GOOGLE_APPS_SCRIPT_URL.includes('your-apps-script-url')) {
    try {
      const res = await callAppsScript<{ data: string[][] }>({
        action: 'readTab',
        tab,
      });
      const data = res.data && res.data.length > 0 ? res.data : [HEADERS[tab] || []];
      setCache(tab, data);
      return data;
    } catch (e) {
      console.error(`[readTab:AppsScript] Failed to read ${tab}:`, e);
      throw e;
    }
  }


  // 3. Google Sheets API (Service Account)
  const res = await withRetry(() =>
    getSheetsClient().spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: tab,
    })
  );

  const data = (res.data.values as string[][] | null) ?? [];
  setCache(tab, data);
  return data;
}

/**
 * Convert raw rows into objects using the first row as headers.
 * Tolerates extra/missing columns.
 */
export function rowsToObjects<T extends Record<string, string>>(rows: string[][]): T[] {
  if (rows.length < 1) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj as T;
  });
}

/**
 * Safely convert an entity to a Record<string, string> for sheet writes.
 * Any undefined values become empty strings.
 */
export function toRecord(obj: unknown): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    record[k] = v == null ? '' : String(v);
  }
  return record;
}

/**
 * Convert objects back to rows, using headers array to control column order.
 */
export function objectsToRows<T>(
  headers: string[],
  items: T[]
): string[][] {
  return items.map((item) => {
    const record = toRecord(item);
    return headers.map((h) => record[h] ?? '');
  });
}

/**
 * Read a tab and return typed objects.
 */
export async function readObjects<T extends Record<string, string>>(
  tab: string
): Promise<T[]> {
  const rows = await readTab(tab);
  return rowsToObjects<T>(rows);
}

/**
 * Append one or more rows to a tab.
 * Invalidates cache.
 */
export async function appendRows(tab: string, rows: string[][]): Promise<void> {
  // 1. Google Apps Script Webhook
  if (process.env.GOOGLE_APPS_SCRIPT_URL && !process.env.GOOGLE_APPS_SCRIPT_URL.includes('your-apps-script-url')) {
    await callAppsScript({
      action: 'appendRows',
      tab,
      rows,
    });
    invalidateCache(tab);
    return;
  }


  // 3. Service Account API
  await withRetry(() =>
    getSheetsClient().spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range: tab,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
  );
  invalidateCache(tab);
}

/**
 * Overwrite a specific row by its 1-based sheet row index.
 * Queued to prevent race conditions.
 */
export async function updateRow(
  tab: string,
  rowIndex: number,
  headers: string[],
  obj: unknown
): Promise<void> {
  const record = obj as Record<string, string>;
  const values = headers.map((h) => record[h] ?? '');

  // 1. Google Apps Script Webhook
  if (process.env.GOOGLE_APPS_SCRIPT_URL && !process.env.GOOGLE_APPS_SCRIPT_URL.includes('your-apps-script-url')) {
    await callAppsScript({
      action: 'updateRow',
      tab,
      rowIndex,
      values,
    });
    invalidateCache(tab);
    return;
  }

  // 2. Service Account / Mock Queue
  const range = `${tab}!A${rowIndex}`;
  await enqueueWrite(tab, range, [values]);
  invalidateCache(tab);
}

/**
 * Overwrite all data rows in a tab (row 2 onwards), preserving header.
 * Used for bulk updates.
 */
export async function overwriteDataRows(
  tab: string,
  headers: string[],
  items: Record<string, string>[]
): Promise<void> {
  const rows = items.length > 0 ? objectsToRows(headers, items as Record<string, string>[]) : [];

  // 1. Google Apps Script Webhook
  if (process.env.GOOGLE_APPS_SCRIPT_URL && !process.env.GOOGLE_APPS_SCRIPT_URL.includes('your-apps-script-url')) {
    await callAppsScript({
      action: 'overwriteDataRows',
      tab,
      headers,
      rows,
    });
    invalidateCache(tab);
    return;
  }

  // 2. Clear from row 2 down, then write
  await withRetry(() =>
    getSheetsClient().spreadsheets.values.clear({
      spreadsheetId: SHEET_ID(),
      range: `${tab}!A2:ZZ`,
    })
  );

  if (items.length > 0) {
    await appendRows(tab, rows);
  }
  invalidateCache(tab);
}

/**
 * Ensure a tab exists with the given headers.
 * If the tab doesn't exist, create it. If it does, verify/add missing columns.
 * Safe to run multiple times (idempotent).
 */
export async function ensureTab(
  spreadsheetId: string,
  tab: string,
  headers: string[]
): Promise<void> {
  if (process.env.GOOGLE_APPS_SCRIPT_URL && !process.env.GOOGLE_APPS_SCRIPT_URL.includes('your-apps-script-url')) {
    await callAppsScript({
      action: 'initSheets',
      headers: { [tab]: headers },
    });
    return;
  }

  if (!process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_ID.includes('your-google-sheet-id')) {
    return;
  }

  const sheets = getSheetsClient();

  // Get existing sheet metadata
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({ spreadsheetId })
  );
  const existingSheets = meta.data.sheets ?? [];
  const exists = existingSheets.some(
    (s) => s.properties?.title === tab
  );

  if (!exists) {
    // Create tab
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: tab },
              },
            },
          ],
        },
      })
    );
    // Write headers
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      })
    );
  } else {
    // Tab exists — check for missing columns
    const res = await withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!1:1`,
      })
    );
    const existingHeaders: string[] = (res.data.values?.[0] as string[]) ?? [];
    const missing = headers.filter((h) => !existingHeaders.includes(h));
    if (missing.length > 0) {
      const newHeaders = [...existingHeaders, ...missing];
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tab}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newHeaders] },
        })
      );
    }
  }
}

/**
 * Find the sheet row index (1-based, including header row) of a matching object.
 */
export async function findRowIndex(
  tab: string,
  matchFn: (obj: Record<string, string>) => boolean
): Promise<number | null> {
  const rows = await readTab(tab);
  if (rows.length < 2) return null;
  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, string> = {};
    rows[0].forEach((h, j) => {
      obj[h] = rows[i][j] ?? '';
    });
    if (matchFn(obj)) return i + 1; // 1-based sheet row
  }
  return null;
}

/**
 * Get the headers for a given tab.
 */
export async function getHeaders(tab: string): Promise<string[]> {
  const rows = await readTab(tab);
  return rows[0] ?? [];
}
