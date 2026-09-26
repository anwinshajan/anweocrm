// ============================================================
// Data Access Layer — Config, Settings, Services, Packages,
//                    BrandKnowledge, Templates, Activity,
//                    Messages, Research, Pitches, CallNotes,
//                    Deals, Announcements, Logs, Stats
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
// Type assertions are safe here — all values come from Google Sheets (strings)



import { v4 as uuidv4 } from 'uuid';
import {
  readObjects,
  appendRows,
  updateRow,
  getHeaders,
  overwriteDataRows,
  invalidateCache,
} from './sheets-base';
import { TABS, HEADERS } from './tabs';
import type {
  ConfigItem,
  Setting,
  Service,
  Package,
  BrandKnowledge,
  Template,
  Activity,
  Message,
  Research,
  Pitch,
  CallNote,
  Deal,
  Announcement,
  Log,
  Stats,
} from '../types';

// ─── Config ──────────────────────────────────────────────────

export async function getConfig(): Promise<ConfigItem[]> {
  return readObjects<ConfigItem>(TABS.CONFIG);
}

export async function getConfigList(listName: string): Promise<ConfigItem[]> {
  const all = await getConfig();
  const items = all
    .filter((c) => c.list_name === listName && c.active === 'TRUE')
    .sort((a, b) => parseInt(a.sort_order, 10) - parseInt(b.sort_order, 10));

  if (items.length === 0) {
    // Hardcoded fallback so the CRM never breaks on empty sheets
    const FALLBACKS: Record<string, ConfigItem[]> = {
      pipeline_status: [
        { list_name: 'pipeline_status', value: 'New',             label: 'New',             sort_order: '1', active: 'TRUE' },
        { list_name: 'pipeline_status', value: 'Replied',         label: 'Replied',         sort_order: '2', active: 'TRUE' },
        { list_name: 'pipeline_status', value: 'Hot Lead',        label: 'Hot Lead',        sort_order: '3', active: 'TRUE' },
        { list_name: 'pipeline_status', value: 'Payment Pending', label: 'Payment Pending', sort_order: '4', active: 'TRUE' },
        { list_name: 'pipeline_status', value: 'Won',             label: 'Won',             sort_order: '5', active: 'TRUE' },
        { list_name: 'pipeline_status', value: 'Lost',            label: 'Lost',            sort_order: '6', active: 'TRUE' },
      ],
      lead_status: [
        { list_name: 'lead_status', value: 'New',             label: 'New',             sort_order: '1', active: 'TRUE' },
        { list_name: 'lead_status', value: 'Replied',         label: 'Replied',         sort_order: '2', active: 'TRUE' },
        { list_name: 'lead_status', value: 'Hot Lead',        label: 'Hot Lead',        sort_order: '3', active: 'TRUE' },
        { list_name: 'lead_status', value: 'Payment Pending', label: 'Payment Pending', sort_order: '4', active: 'TRUE' },
        { list_name: 'lead_status', value: 'Won',             label: 'Won',             sort_order: '5', active: 'TRUE' },
        { list_name: 'lead_status', value: 'Lost',            label: 'Lost',            sort_order: '6', active: 'TRUE' },
      ],
      lost_reason: [
        { list_name: 'lost_reason', value: 'not_interested', label: 'Not Interested',     sort_order: '1', active: 'TRUE' },
        { list_name: 'lost_reason', value: 'too_expensive',  label: 'Too Expensive',      sort_order: '2', active: 'TRUE' },
        { list_name: 'lost_reason', value: 'competitor',     label: 'Went to Competitor', sort_order: '3', active: 'TRUE' },
        { list_name: 'lost_reason', value: 'no_budget',      label: 'No Budget',          sort_order: '4', active: 'TRUE' },
        { list_name: 'lost_reason', value: 'no_response',    label: 'No Response',        sort_order: '5', active: 'TRUE' },
        { list_name: 'lost_reason', value: 'bad_timing',     label: 'Bad Timing',         sort_order: '6', active: 'TRUE' },
      ],
      lead_source: [
        { list_name: 'lead_source', value: 'Google',    label: 'Google Maps', sort_order: '1', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Instagram', label: 'Instagram',   sort_order: '2', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Facebook',  label: 'Facebook',    sort_order: '3', active: 'TRUE' },
        { list_name: 'lead_source', value: 'LinkedIn',  label: 'LinkedIn',    sort_order: '4', active: 'TRUE' },
        { list_name: 'lead_source', value: 'WhatsApp',  label: 'WhatsApp',    sort_order: '5', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Referral',  label: 'Referral',    sort_order: '6', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Walk_in',   label: 'Walk-in',     sort_order: '7', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Cold_Call', label: 'Cold Call',   sort_order: '8', active: 'TRUE' },
        { list_name: 'lead_source', value: 'Website',   label: 'Website',     sort_order: '9', active: 'TRUE' },
      ],
      category: [
        { list_name: 'category', value: 'Restaurant',  label: 'Restaurant',        sort_order: '1',  active: 'TRUE' },
        { list_name: 'category', value: 'Retail',      label: 'Retail',            sort_order: '2',  active: 'TRUE' },
        { list_name: 'category', value: 'IT',          label: 'IT / Software',     sort_order: '3',  active: 'TRUE' },
        { list_name: 'category', value: 'Healthcare',  label: 'Healthcare',        sort_order: '4',  active: 'TRUE' },
        { list_name: 'category', value: 'Education',   label: 'Education',         sort_order: '5',  active: 'TRUE' },
        { list_name: 'category', value: 'Real_Estate', label: 'Real Estate',       sort_order: '6',  active: 'TRUE' },
        { list_name: 'category', value: 'Fitness',     label: 'Fitness / Gym',     sort_order: '7',  active: 'TRUE' },
        { list_name: 'category', value: 'Beauty',      label: 'Beauty / Salon',    sort_order: '8',  active: 'TRUE' },
        { list_name: 'category', value: 'Automotive',  label: 'Automotive',        sort_order: '9',  active: 'TRUE' },
        { list_name: 'category', value: 'Hospitality', label: 'Hospitality',       sort_order: '10', active: 'TRUE' },
        { list_name: 'category', value: 'Finance',     label: 'Finance / Banking', sort_order: '11', active: 'TRUE' },
        { list_name: 'category', value: 'Other',       label: 'Other',             sort_order: '99', active: 'TRUE' },
      ],
      priority: [
        { list_name: 'priority', value: 'low',    label: 'Low',    sort_order: '1', active: 'TRUE' },
        { list_name: 'priority', value: 'medium', label: 'Medium', sort_order: '2', active: 'TRUE' },
        { list_name: 'priority', value: 'high',   label: 'High',   sort_order: '3', active: 'TRUE' },
        { list_name: 'priority', value: 'urgent', label: 'Urgent', sort_order: '4', active: 'TRUE' },
      ],
      tag: [
        { list_name: 'tag', value: 'high_value',  label: 'High Value',  sort_order: '1', active: 'TRUE' },
        { list_name: 'tag', value: 'follow_up',   label: 'Follow Up',   sort_order: '2', active: 'TRUE' },
        { list_name: 'tag', value: 'nurture',     label: 'Nurture',     sort_order: '3', active: 'TRUE' },
        { list_name: 'tag', value: 'cold',        label: 'Cold',        sort_order: '4', active: 'TRUE' },
        { list_name: 'tag', value: 'vip',         label: 'VIP',         sort_order: '5', active: 'TRUE' },
        { list_name: 'tag', value: 'demo_booked', label: 'Demo Booked', sort_order: '6', active: 'TRUE' },
        { list_name: 'tag', value: 'trial',       label: 'On Trial',    sort_order: '7', active: 'TRUE' },
      ],
    };
    return FALLBACKS[listName] ?? [];
  }

  return items;
}


export async function upsertConfigItem(item: ConfigItem): Promise<void> {
  const all = await getConfig();
  const existing = all.findIndex(
    (c) => c.list_name === item.list_name && c.value === item.value
  );
  if (existing >= 0) {
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.CONFIG);
    await updateRow(TABS.CONFIG, rowIndex, headers, item as Record<string, string>);
  } else {
    const row = HEADERS[TABS.CONFIG].map((h) => (item as Record<string, string>)[h] ?? '');
    await appendRows(TABS.CONFIG, [row]);
  }
}

