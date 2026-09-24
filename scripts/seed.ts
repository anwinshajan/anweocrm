#!/usr/bin/env node
// ============================================================
// ANWEO CRM — Seed Script
// Creates all 17 tabs with headers, default data, and one admin user.
// Safe to re-run (idempotent — uses ensureTab which adds only missing cols).
// Run: node --loader ts-node/esm scripts/seed.ts
// OR:  npx ts-node scripts/seed.ts
// ============================================================

import 'dotenv/config';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ─── Config ───────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
if (!SHEET_ID) {
  console.error('❌  GOOGLE_SHEET_ID is not set in environment');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ─── Headers ─────────────────────────────────────────────────

const TABS: Record<string, string[]> = {
  Leads: [
    'id', 'business_name', 'category', 'phone', 'whatsapp_number',
    'address', 'city', 'website', 'google_maps_url', 'rating',
    'review_count', 'instagram', 'facebook', 'source', 'status', 'tags',
    'assigned_to', 'priority', 'added_by', 'first_messaged_by',
    'last_messaged_by', 'closed_by', 'deal_value', 'lost_reason',
    'created_at', 'last_contacted_at', 'next_followup_at', 'closed_at',
  ],
  Research: [
    'lead_id', 'summary', 'owner_name', 'business_story',
    'review_highlights', 'audit_results', 'gaps_found',
    'opportunity_summary', 'recommended_service_id', 'generated_at',
  ],
  Pitches: [
    'id', 'lead_id', 'service_id', 'message_text', 'wa_link',
    'version', 'generated_by', 'generated_at', 'edited_by',
  ],
  CallNotes: [
    'lead_id', 'call_prep_note', 'opening_lines', 'objection_handlers', 'created_at',
  ],
  Messages: [
    'id', 'lead_id', 'user_id', 'direction', 'message_text', 'template_used', 'timestamp',
  ],
  Services: [
    'id', 'name', 'description', 'ideal_customer', 'pitch_angle', 'priority_rank', 'active', 'created_at',
  ],
  Packages: [
    'id', 'service_id', 'name', 'description', 'price', 'deliverables', 'active',
  ],
  BrandKnowledge: ['key', 'value'],
  Templates: ['id', 'name', 'type', 'body', 'variables', 'active'],
  Users: [
    'id', 'username', 'password_hash', 'role', 'permissions',
    'daily_target', 'monthly_target', 'commission_type',
    'commission_value', 'active', 'must_change_password',
    'failed_attempts', 'locked_until', 'created_at',
  ],
  Activity: ['id', 'lead_id', 'user_id', 'type', 'content', 'timestamp'],
  Deals: [
    'id', 'lead_id', 'service_id', 'service_name_snapshot',
    'package_id', 'package_name_snapshot', 'deal_value',
    'advance_paid', 'balance_due', 'start_date', 'delivery_status',
    'closed_by', 'closed_at',
  ],
  Announcements: ['id', 'from_admin', 'to_user', 'message', 'created_at', 'read_by'],
  Logs: ['timestamp', 'user', 'action', 'details'],
  Stats: ['date', 'user', 'metric', 'value'],
  Config: ['list_name', 'value', 'label', 'sort_order', 'active'],
  Settings: ['key', 'value'],
};

// ─── Helpers ──────────────────────────────────────────────────

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

async function ensureTab(title: string, headers: string[]): Promise<void> {
  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId: SHEET_ID }));
  const existing = meta.data.sheets?.find((s) => s.properties?.title === title);

  if (!existing) {
    console.log(`  ➕ Creating tab: ${title}`);
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] },
      })
    );
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      })
    );
  } else {
    console.log(`  ✓ Tab exists: ${title}`);
    // Check for missing columns
    const res = await withRetry(() =>
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${title}!1:1` })
    );
    const existingHeaders: string[] = (res.data.values?.[0] as string[]) ?? [];
    const missing = headers.filter((h) => !existingHeaders.includes(h));
    if (missing.length > 0) {
      console.log(`    ➕ Adding missing columns: ${missing.join(', ')}`);
      const newHeaders = [...existingHeaders, ...missing];
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${title}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newHeaders] },
        })
      );
    }
  }
}

async function appendIfEmpty(tab: string, rows: string[][]): Promise<void> {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A2:A` })
  );
  const dataRows = res.data.values ?? [];
  if (dataRows.length > 0) {
    console.log(`    ↳ ${tab} already has data — skipping seed rows`);
    return;
  }
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: tab,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
  );
  console.log(`    ↳ Seeded ${rows.length} row(s) into ${tab}`);
}

