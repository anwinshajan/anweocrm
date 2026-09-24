import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, BACKUP_SHEET_ID, SHEET_ID } from '@/lib/data/sheets-client';
import { addLog } from '@/lib/data';

// Vercel Cron — GET /api/cron/backup
// Protected by CRON_SECRET header
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backupSheetId = BACKUP_SHEET_ID();
  if (!backupSheetId) {
    return NextResponse.json({ error: 'GOOGLE_BACKUP_SHEET_ID not set' }, { status: 400 });
  }

  const sheets = getSheetsClient();
  const sourceId = SHEET_ID();

  try {
    // Get all sheet data from source
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sourceId });
    const sheetNames = meta.data.sheets?.map((s) => s.properties?.title ?? '') ?? [];

    for (const sheetName of sheetNames) {
      const data = await sheets.spreadsheets.values.get({
        spreadsheetId: sourceId,
        range: sheetName,
      });

      const values = data.data.values ?? [];
      if (values.length === 0) continue;

      // Check if backup tab exists
      const backupMeta = await sheets.spreadsheets.get({ spreadsheetId: backupSheetId });
      const backupSheets = backupMeta.data.sheets?.map((s) => s.properties?.title ?? '') ?? [];

      if (!backupSheets.includes(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: backupSheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
        });
      } else {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: backupSheetId,
          range: sheetName,
        });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: backupSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      // Rate limit between sheets
      await new Promise((r) => setTimeout(r, 200));
    }

    await addLog({ user: 'CRON', action: 'BACKUP_COMPLETE', details: `${sheetNames.length} tabs backed up` });

    return NextResponse.json({ success: true, sheets: sheetNames.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Backup failed';
    await addLog({ user: 'CRON', action: 'BACKUP_ERROR', details: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
