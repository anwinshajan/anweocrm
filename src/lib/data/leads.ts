// ============================================================
// Data Access Layer — Leads
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  readObjects,
  appendRows,
  findRowIndex,
  updateRow,
  getHeaders,
  invalidateCache,
} from './sheets-base';
import { TABS, HEADERS } from './tabs';
import type { Lead } from '../types';

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export async function getLeads(): Promise<Lead[]> {
  return readObjects<Lead>(TABS.LEADS);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const leads = await getLeads();
  return leads.find((l) => l.id === id) ?? null;
}

export async function getLeadsByUser(userId: string): Promise<Lead[]> {
  const leads = await getLeads();
  return leads.filter(
    (l) => l.assigned_to === userId || l.added_by === userId
  );
}

export async function findDuplicateByPhone(phone: string): Promise<Lead | null> {
  const normalized = normalisePhone(phone);
  const leads = await getLeads();
  return (
    leads.find(
      (l) =>
        normalisePhone(l.phone) === normalized ||
        normalisePhone(l.whatsapp_number) === normalized
    ) ?? null
  );
}

export async function createLead(
  data: Omit<Lead, 'id' | 'created_at'> & Partial<Pick<Lead, 'id' | 'created_at'>>
): Promise<Lead> {
  const lead: Lead = {
    id: data.id ?? uuidv4(),
    business_name: data.business_name ?? '',
    category: data.category ?? '',
    phone: data.phone ?? '',
    whatsapp_number: data.whatsapp_number ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    website: data.website ?? '',
    google_maps_url: data.google_maps_url ?? '',
    rating: data.rating ?? '',
    review_count: data.review_count ?? '',
    instagram: data.instagram ?? '',
    facebook: data.facebook ?? '',
    source: data.source ?? '',
    status: data.status ?? 'New',
    tags: data.tags ?? '',
    assigned_to: data.assigned_to ?? '',
    priority: data.priority ?? '',
    added_by: data.added_by ?? '',
    first_messaged_by: data.first_messaged_by ?? '',
    last_messaged_by: data.last_messaged_by ?? '',
    closed_by: data.closed_by ?? '',
    deal_value: data.deal_value ?? '',
    lost_reason: data.lost_reason ?? '',
    created_at: data.created_at ?? new Date().toISOString(),
    last_contacted_at: data.last_contacted_at ?? '',
    next_followup_at: data.next_followup_at ?? '',
    closed_at: data.closed_at ?? '',
  } as unknown as Lead;

  const row = HEADERS[TABS.LEADS].map((h) => (lead as Record<string, string>)[h] ?? '');
  await appendRows(TABS.LEADS, [row]);
  return lead;
}

export async function batchCreateLeads(
  leadsData: (Omit<Lead, 'id' | 'created_at'> & Partial<Pick<Lead, 'id' | 'created_at'>>)[]
): Promise<Lead[]> {
  if (leadsData.length === 0) return [];
  
  const createdLeads: Lead[] = leadsData.map((data) => ({
    id: data.id ?? uuidv4(),
    business_name: data.business_name ?? '',
    category: data.category ?? '',
    phone: data.phone ?? '',
    whatsapp_number: data.whatsapp_number ?? data.phone ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    website: data.website ?? '',
    google_maps_url: data.google_maps_url ?? '',
    rating: data.rating ?? '',
    review_count: data.review_count ?? '',
    instagram: data.instagram ?? '',
    facebook: data.facebook ?? '',
    source: data.source ?? 'Import',
    status: data.status ?? 'New',
    tags: data.tags ?? '',
    assigned_to: data.assigned_to ?? '',
    priority: data.priority ?? 'medium',
    added_by: data.added_by ?? '',
    first_messaged_by: data.first_messaged_by ?? '',
    last_messaged_by: data.last_messaged_by ?? '',
    closed_by: data.closed_by ?? '',
    deal_value: data.deal_value ?? '',
    lost_reason: data.lost_reason ?? '',
    created_at: data.created_at ?? new Date().toISOString(),
    last_contacted_at: data.last_contacted_at ?? '',
    next_followup_at: data.next_followup_at ?? '',
    closed_at: data.closed_at ?? '',
  } as unknown as Lead));

  const rows = createdLeads.map((lead) =>
    HEADERS[TABS.LEADS].map((h) => (lead as Record<string, string>)[h] ?? '')
  );

  await appendRows(TABS.LEADS, rows);
  return createdLeads;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const leads = await getLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const updated = { ...leads[index], ...updates } as unknown as Lead;
  const rowIndex = index + 2; // +1 for header, +1 for 1-based
  const headers = await getHeaders(TABS.LEADS);
  await updateRow(TABS.LEADS, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  // We soft-delete by marking status = "Deleted"
  const result = await updateLead(id, { status: 'Deleted' });
  return result !== null;
}

export async function getLeadsPaginated(
  page: number,
  pageSize: number,
  filters?: {
    status?: string;
    assigned_to?: string;
    city?: string;
    tag?: string;
    search?: string;
  }
): Promise<{ items: Lead[]; total: number }> {
  let leads = await getLeads();

  // Exclude soft-deleted
  leads = leads.filter((l) => l.status !== 'Deleted');

  if (filters?.status) {
    leads = leads.filter((l) => l.status === filters.status);
  }
  if (filters?.assigned_to) {
    leads = leads.filter((l) => l.assigned_to === filters.assigned_to);
  }
  if (filters?.city) {
    leads = leads.filter((l) =>
      l.city.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }
  if (filters?.tag) {
    leads = leads.filter((l) => l.tags.split(',').map(t => t.trim()).includes(filters.tag!));
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.business_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.city.toLowerCase().includes(q)
    );
  }

  const total = leads.length;
  const items = leads.slice((page - 1) * pageSize, page * pageSize);

  // Fetch pitch status for the visible items
  const allPitches = await readObjects<{lead_id: string}>(TABS.PITCHES);
  const pitchedLeadIds = new Set(allPitches.map(p => p.lead_id));
  
  const itemsWithPitchStatus = items.map(lead => ({
    ...lead,
    has_pitch: pitchedLeadIds.has(lead.id)
  }));

  return { items: itemsWithPitchStatus, total };
}

export async function claimLead(leadId: string, userId: string): Promise<Lead | null> {
  return updateLead(leadId, { assigned_to: userId });
}

export async function releaseLead(leadId: string): Promise<Lead | null> {
  return updateLead(leadId, { assigned_to: '' });
}

export async function getOverdueLeads(days: number): Promise<Lead[]> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const leads = await getLeads();
  return leads.filter(
    (l) =>
      l.status !== 'Deleted' &&
      l.status !== 'Won' &&
      l.status !== 'Lost' &&
      l.assigned_to &&
      (l.last_contacted_at || l.created_at) < cutoff
  );
}

export async function getFollowupsDueToday(userId: string): Promise<Lead[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const leads = await getLeads();

  return leads.filter((l) => {
    if (l.status === 'Deleted' || l.status === 'Won' || l.status === 'Lost') return false;
    if (l.assigned_to !== userId) return false;
    if (!l.next_followup_at) return false;
    const d = new Date(l.next_followup_at);
    return d >= today && d < tomorrow;
  });
}

export async function getNewlyAssignedLeads(userId: string): Promise<Lead[]> {
  // Leads assigned in last 48h where first_messaged_by is empty
  const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const leads = await getLeads();
  return leads.filter(
    (l) =>
      l.assigned_to === userId &&
      !l.first_messaged_by &&
      l.created_at >= cutoff
  );
}