// ─── Seed data ────────────────────────────────────────────────

const now = new Date().toISOString();

async function seedAll() {
  console.log('\n🌱 ANWEO CRM Seed Script\n');

  // 1. Create all tabs
  console.log('📋 Creating/verifying tabs...');
  for (const [tab, headers] of Object.entries(TABS)) {
    await ensureTab(tab, headers);
    await new Promise((r) => setTimeout(r, 300)); // rate limit
  }

  // 2. Seed Settings
  console.log('\n⚙️  Seeding Settings...');
  await appendIfEmpty('Settings', [
    ['SchemaVersion', '1'],
    ['daily_send_limit', '50'],
    ['followup_day_1', '2'],
    ['followup_day_2', '5'],
    ['followup_day_3', '10'],
    ['auto_release_days', '14'],
    ['feature_kanban', 'true'],
    ['feature_deals', 'true'],
    ['feature_commissions', 'true'],
    ['feature_followup_sequences', 'true'],
    ['feature_announcements', 'true'],
  ]);

  // 3. Seed Config
  console.log('\n📝 Seeding Config...');
  const configRows: string[][] = [
    // Pipeline statuses
    ['pipeline_status', 'New', 'New', '1', 'TRUE'],
    ['pipeline_status', 'Researched', 'Researched', '2', 'TRUE'],
    ['pipeline_status', 'Message Sent', 'Message Sent', '3', 'TRUE'],
    ['pipeline_status', 'Replied', 'Replied', '4', 'TRUE'],
    ['pipeline_status', 'Call Booked', 'Call Booked', '5', 'TRUE'],
    ['pipeline_status', 'Proposal Sent', 'Proposal Sent', '6', 'TRUE'],
    ['pipeline_status', 'Negotiation', 'Negotiation', '7', 'TRUE'],
    ['pipeline_status', 'Won', 'Won', '8', 'TRUE'],
    ['pipeline_status', 'Lost', 'Lost', '9', 'TRUE'],
    // Tags
    ['tag', 'Follow-up Required', 'Follow-up Required', '1', 'TRUE'],
    ['tag', 'Pending', 'Pending', '2', 'TRUE'],
    ['tag', 'Deal Closed', 'Deal Closed', '3', 'TRUE'],
    ['tag', 'Hot Lead', 'Hot Lead', '4', 'TRUE'],
    ['tag', 'Warm', 'Warm', '5', 'TRUE'],
    ['tag', 'Cold', 'Cold', '6', 'TRUE'],
    ['tag', 'Frustrating Client', 'Frustrating Client', '7', 'TRUE'],
    ['tag', 'Not Interested', 'Not Interested', '8', 'TRUE'],
    ['tag', 'Do Not Contact', 'Do Not Contact', '9', 'TRUE'],
    ['tag', 'Price Objection', 'Price Objection', '10', 'TRUE'],
    ['tag', 'Needs Decision-Maker', 'Needs Decision-Maker', '11', 'TRUE'],
    ['tag', 'Existing Client', 'Existing Client', '12', 'TRUE'],
    // Lost reasons
    ['lost_reason', 'Too expensive', 'Too expensive', '1', 'TRUE'],
    ['lost_reason', 'Not interested', 'Not interested', '2', 'TRUE'],
    ['lost_reason', 'Went with competitor', 'Went with competitor', '3', 'TRUE'],
    ['lost_reason', 'No budget', 'No budget', '4', 'TRUE'],
    ['lost_reason', 'No response', 'No response', '5', 'TRUE'],
    ['lost_reason', 'Bad timing', 'Bad timing', '6', 'TRUE'],
    // Lead sources
    ['lead_source', 'Google Maps', 'Google Maps', '1', 'TRUE'],
    ['lead_source', 'Instagram', 'Instagram', '2', 'TRUE'],
    ['lead_source', 'Referral', 'Referral', '3', 'TRUE'],
    ['lead_source', 'Cold Call', 'Cold Call', '4', 'TRUE'],
    ['lead_source', 'Walk-in', 'Walk-in', '5', 'TRUE'],
    ['lead_source', 'WhatsApp', 'WhatsApp', '6', 'TRUE'],
    ['lead_source', 'Apify Scraper', 'Apify Scraper', '7', 'TRUE'],
    // Lead categories
    ['lead_category', 'Restaurant', 'Restaurant', '1', 'TRUE'],
    ['lead_category', 'Retail', 'Retail', '2', 'TRUE'],
    ['lead_category', 'Salon & Spa', 'Salon & Spa', '3', 'TRUE'],
    ['lead_category', 'Healthcare', 'Healthcare', '4', 'TRUE'],
    ['lead_category', 'Education', 'Education', '5', 'TRUE'],
    ['lead_category', 'Real Estate', 'Real Estate', '6', 'TRUE'],
    ['lead_category', 'Event Planner', 'Event Planner', '7', 'TRUE'],
    ['lead_category', 'Hotel & Tourism', 'Hotel & Tourism', '8', 'TRUE'],
    ['lead_category', 'Automotive', 'Automotive', '9', 'TRUE'],
    ['lead_category', 'Other', 'Other', '10', 'TRUE'],
    // Audit checks
    ['audit_check', 'website', 'Website', '1', 'TRUE'],
    ['audit_check', 'instagram', 'Instagram', '2', 'TRUE'],
    ['audit_check', 'facebook', 'Facebook', '3', 'TRUE'],
    ['audit_check', 'google_profile', 'Google Profile Quality', '4', 'TRUE'],
    ['audit_check', 'whatsapp_business', 'WhatsApp Business', '5', 'TRUE'],
    ['audit_check', 'ads', 'Running Ads', '6', 'TRUE'],
    // Template types
    ['template_type', 'first_message', 'First Message', '1', 'TRUE'],
    ['template_type', 'followup_1', 'Follow-up 1', '2', 'TRUE'],
    ['template_type', 'followup_2', 'Follow-up 2', '3', 'TRUE'],
    ['template_type', 'followup_3', 'Follow-up 3', '4', 'TRUE'],
    ['template_type', 'post_call', 'Post-Call Pitch', '5', 'TRUE'],
    ['template_type', 'payment_reminder', 'Payment Reminder', '6', 'TRUE'],
  ];
  await appendIfEmpty('Config', configRows);

  // 4. Seed Services
  console.log('\n🛠️  Seeding Services...');
  const svc1 = uuidv4(), svc2 = uuidv4(), svc3 = uuidv4(), svc4 = uuidv4();
  await appendIfEmpty('Services', [
    // web/app development — highest priority
    [svc3, 'Web / App Development', 'Professional websites and mobile apps that convert visitors into customers', 'Businesses with no website or an outdated one', 'Most businesses in Kerala lose customers because they have no online presence — we build it fast', '1', 'TRUE', now],
    // video ads
    [svc1, 'Video Ads', 'Short-form video content for social media ads — Reels, YouTube Shorts, Facebook Ads', 'Businesses wanting to reach more local customers on social media', 'Reach thousands of potential customers with a 30-second video that showcases your best work', '2', 'TRUE', now],
    // WhatsApp automation
    [svc2, 'WhatsApp Automation', 'Automated WhatsApp messaging to follow up with leads, send booking reminders, and share offers', 'Businesses with repeat customers and high WhatsApp usage', 'Stop losing customers to silence — automate your WhatsApp so every lead gets a reply', '3', 'TRUE', now],
    // digital invitations
    [svc4, 'Digital Invitations', 'Beautiful digital invitations for weddings, events, and product launches — shareable on WhatsApp', 'Event planners, wedding venues, caterers, and celebration businesses', 'Replace printed cards with stunning shareable invitations your clients will love', '4', 'TRUE', now],
  ]);

  // 5. Seed Packages (example)
  console.log('\n📦 Seeding Packages...');
  await appendIfEmpty('Packages', [
    [uuidv4(), svc3, 'Starter Website', '5-page responsive website with WhatsApp chat button', '15000', 'Design, Development, Hosting setup, 3 revisions', 'TRUE'],
    [uuidv4(), svc3, 'Business Website', '10-page website with booking form, gallery, SEO basics', '25000', 'All Starter features + contact form, Google Maps embed, SEO', 'TRUE'],
    [uuidv4(), svc1, 'Reel Package', '4 Reels per month + copywriting + basic editing', '8000', '4 short videos, captions, posting schedule', 'TRUE'],
    [uuidv4(), svc1, 'Ad Campaign', 'Full video ad + Meta Ads management for 30 days', '15000', 'Script, shoot, edit, Meta Ads Manager setup, monthly report', 'TRUE'],
    [uuidv4(), svc2, 'WhatsApp Bot Basic', 'Auto-reply + lead capture bot for WhatsApp Business', '12000', 'Setup, 3 flows, 1 month support', 'TRUE'],
    [uuidv4(), svc4, 'Digital Invite', 'Custom animated digital invitation', '2500', '1 design, video format, unlimited WhatsApp shares', 'TRUE'],
  ]);

  // 6. Seed Brand Knowledge
  console.log('\n🏢 Seeding BrandKnowledge...');
  await appendIfEmpty('BrandKnowledge', [
    ['agency_name', 'Anweo'],
    ['agency_location', 'Kerala, India'],
    ['agency_description', 'Anweo is a digital marketing agency based in Kerala that helps local businesses grow their online presence, attract more customers, and close more sales using modern digital tools.'],
    ['tone_of_voice', 'Friendly, direct, honest. No jargon. We speak like a knowledgeable friend, not a salesperson. We use simple English mixed with local warmth.'],
    ['unique_selling_points', 'Local market expertise; fast turnaround; affordable pricing for Kerala SMBs; results-focused approach; Malayalam and English support'],
    ['proof_points', 'We have helped restaurants, salons, retailers and event planners in Kerala get more bookings and walk-ins through social media and WhatsApp.'],
    ['target_market', 'Small and medium businesses in Kerala — especially those with no or weak online presence'],
    ['free_offer', 'Free digital audit and a no-obligation strategy call'],
  ]);

  // 7. Seed Templates
  console.log('\n📄 Seeding Templates...');
  await appendIfEmpty('Templates', [
    [uuidv4(), 'First Message Template', 'first_message', 'Hi {owner_name}! 👋 I came across {business_name} and loved what you\'re doing. I noticed you might benefit from a stronger online presence. At Anweo, we help businesses like yours attract more customers through digital marketing. Want a free audit? 😊', 'owner_name,business_name', 'TRUE'],
    [uuidv4(), 'Follow-up 1', 'followup_1', 'Hi {owner_name}, just checking in! 😊 Did you get a chance to look at my earlier message about {business_name}\'s online presence? I\'d love to share a quick idea that could help. Takes 10 mins!', 'owner_name,business_name', 'TRUE'],
    [uuidv4(), 'Follow-up 2', 'followup_2', 'Hey {owner_name}! One last time 🙂 — we\'re offering a free website/social media review this week. Many Kerala businesses saw 30% more enquiries after small changes. Worth a look?', 'owner_name', 'TRUE'],
  ]);

  // 8. Seed Admin User
  console.log('\n👤 Seeding Admin User...');
  const tempPassword = `Admin@${Math.floor(1000 + Math.random() * 9000)}`;
  const hash = await bcrypt.hash(tempPassword, 12);
  const adminId = uuidv4();
  await appendIfEmpty('Users', [
    [
      adminId, 'admin', hash, 'admin',
      JSON.stringify({ can_scrape: true, can_edit_packages: true, can_view_all_leads: true, can_export: true }),
      '10', '200', 'none', '0', 'TRUE', 'TRUE', '0', '', now,
    ],
  ]);

  // 9. Seed Sample Leads
  console.log('\n📋 Seeding Sample Leads...');
  const leadId1 = uuidv4(), leadId2 = uuidv4();
  await appendIfEmpty('Leads', [
    [
      leadId1, 'Spice Garden Restaurant', 'Restaurant', '+919876543210', '+919876543210',
      'MG Road, Ernakulam', 'Kochi', 'https://spicegarden.example.com', '', '4.2', '87',
      '', '', 'Google Maps', 'New', '', adminId, 'high', adminId, '', '', '', '', '',
      now, '', '', '',
    ],
    [
      leadId2, 'Elite Fitness Studio', 'Fitness & Gym', '+919812345678', '+919812345678',
      'Palarivattom, Ernakulam', 'Kochi', '', '', '4.5', '124',
      '@elitefitnessKochi', '', 'Instagram', 'New', '', adminId, 'medium', adminId, '', '', '', '', '',
      now, '', '', '',
    ],
  ]);

  // 10. Done
  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 ADMIN LOGIN CREDENTIALS (CHANGE IMMEDIATELY):');
  console.log(`   Username: admin`);
  console.log(`   Password: ${tempPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  This password will NOT be shown again.');
  console.log('   Log in and change it immediately at /change-password\n');
}

seedAll().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
