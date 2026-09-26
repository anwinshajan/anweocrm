/**
 * ============================================================
 * ANWEO CRM — Google Apps Script Backend
 * ============================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Click Extensions > Apps Script
 * 3. Delete any default code in Code.gs and paste THIS entire file.
 * 4. (Optional) Run `initialSetup()` once by selecting it from the toolbar dropdown and clicking "Run".
 *    This will automatically generate all 18 sheets and headers for you!
 * 5. Click "Deploy" > "New deployment"
 *    - Select type: "Web app"
 *    - Description: "Anweo CRM Sync"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Required so your Next.js server can read/write)
 * 6. Click "Deploy" and Authorize access.
 * 7. Copy the "Web app URL" (looks like https://script.google.com/macros/s/.../exec)
 * 8. Paste it into your .env.local as:
 *    GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 */

const HEADERS_SCHEMA = {
  "Leads": [
    "id", "business_name", "category", "phone", "whatsapp_number",
    "address", "city", "website", "google_maps_url", "rating",
    "review_count", "instagram", "facebook", "source", "status", "tags",
    "assigned_to", "priority", "added_by", "first_messaged_by",
    "last_messaged_by", "closed_by", "deal_value", "lost_reason",
    "created_at", "last_contacted_at", "next_followup_at", "closed_at"
  ],
  "Research": [
    "lead_id", "summary", "owner_name", "business_story",
    "review_highlights", "audit_results", "gaps_found",
    "opportunity_summary", "recommended_service_id", "generated_at"
  ],
  "Pitches": [
    "id", "lead_id", "service_id", "message_text", "wa_link",
    "version", "generated_by", "generated_at", "edited_by"
  ],
  "CallNotes": [
    "lead_id", "call_prep_note", "opening_lines",
    "objection_handlers", "created_at"
  ],
  "Messages": [
    "id", "lead_id", "user_id", "direction", "message_text",
    "template_used", "timestamp"
  ],
  "Services": [
    "id", "name", "description", "ideal_customer", "pitch_angle",
    "priority_rank", "active", "created_at"
  ],
  "Packages": [
    "id", "service_id", "name", "description", "price",
    "deliverables", "active"
  ],
  "BrandKnowledge": ["key", "value"],
  "Templates": ["id", "name", "type", "body", "variables", "active"],
  "Users": [
    "id", "username", "password_hash", "role", "permissions",
    "daily_target", "monthly_target", "commission_type",
    "commission_value", "active", "must_change_password",
    "failed_attempts", "locked_until", "created_at"
  ],
  "Activity": ["id", "lead_id", "user_id", "type", "content", "timestamp"],
  "Deals": [
    "id", "lead_id", "service_id", "service_name_snapshot",
    "package_id", "package_name_snapshot", "deal_value",
    "advance_paid", "balance_due", "start_date", "delivery_status",
    "closed_by", "closed_at"
  ],
  "Announcements": [
    "id", "from_admin", "to_user", "message", "created_at", "read_by"
  ],
  "Logs": ["timestamp", "user", "action", "details"],
  "Stats": ["date", "user", "metric", "value"],
  "Config": ["list_name", "value", "label", "sort_order", "active"],
  "Settings": ["key", "value"],
  "Payments": ["id", "user_id", "amount", "type", "method", "reference", "status", "created_at", "notes"]
};

// ─── One-Click Setup ──────────────────────────────────────────
function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const [tabName, headers] of Object.entries(HEADERS_SCHEMA)) {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }
  
  // Seed default admin and config if Users is empty
  const userSheet = ss.getSheetByName("Users");
  if (userSheet && userSheet.getLastRow() <= 1) {
    userSheet.appendRow([
      "admin-1", "admin", "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyUIXe/0Fv5r6kQO38Z3Zk06lT.jK66S", 
      "admin", "{}", "10", "100", "none", "0", "TRUE", "FALSE", "0", "", new Date().toISOString()
    ]);
  }

  Logger.log("✅ All 18 sheets & headers created successfully!");
}

// ─── API Webhook Handlers ─────────────────────────────────────

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Anweo CRM Google Apps Script Backend is running!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Read Tab
    if (action === "readTab") {
      const sheet = ss.getSheetByName(payload.tab);
      if (!sheet || sheet.getLastRow() === 0) {
        const headers = HEADERS_SCHEMA[payload.tab] || [];
        return responseJson({ data: headers.length > 0 ? [headers] : [] });
      }
      const data = sheet.getDataRange().getDisplayValues();
      return responseJson({ data });
    }

    // 2. Append Rows
    if (action === "appendRows") {
      let sheet = ss.getSheetByName(payload.tab);
      if (!sheet) {
        sheet = ss.insertSheet(payload.tab);
        const headers = HEADERS_SCHEMA[payload.tab] || [];
        if (headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
      }
      if (payload.rows && payload.rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
      }
      return responseJson({ success: true });
    }

    // 3. Update Row
    if (action === "updateRow") {
      const sheet = ss.getSheetByName(payload.tab);
      if (sheet && payload.rowIndex && payload.values) {
        sheet.getRange(payload.rowIndex, 1, 1, payload.values.length).setValues([payload.values]);
      }
      return responseJson({ success: true });
    }

    // 4. Overwrite Data Rows
    if (action === "overwriteDataRows") {
      let sheet = ss.getSheetByName(payload.tab);
      if (!sheet) {
        sheet = ss.insertSheet(payload.tab);
        sheet.getRange(1, 1, 1, payload.headers.length).setValues([payload.headers]);
      } else {
        const lastRow = sheet.getLastRow();
        const lastCol = Math.max(sheet.getLastColumn(), payload.headers.length);
        if (lastRow > 1) {
          sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        }
      }
      if (payload.rows && payload.rows.length > 0) {
        sheet.getRange(2, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
      }
      return responseJson({ success: true });
    }

    // 5. Init Sheets
    if (action === "initSheets") {
      for (const [tabName, cols] of Object.entries(payload.headers || {})) {
        let sheet = ss.getSheetByName(tabName);
        if (!sheet) {
          sheet = ss.insertSheet(tabName);
          sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
        }
      }
      return responseJson({ success: true });
    }

    return responseJson({ error: `Unknown action: ${action}` });
  } catch (err) {
    return responseJson({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
