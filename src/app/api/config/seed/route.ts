import { withAuth, apiSuccess, apiError } from '@/lib/api-helpers';
import { getConfig, upsertConfigItem } from '@/lib/data';
import { invalidateCache } from '@/lib/data/sheets-base';
import { TABS } from '@/lib/data/tabs';
import type { ConfigItem } from '@/lib/types';

// ─── Full default dataset ──────────────────────────────────────
const DEFAULT_CONFIG: ConfigItem[] = [
  // Pipeline / Lead Status
  { list_name: 'pipeline_status', value: 'New',             label: 'New',             sort_order: '1', active: 'TRUE' },
  { list_name: 'pipeline_status', value: 'Replied',         label: 'Replied',         sort_order: '2', active: 'TRUE' },
  { list_name: 'pipeline_status', value: 'Hot Lead',        label: 'Hot Lead',        sort_order: '3', active: 'TRUE' },
  { list_name: 'pipeline_status', value: 'Payment Pending', label: 'Payment Pending', sort_order: '4', active: 'TRUE' },
  { list_name: 'pipeline_status', value: 'Won',             label: 'Won',             sort_order: '5', active: 'TRUE' },
  { list_name: 'pipeline_status', value: 'Lost',            label: 'Lost',            sort_order: '6', active: 'TRUE' },

  { list_name: 'lead_status', value: 'New',             label: 'New',             sort_order: '1', active: 'TRUE' },
  { list_name: 'lead_status', value: 'Replied',         label: 'Replied',         sort_order: '2', active: 'TRUE' },
  { list_name: 'lead_status', value: 'Hot Lead',        label: 'Hot Lead',        sort_order: '3', active: 'TRUE' },
  { list_name: 'lead_status', value: 'Payment Pending', label: 'Payment Pending', sort_order: '4', active: 'TRUE' },
  { list_name: 'lead_status', value: 'Won',             label: 'Won',             sort_order: '5', active: 'TRUE' },
  { list_name: 'lead_status', value: 'Lost',            label: 'Lost',            sort_order: '6', active: 'TRUE' },

  // Lost Reasons
  { list_name: 'lost_reason', value: 'not_interested',  label: 'Not Interested',       sort_order: '1', active: 'TRUE' },
  { list_name: 'lost_reason', value: 'too_expensive',   label: 'Too Expensive',        sort_order: '2', active: 'TRUE' },
  { list_name: 'lost_reason', value: 'competitor',      label: 'Went to Competitor',   sort_order: '3', active: 'TRUE' },
  { list_name: 'lost_reason', value: 'no_budget',       label: 'No Budget',            sort_order: '4', active: 'TRUE' },
  { list_name: 'lost_reason', value: 'no_response',     label: 'No Response',          sort_order: '5', active: 'TRUE' },
  { list_name: 'lost_reason', value: 'bad_timing',      label: 'Bad Timing',           sort_order: '6', active: 'TRUE' },

  // Lead Sources
  { list_name: 'lead_source', value: 'Google',      label: 'Google Maps',       sort_order: '1', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Instagram',   label: 'Instagram',         sort_order: '2', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Facebook',    label: 'Facebook',          sort_order: '3', active: 'TRUE' },
  { list_name: 'lead_source', value: 'LinkedIn',    label: 'LinkedIn',          sort_order: '4', active: 'TRUE' },
  { list_name: 'lead_source', value: 'WhatsApp',    label: 'WhatsApp',          sort_order: '5', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Referral',    label: 'Referral',          sort_order: '6', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Walk_in',     label: 'Walk-in',           sort_order: '7', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Cold_Call',   label: 'Cold Call',         sort_order: '8', active: 'TRUE' },
  { list_name: 'lead_source', value: 'Website',     label: 'Website',           sort_order: '9', active: 'TRUE' },

  // Categories
  { list_name: 'category', value: 'Restaurant',    label: 'Restaurant',        sort_order: '1',  active: 'TRUE' },
  { list_name: 'category', value: 'Retail',        label: 'Retail',            sort_order: '2',  active: 'TRUE' },
  { list_name: 'category', value: 'IT',            label: 'IT / Software',     sort_order: '3',  active: 'TRUE' },
  { list_name: 'category', value: 'Healthcare',    label: 'Healthcare',        sort_order: '4',  active: 'TRUE' },
  { list_name: 'category', value: 'Education',     label: 'Education',         sort_order: '5',  active: 'TRUE' },
  { list_name: 'category', value: 'Real_Estate',   label: 'Real Estate',       sort_order: '6',  active: 'TRUE' },
  { list_name: 'category', value: 'Fitness',       label: 'Fitness / Gym',     sort_order: '7',  active: 'TRUE' },
  { list_name: 'category', value: 'Beauty',        label: 'Beauty / Salon',    sort_order: '8',  active: 'TRUE' },
  { list_name: 'category', value: 'Automotive',    label: 'Automotive',        sort_order: '9',  active: 'TRUE' },
  { list_name: 'category', value: 'Hospitality',   label: 'Hospitality',       sort_order: '10', active: 'TRUE' },
  { list_name: 'category', value: 'Finance',       label: 'Finance / Banking', sort_order: '11', active: 'TRUE' },
  { list_name: 'category', value: 'Other',         label: 'Other',             sort_order: '99', active: 'TRUE' },

  // Priority Levels
  { list_name: 'priority', value: 'low',    label: 'Low',    sort_order: '1', active: 'TRUE' },
  { list_name: 'priority', value: 'medium', label: 'Medium', sort_order: '2', active: 'TRUE' },
  { list_name: 'priority', value: 'high',   label: 'High',   sort_order: '3', active: 'TRUE' },
  { list_name: 'priority', value: 'urgent', label: 'Urgent', sort_order: '4', active: 'TRUE' },

  // Tags
  { list_name: 'tag', value: 'high_value',  label: 'High Value',   sort_order: '1', active: 'TRUE' },
  { list_name: 'tag', value: 'follow_up',   label: 'Follow Up',    sort_order: '2', active: 'TRUE' },
  { list_name: 'tag', value: 'nurture',     label: 'Nurture',      sort_order: '3', active: 'TRUE' },
  { list_name: 'tag', value: 'cold',        label: 'Cold',         sort_order: '4', active: 'TRUE' },
  { list_name: 'tag', value: 'vip',         label: 'VIP',          sort_order: '5', active: 'TRUE' },
  { list_name: 'tag', value: 'demo_booked', label: 'Demo Booked',  sort_order: '6', active: 'TRUE' },
  { list_name: 'tag', value: 'trial',       label: 'On Trial',     sort_order: '7', active: 'TRUE' },
];

export const POST = withAuth(async () => {
  try {
    const existing = await getConfig();
    const existingKeys = new Set(
      existing.map((c) => `${c.list_name}::${c.value}`)
    );

    // Only insert items that don't already exist
    const toInsert = DEFAULT_CONFIG.filter(
      (item) => !existingKeys.has(`${item.list_name}::${item.value}`)
    );

    if (toInsert.length === 0) {
      return apiSuccess({ inserted: 0, message: 'All defaults already exist.' });
    }

    for (const item of toInsert) {
      await upsertConfigItem(item);
    }

    invalidateCache(TABS.CONFIG);
    return apiSuccess({ inserted: toInsert.length, message: `Seeded ${toInsert.length} default config items.` });
  } catch (err) {
    console.error('[config/seed] Error:', err);
    return apiError('Failed to seed config defaults');
  }
}, true); // admin only
