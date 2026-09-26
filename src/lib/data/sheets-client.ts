// ============================================================
// Google Sheets Client — single place that creates the API client
// ============================================================

import { google } from 'googleapis';

let _sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'mock@example.com',
      private_key: (process.env.GOOGLE_PRIVATE_KEY || 'mock-key').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

export const SHEET_ID = () => {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID env var is not set');
  return id;
};

export const BACKUP_SHEET_ID = () => {
  return process.env.GOOGLE_BACKUP_SHEET_ID ?? '';
};
