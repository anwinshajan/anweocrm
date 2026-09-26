'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Upload, FileText, CheckCircle2, AlertTriangle, 
  Download, Eye, Sparkles, RefreshCw, X, Check, Users, Database
} from 'lucide-react';

interface Props {
  users: { id: string; username: string; role: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

const CRM_FIELDS = [
  { key: 'business_name', label: 'Business Name', required: true, aliases: ['name', 'business', 'company', 'title', 'shop_name', 'business_name'] },
  { key: 'phone', label: 'Phone Number', required: true, aliases: ['phone', 'mobile', 'contact', 'telephone', 'tel', 'phone_number'] },
  { key: 'whatsapp_number', label: 'WhatsApp Number', aliases: ['whatsapp', 'wa', 'wa_number', 'whatsapp_number'] },
  { key: 'category', label: 'Category / Industry', aliases: ['category', 'industry', 'type', 'niche', 'business_type'] },
  { key: 'city', label: 'City / Location', aliases: ['city', 'location', 'town', 'area', 'district'] },
  { key: 'address', label: 'Address', aliases: ['address', 'street', 'location_full'] },
  { key: 'website', label: 'Website', aliases: ['website', 'site', 'url', 'web'] },
  { key: 'google_maps_url', label: 'Google Maps URL', aliases: ['maps', 'gmaps', 'google_maps', 'maps_url', 'google_maps_url'] },
  { key: 'rating', label: 'Rating (0-5)', aliases: ['rating', 'stars', 'score'] },
  { key: 'review_count', label: 'Review Count', aliases: ['reviews', 'review_count', 'reviews_count', 'ratings_count'] },
  { key: 'instagram', label: 'Instagram Handle', aliases: ['instagram', 'ig', 'insta'] },
  { key: 'facebook', label: 'Facebook URL', aliases: ['facebook', 'fb'] },
  { key: 'priority', label: 'Priority (low/medium/high)', aliases: ['priority', 'lead_priority'] },
  { key: 'source', label: 'Lead Source', aliases: ['source', 'lead_source', 'channel'] },
  { key: 'tags', label: 'Tags (comma separated)', aliases: ['tags', 'tag', 'labels'] },
];

export default function ImportLeadsClient({ users, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow steps: 1: upload/paste -> 2: map & preview -> 3: importing -> 4: summary
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  
  // Raw data parsed from file
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [pasteText, setPasteText] = useState('');

  // Column Mapping: { crmFieldKey: columnIndex }
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  
  // Options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultAssignedTo, setDefaultAssignedTo] = useState(isAdmin ? '' : currentUserId);
  const [defaultSource, setDefaultSource] = useState('Google Maps Scraping');

  // Import Execution & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    duplicatesSkipped: number;
    message?: string;
  } | null>(null);

  // ─── CSV Parsing ──────────────────────────────────────────────
  const parseCSVContent = (content: string, name: string) => {
    setErrorMsg('');
    const cleanContent = content.trim();
    if (!cleanContent) {
      setErrorMsg('The file or text is empty.');
      return;
    }

    // Split rows handling possible linebreaks inside quoted cells
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    if (lines.length < 2) {
      setErrorMsg('CSV must contain at least a header row and one data row.');
      return;
    }

    // Parse single CSV line
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let quotes = false;
      const delimiter = line.includes('\t') ? '\t' : ',';

      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          quotes = !quotes;
        } else if (c === delimiter && !quotes) {
          result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine).filter((r) => r.some((val) => val.length > 0));

    if (rows.length === 0) {
      setErrorMsg('No valid lead rows found in file.');
      return;
    }

    setFileName(name);
    setRawHeaders(headers);
    setRawRows(rows);

    // Auto-detect mappings
    const autoMap: Record<string, number> = {};
    CRM_FIELDS.forEach((field) => {
      const matchIdx = headers.findIndex((h) => {
        const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return field.aliases.some((alias) => cleanHeader.includes(alias) || alias.includes(cleanHeader));
      });
      if (matchIdx !== -1) {
        autoMap[field.key] = matchIdx;
      }
    });

    setColumnMapping(autoMap);
    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVContent(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setErrorMsg('Please paste your CSV text.');
      return;
    }
    parseCSVContent(pasteText, 'Pasted Data.csv');
  };

  // ─── Download Sample CSV Template ─────────────────────────────
  const downloadSampleTemplate = () => {
    const headers = CRM_FIELDS.map((f) => f.label).join(',');
    const sampleRow = [
      '"Royal Spices & Dry Fruits"',
      '"9876543210"',
      '"9876543210"',
      '"Spices Retail & Export"',
      '"Kochi"',
      '"MG Road, Marine Drive, Kochi, Kerala"',
      '"https://royalspices.in"',
      '"https://maps.google.com/?q=royalspices"',
      '"4.8"',
      '"145"',
      '"royalspices_official"',
      '"https://facebook.com/royalspices"',
      '"high"',
      '"Google Maps"',
      '"VIP,Retail,LocalSEO"',
    ].join(',');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${sampleRow}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Anweo_CRM_Leads_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Transform Rows to Leads for Preview/Submit ────────────────
  const getMappedLeads = () => {
    return rawRows.map((row) => {
      const lead: Record<string, string> = {};
      CRM_FIELDS.forEach((f) => {
        const colIdx = columnMapping[f.key];
        lead[f.key] = colIdx !== undefined && row[colIdx] !== undefined ? row[colIdx].trim() : '';
      });
      return lead;
    });
  };

  const mappedLeads = step >= 2 ? getMappedLeads() : [];
  const validLeadsCount = mappedLeads.filter((l) => l.business_name || l.phone).length;

  // ─── Execute Import ───────────────────────────────────────────
  const executeImport = async () => {
    if (!columnMapping['business_name'] && !columnMapping['phone']) {
      setErrorMsg('Please map at least Business Name or Phone Number column.');
      return;
    }

    setIsProcessing(true);
    setStep(3);
    setImportProgress(25);
    setErrorMsg('');

    try {
      setImportProgress(50);
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: mappedLeads,
          skipDuplicates,
          defaultAssignedTo,
          defaultSource,
        }),
      });

      setImportProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      setImportProgress(100);
      setImportResult({
        success: true,
        count: data.count,
        duplicatesSkipped: data.duplicatesSkipped,
        message: data.message,
      });
      setStep(4);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error during import');
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in text-[var(--text-primary)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-white transition-all border border-[var(--border)]"
              title="Back to Leads"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Import Leads
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#B8FF33]/10 text-[#B8FF33] border border-[#B8FF33]/30 font-semibold tracking-wide uppercase">
                  Batch Sync
                </span>
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
                Upload CSV or Excel data directly into your connected Google Sheet database.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="btn-secondary flex items-center gap-2 text-xs font-semibold self-start sm:self-auto hover:border-[#B8FF33]/50 transition-all"
        >
          <Download className="w-4 h-4 text-[#B8FF33]" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between animate-shake">
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className={`p-3 rounded-xl border transition-all ${step === 1 ? 'bg-[#B8FF33]/10 border-[#B8FF33]/40' : step > 1 ? 'bg-[var(--surface-2)] border-emerald-500/30' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? 'bg-emerald-500 text-black' : step === 1 ? 'bg-[#B8FF33] text-black' : 'bg-[var(--surface-3)] text-white'}`}>
              {step > 1 ? '✓' : '1'}
            </span>
            <span className="text-xs md:text-sm font-semibold">Upload Data</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl border transition-all ${step === 2 ? 'bg-[#B8FF33]/10 border-[#B8FF33]/40' : step > 2 ? 'bg-[var(--surface-2)] border-emerald-500/30' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > 2 ? 'bg-emerald-500 text-black' : step === 2 ? 'bg-[#B8FF33] text-black' : 'bg-[var(--surface-3)] text-white'}`}>
              {step > 2 ? '✓' : '2'}
            </span>
            <span className="text-xs md:text-sm font-semibold">Map & Preview</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl border transition-all ${step >= 3 ? 'bg-[#B8FF33]/10 border-[#B8FF33]/40' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 4 ? 'bg-emerald-500 text-black' : step === 3 ? 'bg-[#B8FF33] text-black' : 'bg-[var(--surface-3)] text-white'}`}>
              {step === 4 ? '✓' : '3'}
            </span>
            <span className="text-xs md:text-sm font-semibold">Sync & Finish</span>
          </div>
        </div>
      </div>