// ─── Settings ────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await readObjects<Setting>(TABS.SETTINGS);
  const result: Record<string, string> = {};
  rows.forEach((r) => {
    result[r.key] = r.value;
  });
  return result;
}

export async function getSetting(key: string): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const all = await readObjects<Setting>(TABS.SETTINGS);
  const existing = all.findIndex((s) => s.key === key);
  if (existing >= 0) {
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.SETTINGS);
    await updateRow(TABS.SETTINGS, rowIndex, headers, { key, value });
  } else {
    await appendRows(TABS.SETTINGS, [[key, value]]);
  }
}

// ─── Services ────────────────────────────────────────────────

export async function getServices(): Promise<Service[]> {
  return readObjects<Service>(TABS.SERVICES);
}

export async function getActiveServices(): Promise<Service[]> {
  const services = await getServices();
  return services
    .filter((s) => !s.active || s.active.toUpperCase() !== 'FALSE')
    .sort((a, b) => (parseInt(a.priority_rank, 10) || 99) - (parseInt(b.priority_rank, 10) || 99));
}

export async function getServiceById(id: string): Promise<Service | null> {
  const services = await getServices();
  return services.find((s) => s.id === id) ?? null;
}

export async function createService(data: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
  const service: Service = {
    id: uuidv4(),
    name: data.name,
    description: data.description ?? '',
    ideal_customer: data.ideal_customer ?? '',
    pitch_angle: data.pitch_angle ?? '',
    priority_rank: data.priority_rank ?? '99',
    active: data.active ?? 'TRUE',
    created_at: new Date().toISOString(),
  };
  const row = HEADERS[TABS.SERVICES].map((h) => (service as Record<string, string>)[h] ?? '');
  await appendRows(TABS.SERVICES, [row]);
  return service;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
  const services = await getServices();
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const updated = { ...services[index], ...updates } as unknown as Service;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.SERVICES);
  await updateRow(TABS.SERVICES, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

export async function deactivateService(id: string): Promise<void> {
  await updateService(id, { active: 'FALSE' });
}

// ─── Packages ────────────────────────────────────────────────

export async function getPackages(): Promise<Package[]> {
  return readObjects<Package>(TABS.PACKAGES);
}

export async function getActivePackages(): Promise<Package[]> {
  const pkgs = await getPackages();
  const activeServices = await getActiveServices();
  const activeServiceIds = new Set(activeServices.map((s) => s.id));
  return pkgs.filter((p) => (!p.active || p.active.toUpperCase() !== 'FALSE') && activeServiceIds.has(p.service_id));
}

export async function getPackagesByService(serviceId: string): Promise<Package[]> {
  const pkgs = await getPackages();
  return pkgs.filter((p) => p.service_id === serviceId && (!p.active || p.active.toUpperCase() !== 'FALSE'));
}

export async function createPackage(data: Omit<Package, 'id'>): Promise<Package> {
  const pkg = { id: uuidv4(), ...data } as unknown as Package;
  const row = HEADERS[TABS.PACKAGES].map((h) => (pkg as Record<string, string>)[h] ?? '');
  await appendRows(TABS.PACKAGES, [row]);
  return pkg;
}

export async function updatePackage(id: string, updates: Partial<Package>): Promise<Package | null> {
  const pkgs = await getPackages();
  const index = pkgs.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = { ...pkgs[index], ...updates } as unknown as Package;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.PACKAGES);
  await updateRow(TABS.PACKAGES, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

// ─── BrandKnowledge ──────────────────────────────────────────

export async function getBrandKnowledge(): Promise<Record<string, string>> {
  const rows = await readObjects<BrandKnowledge>(TABS.BRAND_KNOWLEDGE);
  const result: Record<string, string> = {};
  rows.forEach((r) => {
    result[r.key] = r.value;
  });
  return result;
}

export async function setBrandKnowledge(key: string, value: string): Promise<void> {
  const all = await readObjects<BrandKnowledge>(TABS.BRAND_KNOWLEDGE);
  const existing = all.findIndex((b) => b.key === key);
  if (existing >= 0) {
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.BRAND_KNOWLEDGE);
    await updateRow(TABS.BRAND_KNOWLEDGE, rowIndex, headers, { key, value });
  } else {
    await appendRows(TABS.BRAND_KNOWLEDGE, [[key, value]]);
  }
}

// ─── Templates ───────────────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  return readObjects<Template>(TABS.TEMPLATES);
}

