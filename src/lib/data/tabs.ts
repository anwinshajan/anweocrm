// ============================================================
// Tab name constants — single source of truth
// ============================================================

export const TABS = {
  LEADS: 'Leads',
  RESEARCH: 'Research',
  PITCHES: 'Pitches',
  CALL_NOTES: 'CallNotes',
  MESSAGES: 'Messages',
  SERVICES: 'Services',
  PACKAGES: 'Packages',
  BRAND_KNOWLEDGE: 'BrandKnowledge',
  TEMPLATES: 'Templates',
  USERS: 'Users',
  ACTIVITY: 'Activity',
  DEALS: 'Deals',
  ANNOUNCEMENTS: 'Announcements',
  LOGS: 'Logs',
  STATS: 'Stats',
  CONFIG: 'Config',
  SETTINGS: 'Settings',
} as const;

export const HEADERS: Record<string, string[]> = {
  [TABS.LEADS]: [
    'id', 'business_name', 'category', 'phone', 'whatsapp_number',
    'address', 'city', 'website', 'google_maps_url', 'rating',
    'review_count', 'instagram', 'facebook', 'source', 'status', 'tags',
    'assigned_to', 'priority', 'added_by', 'first_messaged_by',
    'last_messaged_by', 'closed_by', 'deal_value', 'lost_reason',
    'created_at', 'last_contacted_at', 'next_followup_at', 'closed_at',
  ],
  [TABS.RESEARCH]: [
    'lead_id', 'summary', 'owner_name', 'business_story',
    'review_highlights', 'audit_results', 'gaps_found',
    'opportunity_summary', 'recommended_service_id', 'generated_at',
  ],
  [TABS.PITCHES]: [
    'id', 'lead_id', 'service_id', 'message_text', 'wa_link',
    'version', 'generated_by', 'generated_at', 'edited_by',
  ],
  [TABS.CALL_NOTES]: [
    'lead_id', 'call_prep_note', 'opening_lines',
    'objection_handlers', 'created_at',
  ],
  [TABS.MESSAGES]: [
    'id', 'lead_id', 'user_id', 'direction', 'message_text',
    'template_used', 'timestamp',
  ],
  [TABS.SERVICES]: [
    'id', 'name', 'description', 'ideal_customer', 'pitch_angle',
    'priority_rank', 'active', 'created_at',
  ],
  [TABS.PACKAGES]: [
    'id', 'service_id', 'name', 'description', 'price',
    'deliverables', 'active',
  ],
  [TABS.BRAND_KNOWLEDGE]: ['key', 'value'],
  [TABS.TEMPLATES]: ['id', 'name', 'type', 'body', 'variables', 'active'],
  [TABS.USERS]: [
    'id', 'username', 'password_hash', 'role', 'permissions',
    'daily_target', 'monthly_target', 'commission_type',
    'commission_value', 'active', 'must_change_password',
    'failed_attempts', 'locked_until', 'created_at',
  ],
  [TABS.ACTIVITY]: ['id', 'lead_id', 'user_id', 'type', 'content', 'timestamp'],
  [TABS.DEALS]: [
    'id', 'lead_id', 'service_id', 'service_name_snapshot',
    'package_id', 'package_name_snapshot', 'deal_value',
    'advance_paid', 'balance_due', 'start_date', 'delivery_status',
    'closed_by', 'closed_at',
  ],
  [TABS.ANNOUNCEMENTS]: [
    'id', 'from_admin', 'to_user', 'message', 'created_at', 'read_by',
  ],
  [TABS.LOGS]: ['timestamp', 'user', 'action', 'details'],
  [TABS.STATS]: ['date', 'user', 'metric', 'value'],
  [TABS.CONFIG]: ['list_name', 'value', 'label', 'sort_order', 'active'],
  [TABS.SETTINGS]: ['key', 'value'],
};
