import { v4 as uuidv4 } from 'uuid';
import { readObjects, appendRows, findRowIndex, updateRow, getHeaders } from './sheets-base';
import { TABS, HEADERS } from './tabs';
import type { Payment } from '../types';

export async function getPayments(): Promise<Payment[]> {
  return readObjects<Payment>(TABS.PAYMENTS);
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  const payments = await getPayments();
  return payments.filter(p => p.user_id === userId);
}

export async function createPayment(data: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const payment: Payment = {
    id: uuidv4(),
    user_id: data.user_id || '',
    amount: data.amount || '0',
    type: data.type || 'Fixed Salary',
    method: data.method || 'Bank Transfer',
    reference: data.reference || '',
    status: data.status || 'Pending',
    created_at: new Date().toISOString(),
    notes: data.notes || '',
  };

  const row = HEADERS[TABS.PAYMENTS].map(h => (payment as Record<string, string>)[h] ?? '');
  await appendRows(TABS.PAYMENTS, [row]);
  return payment;
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
  const payments = await getPayments();
  const index = payments.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updated = { ...payments[index], ...updates };
  const rowIndex = index + 2; 
  const headers = await getHeaders(TABS.PAYMENTS);
  await updateRow(TABS.PAYMENTS, rowIndex, headers, updated as unknown as Record<string, string>);
  return updated as unknown as Payment;
}
