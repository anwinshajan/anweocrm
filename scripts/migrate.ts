#!/usr/bin/env node
// ============================================================
// ANWEO CRM — Migration Script
// Adds new columns/tabs to live Sheet without deleting data.
// Idempotent — safe to run multiple times.
// ============================================================

import 'dotenv/config';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Current target schema — add new columns here when schema evolves
import { HEADERS } from '../src/lib/data/tabs';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { code?: number; status?: number };
      if ((e?.code === 429 || e?.status === 429) && i < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

async function migrateTab(tab: string, targetHeaders: string[]): Promise<void> {
  // Get current headers
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!1:1`,
    })
  );

  const currentHeaders: string[] = (res.data.values?.[0] as string[]) ?? [];

  const missing = targetHeaders.filter((h) => !currentHeaders.includes(h));
  if (missing.length === 0) {
    console.log(`  ✓ ${tab} — no changes needed`);
    return;
  }

  const newHeaders = [...currentHeaders, ...missing];
  console.log(`  ➕ ${tab} — adding columns: ${missing.join(', ')}`);

  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newHeaders] },
    })
  );
}

async function checkSettingsVersion(): Promise<number> {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A:B',
    })
  );
  const rows: string[][] = (res.data.values as string[][]) ?? [];
  const versionRow = rows.find((r) => r[0] === 'SchemaVersion');
  return parseInt(versionRow?.[1] ?? '0', 10);
}

async function setSchemaVersion(version: number): Promise<void> {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A:B',
    })
  );
  const rows: string[][] = (res.data.values as string[][]) ?? [];
  const versionRowIdx = rows.findIndex((r) => r[0] === 'SchemaVersion');

  if (versionRowIdx >= 0) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Settings!B${versionRowIdx + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[String(version)]] },
      })
    );
  } else {
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Settings',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [['SchemaVersion', String(version)]] },
      })
    );
  }
}

const TARGET_SCHEMA_VERSION = 1;

async function migrate() {
  console.log('\n🔄 ANWEO CRM Migration Script\n');

  const currentVersion = await checkSettingsVersion();
  console.log(`Current schema version: ${currentVersion}`);
  console.log(`Target schema version:  ${TARGET_SCHEMA_VERSION}\n`);

  if (currentVersion >= TARGET_SCHEMA_VERSION) {
    console.log('✅ Schema is up to date. No migration needed.\n');
    return;
  }

  console.log('📋 Migrating tabs...\n');

  // Get existing tabs
  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId: SHEET_ID }));
  const existingTabNames = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);

  for (const [tab, headers] of Object.entries(HEADERS)) {
    if (!existingTabNames.has(tab)) {
      console.log(`  ➕ ${tab} — tab does not exist, creating...`);
      await withRetry(() =>
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
        })
      );
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${tab}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] },
        })
      );
    } else {
      await migrateTab(tab, headers);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  await setSchemaVersion(TARGET_SCHEMA_VERSION);
  console.log(`\n✅ Migration complete. Schema version is now ${TARGET_SCHEMA_VERSION}.\n`);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