      {/* ─── STEP 1: Upload or Paste ───────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <button
              onClick={() => setActiveTab('file')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'file' ? 'bg-[#B8FF33] text-black font-semibold shadow-lg shadow-[#B8FF33]/20' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <Upload className="w-4 h-4" />
              Upload CSV File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'paste' ? 'bg-[#B8FF33] text-black font-semibold shadow-lg shadow-[#B8FF33]/20' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
              <FileText className="w-4 h-4" />
              Paste CSV / Text
            </button>
          </div>

          {activeTab === 'file' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] hover:border-[#B8FF33]/60 bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-16 h-16 rounded-2xl bg-[#B8FF33]/10 text-[#B8FF33] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Drop your CSV file here, or <span className="text-[#B8FF33] underline">browse</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-2">
                Supports .CSV, .TSV, or text files exported from Google Maps Scrapers, Meta Lead Ads, Apollo, or Excel.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste CSV text here with headers on the first line...&#10;Business Name,Phone,Category,City&#10;Spice Villa,9876543210,Restaurant,Kochi"
                rows={10}
                className="input w-full font-mono text-xs bg-[var(--surface-2)] p-4 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePasteSubmit}
                  className="btn-primary flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Parse Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: Map Columns & Preview ─────────────────────────── */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          {/* File summary & General Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-glass p-5 flex items-center justify-between border border-[var(--border)]">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Source File</p>
                <p className="text-sm font-bold text-white mt-1 truncate max-w-[200px]">{fileName}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-[var(--surface-3)] text-[var(--text-secondary)] font-mono">
                {rawRows.length} rows detected
              </span>
            </div>

            <div className="card-glass p-5 border border-[var(--border)]">
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#B8FF33]" />
                Default Assigned User
              </label>
              <select
                value={defaultAssignedTo}
                onChange={(e) => setDefaultAssignedTo(e.target.value)}
                className="input w-full text-xs py-1.5"
              >
                <option value="">Unassigned (Pool)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="card-glass p-5 border border-[var(--border)]">
              <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#B8FF33]" />
                Lead Source Label
              </label>
              <input
                type="text"
                value={defaultSource}
                onChange={(e) => setDefaultSource(e.target.value)}
                placeholder="e.g. Google Maps Scraping"
                className="input w-full text-xs py-1.5"
              />
            </div>
          </div>

          {/* Duplicate Handling Checkbox */}
          <div className="card-glass p-4 border border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Smart Duplicate Protection</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Skip leads whose phone number or WhatsApp already exists in your Google Sheet.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--surface-3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B8FF33]"></div>
            </label>
          </div>

          {/* Column Mapping Grid */}
          <div className="card-glass p-6 border border-[var(--border)]">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8FF33]" />
              Match CSV Columns to CRM Fields
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CRM_FIELDS.map((field) => {
                const isMapped = columnMapping[field.key] !== undefined;
                return (
                  <div
                    key={field.key}
                    className={`p-3.5 rounded-xl border transition-all ${isMapped ? 'bg-[var(--surface-2)] border-[#B8FF33]/30' : 'bg-[var(--surface-2)]/40 border-[var(--border)]'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-rose-400 text-xs">*</span>}
                      </span>
                      {isMapped ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                          Mapped
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">Optional</span>
                      )}
                    </div>

                    <select
                      value={columnMapping[field.key] !== undefined ? columnMapping[field.key] : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                        setColumnMapping((prev) => {
                          const updated = { ...prev };
                          if (val === undefined) {
                            delete updated[field.key];
                          } else {
                            updated[field.key] = val;
                          }
                          return updated;
                        });
                      }}
                      className="input w-full text-xs py-1.5"
                    >
                      <option value="">-- Ignore this column --</option>
                      {rawHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          Column {idx + 1}: {header}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Preview Table (First 5 Rows) */}
          <div className="card-glass p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#B8FF33]" />
                <h3 className="text-base font-bold text-white">Live Data Preview (First 5 Leads)</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Ready to import {validLeadsCount} valid records
              </span>
            </div>

            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-3)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Business Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {mappedLeads.slice(0, 5).map((lead, idx) => (
                    <tr key={idx} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="p-3 font-mono text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">{lead.business_name || '<Empty>'}</td>
                      <td className="p-3 font-mono text-[#B8FF33]">{lead.phone || '<Empty>'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{lead.category || '-'}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{lead.city || '-'}</td>
                      <td className="p-3 text-[var(--text-secondary)] truncate max-w-[150px]">{lead.website || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary text-xs"
            >
              Choose Different File
            </button>

            <button
              onClick={executeImport}
              disabled={isProcessing || validLeadsCount === 0}
              className="btn-primary flex items-center gap-2 text-sm px-6 py-3 shadow-lg shadow-[#B8FF33]/20"
            >
              <Upload className="w-4 h-4" />
              <span>Import {validLeadsCount} Leads to Google Sheet</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Syncing in Progress ───────────────────────────── */}
      {step === 3 && (
        <div className="card-glass p-16 text-center max-w-xl mx-auto border border-[#B8FF33]/30 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-[#B8FF33]/10 text-[#B8FF33] flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-8 h-8 animate-spin text-[#B8FF33]" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Syncing with Google Sheets...</h2>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Batch inserting {validLeadsCount} leads and checking for duplicates in real-time.
          </p>

          <div className="w-full bg-[var(--surface-3)] h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-[#B8FF33] h-full transition-all duration-500"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)]">{importProgress}% Completed</p>
        </div>
      )}

      {/* ─── STEP 4: Success Summary ───────────────────────────────── */}
      {step === 4 && importResult && (
        <div className="card-glass p-10 max-w-2xl mx-auto border border-emerald-500/40 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
            <Check className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Import Successful!</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-8">
            Your leads have been inserted into your live Google Sheet and are ready for outreach.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-3xl font-black text-[#B8FF33]">{importResult.count}</p>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Leads Imported</p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-3xl font-black text-amber-400">{importResult.duplicatesSkipped}</p>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Duplicates Skipped</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/leads"
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3"
            >
              <span>View All Leads</span>
            </Link>

            <button
              onClick={() => {
                setStep(1);
                setFileName('');
                setRawRows([]);
                setRawHeaders([]);
                setPasteText('');
              }}
              className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3"
            >
              <span>Import Another File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