export async function getActiveTemplates(): Promise<Template[]> {
  const tmpl = await getTemplates();
  return tmpl.filter((t) => !t.active || t.active.toUpperCase() !== 'FALSE');
}

export async function createTemplate(data: Omit<Template, 'id'>): Promise<Template> {
  const t = { id: uuidv4(), ...data } as unknown as Template;
  const row = HEADERS[TABS.TEMPLATES].map((h) => (t as Record<string, string>)[h] ?? '');
  await appendRows(TABS.TEMPLATES, [row]);
  return t;
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<Template | null> {
  const templates = await getTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated = { ...templates[index], ...updates } as unknown as Template;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.TEMPLATES);
  await updateRow(TABS.TEMPLATES, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

// ─── Activity ────────────────────────────────────────────────

export async function addActivity(data: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> {
  const activity: Activity = {
    id: uuidv4(),
    lead_id: data.lead_id,
    user_id: data.user_id,
    type: data.type,
    content: data.content,
    timestamp: new Date().toISOString(),
  };
  const row = HEADERS[TABS.ACTIVITY].map((h) => (activity as Record<string, string>)[h] ?? '');
  await appendRows(TABS.ACTIVITY, [row]);
  return activity;
}

export async function getActivityForLead(leadId: string): Promise<Activity[]> {
  const all = await readObjects<Activity>(TABS.ACTIVITY);
  return all
    .filter((a) => a.lead_id === leadId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getRecentActivity(limit = 50): Promise<Activity[]> {
  const all = await readObjects<Activity>(TABS.ACTIVITY);
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

// ─── Messages ────────────────────────────────────────────────

export async function addMessage(data: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
  const msg: Message = {
    id: uuidv4(),
    lead_id: data.lead_id,
    user_id: data.user_id,
    direction: data.direction,
    message_text: data.message_text,
    template_used: data.template_used ?? '',
    timestamp: new Date().toISOString(),
  };
  const row = HEADERS[TABS.MESSAGES].map((h) => (msg as Record<string, string>)[h] ?? '');
  await appendRows(TABS.MESSAGES, [row]);
  return msg;
}

export async function getMessagesForLead(leadId: string): Promise<Message[]> {
  const all = await readObjects<Message>(TABS.MESSAGES);
  return all
    .filter((m) => m.lead_id === leadId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ─── Research ────────────────────────────────────────────────

export async function getResearchForLead(leadId: string): Promise<Research | null> {
  const all = await readObjects<Research>(TABS.RESEARCH);
  return all.find((r) => r.lead_id === leadId) ?? null;
}

export async function upsertResearch(data: Research): Promise<void> {
  const all = await readObjects<Research>(TABS.RESEARCH);
  const existing = all.findIndex((r) => r.lead_id === data.lead_id);
  if (existing >= 0) {
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.RESEARCH);
    await updateRow(TABS.RESEARCH, rowIndex, headers, data as Record<string, string>);
  } else {
    const row = HEADERS[TABS.RESEARCH].map((h) => (data as Record<string, string>)[h] ?? '');
    await appendRows(TABS.RESEARCH, [row]);
  }
}

// ─── Pitches ─────────────────────────────────────────────────

export async function getPitchesForLead(leadId: string): Promise<Pitch[]> {
  const all = await readObjects<Pitch>(TABS.PITCHES);
  return all.filter((p) => p.lead_id === leadId);
}

export async function createPitch(data: Omit<Pitch, 'id'>): Promise<Pitch> {
  const pitch = { id: uuidv4(), ...data } as unknown as Pitch;
  const row = HEADERS[TABS.PITCHES].map((h) => (pitch as Record<string, string>)[h] ?? '');
  await appendRows(TABS.PITCHES, [row]);
  return pitch;
}

export async function updatePitch(id: string, updates: Partial<Pitch>): Promise<Pitch | null> {
  const all = await readObjects<Pitch>(TABS.PITCHES);
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = { ...all[index], ...updates } as unknown as Pitch;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.PITCHES);
  await updateRow(TABS.PITCHES, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

export async function deletePitch(id: string): Promise<boolean> {
  const all = await readObjects<Pitch>(TABS.PITCHES);
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return false;
  
  // To delete, we must overwrite all rows without the deleted one
  const filtered = all.filter((p) => p.id !== id);
  const headers = await getHeaders(TABS.PITCHES);
  await overwriteDataRows(TABS.PITCHES, headers, filtered as unknown as Record<string, string>[]);
  return true;
}

// ─── CallNotes ───────────────────────────────────────────────

export async function getCallNoteForLead(leadId: string): Promise<CallNote | null> {
  const all = await readObjects<CallNote>(TABS.CALL_NOTES);
  return all.find((n) => n.lead_id === leadId) ?? null;
}

export async function upsertCallNote(data: CallNote): Promise<void> {
  const all = await readObjects<CallNote>(TABS.CALL_NOTES);
  const existing = all.findIndex((n) => n.lead_id === data.lead_id);
  if (existing >= 0) {
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.CALL_NOTES);
    await updateRow(TABS.CALL_NOTES, rowIndex, headers, data as Record<string, string>);
  } else {
    const row = HEADERS[TABS.CALL_NOTES].map((h) => (data as Record<string, string>)[h] ?? '');
    await appendRows(TABS.CALL_NOTES, [row]);
  }
}

// ─── Deals ───────────────────────────────────────────────────

export async function getDeals(): Promise<Deal[]> {
  return readObjects<Deal>(TABS.DEALS);
}

export async function getDealForLead(leadId: string): Promise<Deal | null> {
  const all = await getDeals();
  return all.find((d) => d.lead_id === leadId) ?? null;
}

export async function createDeal(data: Omit<Deal, 'id'>): Promise<Deal> {
  const deal = { id: uuidv4(), ...data } as unknown as Deal;
  const row = HEADERS[TABS.DEALS].map((h) => (deal as Record<string, string>)[h] ?? '');
  await appendRows(TABS.DEALS, [row]);
  return deal;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
  const all = await getDeals();
  const index = all.findIndex((d) => d.id === id);
  if (index === -1) return null;
  const updated = { ...all[index], ...updates } as unknown as Deal;
  const rowIndex = index + 2;
  const headers = await getHeaders(TABS.DEALS);
  await updateRow(TABS.DEALS, rowIndex, headers, updated as Record<string, string>);
  return updated;
}

// ─── Announcements ───────────────────────────────────────────

export async function getAnnouncements(): Promise<Announcement[]> {
  return readObjects<Announcement>(TABS.ANNOUNCEMENTS);
}

export async function getAnnouncementsForUser(userId: string): Promise<Announcement[]> {
  const all = await getAnnouncements();
  return all.filter((a) => a.to_user === 'all' || a.to_user === userId);
}

export async function createAnnouncement(data: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
  const ann = {
    id: uuidv4(),
    from_admin: data.from_admin,
    to_user: data.to_user,
    message: data.message,
    created_at: new Date().toISOString(),
    read_by: data.read_by ?? '',
  } as unknown as Announcement;
  const row = HEADERS[TABS.ANNOUNCEMENTS].map((h) => (ann as Record<string, string>)[h] ?? '');
  await appendRows(TABS.ANNOUNCEMENTS, [row]);
  return ann;
}

export async function markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
  const all = await getAnnouncements();
  const index = all.findIndex((a) => a.id === announcementId);
  if (index === -1) return;
  const ann = all[index];
  const readBy = ann.read_by ? ann.read_by.split(',').map((s) => s.trim()) : [];
  if (!readBy.includes(userId)) {
    readBy.push(userId);
    const updated = { ...ann, read_by: readBy.join(',') };
    const rowIndex = index + 2;
    const headers = await getHeaders(TABS.ANNOUNCEMENTS);
    await updateRow(TABS.ANNOUNCEMENTS, rowIndex, headers, updated as Record<string, string>);
  }
}

// ─── Logs ────────────────────────────────────────────────────

export async function addLog(data: Omit<Log, 'timestamp'>): Promise<void> {
  const log: Log = {
    timestamp: new Date().toISOString(),
    user: data.user,
    action: data.action,
    details: data.details ?? '',
  };
  const row = HEADERS[TABS.LOGS].map((h) => (log as Record<string, string>)[h] ?? '');
  await appendRows(TABS.LOGS, [row]);
}

export async function getLogs(limit = 200): Promise<Log[]> {
  const all = await readObjects<Log>(TABS.LOGS);
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

// ─── Stats ───────────────────────────────────────────────────

export async function incrementStat(date: string, user: string, metric: string): Promise<void> {
  const all = await readObjects<Stats>(TABS.STATS);
  const existing = all.findIndex(
    (s) => s.date === date && s.user === user && s.metric === metric
  );
  if (existing >= 0) {
    const current = parseInt(all[existing].value, 10) || 0;
    const updated = { ...all[existing], value: String(current + 1) };
    const rowIndex = existing + 2;
    const headers = await getHeaders(TABS.STATS);
    await updateRow(TABS.STATS, rowIndex, headers, updated);
  } else {
    await appendRows(TABS.STATS, [[date, user, metric, '1']]);
  }
}

export async function getStats(
  fromDate: string,
  toDate: string,
  user?: string
): Promise<Stats[]> {
  const all = await readObjects<Stats>(TABS.STATS);
  return all.filter(
    (s) =>
      s.date >= fromDate &&
      s.date <= toDate &&
      (!user || s.user === user)
  );
}

// Re-export user helpers that pages import from '@/lib/data'
export { getUserById, getActiveUsers } from './users';
