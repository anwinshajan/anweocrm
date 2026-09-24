// ============================================================
// ANWEO CRM — Core Types
// All entities mapped 1:1 to Google Sheet tabs
// ============================================================

export type LeadStatus = string; // loaded from Config tab at runtime
export type LeadTag = string;    // loaded from Config tab at runtime

// Base record type for compatibility with the DAL
export type SheetRecord = { [key: string]: string };
// Loose version used internally for spreads
export type LooseRecord = { [key: string]: string | undefined };

export interface Lead extends SheetRecord {
  id: string;
  business_name: string;
  category: string;
  phone: string;
  whatsapp_number: string;
  address: string;
  city: string;
  website: string;
  google_maps_url: string;
  rating: string;
  review_count: string;
  instagram: string;
  facebook: string;
  source: string;
  status: string;
  tags: string; // comma-separated
  assigned_to: string;
  priority: string;
  added_by: string;
  first_messaged_by: string;
  last_messaged_by: string;
  closed_by: string;
  deal_value: string;
  lost_reason: string;
  created_at: string;
  last_contacted_at: string;
  next_followup_at: string;
  closed_at: string;
}

export interface Research extends SheetRecord {
  lead_id: string;
  summary: string;
  owner_name: string;
  business_story: string;
  review_highlights: string;
  audit_results: string; // JSON
  gaps_found: string;
  opportunity_summary: string;
  recommended_service_id: string;
  generated_at: string;
}

export interface Pitch extends SheetRecord {
  id: string;
  lead_id: string;
  service_id: string;
  message_text: string;
  wa_link: string;
  version: string;
  generated_by: string;
  generated_at: string;
  edited_by: string;
}

export interface CallNote extends SheetRecord {
  lead_id: string;
  call_prep_note: string;
  opening_lines: string;
  objection_handlers: string;
  created_at: string;
}

export interface Message extends SheetRecord {
  id: string;
  lead_id: string;
  user_id: string;
  direction: string; // 'sent' | 'received'
  message_text: string;
  template_used: string;
  timestamp: string;
}

export interface Service extends SheetRecord {
  id: string;
  name: string;
  description: string;
  ideal_customer: string;
  pitch_angle: string;
  priority_rank: string;
  active: string; // "TRUE" | "FALSE"
  created_at: string;
}

export interface Package extends SheetRecord {
  id: string;
  service_id: string;
  name: string;
  description: string;
  price: string;
  deliverables: string;
  active: string; // "TRUE" | "FALSE"
}

export interface BrandKnowledge extends SheetRecord {
  key: string;
  value: string;
}

export interface Template extends SheetRecord {
  id: string;
  name: string;
  type: string;
  body: string;
  variables: string;
  active: string; // "TRUE" | "FALSE"
}

export interface User extends SheetRecord {
  id: string;
  username: string;
  password_hash: string;
  role: string; // 'admin' | 'team'
  permissions: string; // JSON
  daily_target: string;
  monthly_target: string;
  commission_type: string;
  commission_value: string;
  active: string; // "TRUE" | "FALSE"
  must_change_password: string; // "TRUE" | "FALSE"
  failed_attempts: string;
  locked_until: string;
  created_at: string;
}

export interface UserPermissions {
  can_scrape?: boolean;
  can_edit_packages?: boolean;
  can_view_all_leads?: boolean;
  can_export?: boolean;
}

export interface Activity extends SheetRecord {
  id: string;
  lead_id: string;
  user_id: string;
  type: string;
  content: string;
  timestamp: string;
}

export interface Deal extends SheetRecord {
  id: string;
  lead_id: string;
  service_id: string;
  service_name_snapshot: string;
  package_id: string;
  package_name_snapshot: string;
  deal_value: string;
  advance_paid: string;
  balance_due: string;
  start_date: string;
  delivery_status: string;
  closed_by: string;
  closed_at: string;
}

export interface Announcement extends SheetRecord {
  id: string;
  from_admin: string;
  to_user: string; // user id or "all"
  message: string;
  created_at: string;
  read_by: string; // comma-separated user ids
}

export interface Log extends SheetRecord {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface Stats extends SheetRecord {
  date: string;
  user: string;
  metric: string;
  value: string;
}

export interface ConfigItem extends SheetRecord {
  list_name: string;
  value: string;
  label: string;
  sort_order: string;
  active: string; // "TRUE" | "FALSE"
}

export interface Setting extends SheetRecord {
  key: string;
  value: string;
}

// ---- Session / Auth types ----

export interface SessionUser {
  id: string;
  username: string;
  role: 'admin' | 'team';
  permissions: UserPermissions;
  must_change_password: boolean;
}

// ---- API response shapes ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Audit ----

export interface AuditResult {
  check: string;
  status: 'pass' | 'fail' | 'unknown';
  note?: string;
}
