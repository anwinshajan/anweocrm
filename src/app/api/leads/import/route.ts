import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { batchCreateLeads, getLeads } from '@/lib/data/leads';
import { addActivity } from '@/lib/data';
import type { Lead } from '@/lib/types';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { leads, skipDuplicates = true, defaultAssignedTo = '', defaultSource = 'Import' } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided for import' }, { status: 400 });
    }

    // Get existing leads to check duplicates
    const existingLeads = await getLeads();
    const existingPhones = new Set<string>();
    
    existingLeads.forEach((l) => {
      const p1 = (l.phone || '').replace(/\D/g, '');
      const p2 = (l.whatsapp_number || '').replace(/\D/g, '');
      if (p1) existingPhones.add(p1);
      if (p2) existingPhones.add(p2);
    });

    const leadsToInsert: Partial<Lead>[] = [];
    let duplicatesSkipped = 0;

    for (const lead of leads) {
      const rawPhone = (lead.phone || lead.whatsapp_number || '').toString().trim();
      const phoneDigits = rawPhone.replace(/\D/g, '');

      if (!lead.business_name && !rawPhone) {
        continue; // skip completely empty rows
      }

      if (skipDuplicates && phoneDigits && existingPhones.has(phoneDigits)) {
        duplicatesSkipped++;
        continue;
      }

      // Add to unique list
      if (phoneDigits) {
        existingPhones.add(phoneDigits);
      }

      leadsToInsert.push({
        business_name: lead.business_name || 'Unnamed Business',
        category: lead.category || '',
        phone: rawPhone,
        whatsapp_number: lead.whatsapp_number || rawPhone,
        address: lead.address || '',
        city: lead.city || '',
        website: lead.website || '',
        google_maps_url: lead.google_maps_url || '',
        rating: lead.rating ? String(lead.rating) : '',
        review_count: lead.review_count ? String(lead.review_count) : '',
        instagram: lead.instagram || '',
        facebook: lead.facebook || '',
        source: lead.source || defaultSource || 'Import',
        status: lead.status || 'New',
        tags: lead.tags || '',
        priority: lead.priority || 'medium',
        assigned_to: lead.assigned_to || defaultAssignedTo || (session.role === 'admin' ? '' : session.id),
        added_by: session.id,
      });
    }

    if (leadsToInsert.length === 0 && duplicatesSkipped > 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        duplicatesSkipped,
        message: `All ${duplicatesSkipped} leads were detected as duplicates and skipped.`,
      });
    }

    const inserted = await batchCreateLeads(leadsToInsert as any[]);

    // Log the activity
    await addActivity({
      user_id: session.id,
      lead_id: 'batch',
      type: 'LEAD_IMPORT',
      content: `Imported ${inserted.length} leads (${duplicatesSkipped} duplicates skipped).`,
    });

    return NextResponse.json({
      success: true,
      count: inserted.length,
      duplicatesSkipped,
      leads: inserted,
    });
  } catch (err) {
    console.error('[API:leads:import] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
