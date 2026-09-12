import React, { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Info,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lead, User as UserType } from '../types/index.ts';

export interface CsvRowData {
  id: string;
  companyName: string;
  domain: string;
  industry: string;
  employeeCount: number;
  location: string;
  atsUsage: string;
  openPositionsCount: number;
  recruiterHiringCount: number;
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedin: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate?: boolean;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads: Lead[];
  users: UserType[];
  onImportSuccess: (newLeads: Lead[]) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const SAMPLE_CSV = `Company,Domain,Industry,Employees,Location,ATS,ContactFirstName,ContactLastName,ContactTitle,ContactEmail,Phone
ScaleOps Cloud,scaleops.example.io,Software / SaaS / Tech,450,Austin TX,Greenhouse,Rachel,Adams,Head of Talent Acquisition,rachel@scaleops.example.io,+1 512-555-0143
FinEdge Payments,finedge.example.com,Financial Services & FinTech,320,New York NY,Lever,Daniel,Kim,Director of Recruiting,daniel@finedge.example.com,+1 212-555-0188
BioVance Therapeutics,biovance.example.org,Healthcare & HealthTech,620,Boston MA,Workday,Elena,Rostova,VP of People & Talent,elena.r@biovance.example.org,+1 617-555-0199
Apex Logistics,apexlog.example.net,Logistics & Supply Chain,890,Chicago IL,iCIMS,Marcus,Brody,Talent Acquisition Manager,m.brody@apexlog.example.net,+1 312-555-0176
,missing-company.example.com,Software / SaaS / Tech,150,Seattle WA,Ashby,Thomas,Wright,Lead Technical Recruiter,t.wright@example.com,+1 206-555-0122
Quantum Logic Labs,quantumlogic.example.ai,Software / SaaS / Tech,210,San Jose CA,Greenhouse,Sarah,Palmer,Head of People,invalid-email-address,+1 408-555-0131`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingLeads,
  users,
  onImportSuccess,
  onShowToast,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<CsvRowData[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'errors'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [routingMode, setRoutingMode] = useState<'auto' | 'round_robin' | 'single'>('auto');
  const [selectedSdrId, setSelectedSdrId] = useState<string>('auto');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email validation regex (RFC 5322 simplified standard)
  const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  // Validate a single row
  const validateRow = useCallback(
    (row: Partial<CsvRowData>, idx: number): CsvRowData => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required Field 1: Company Name
      const companyName = (row.companyName || '').trim();
      if (!companyName) {
        errors.push('Missing required field: Company Name');
      }

      // Required Field 2: Work Email
      const email = (row.contactEmail || '').trim();
      if (!email) {
        errors.push('Missing required field: Email');
      } else if (!isValidEmail(email)) {
        errors.push(`Invalid email format: "${email}"`);
      }

      // Check for duplicates against existing leads
      let isDuplicate = false;
      if (email) {
        const dupContact = existingLeads.find(
          (l) => l.contact?.email && l.contact.email.toLowerCase() === email.toLowerCase()
        );
        if (dupContact) {
          isDuplicate = true;
          warnings.push(`Duplicate lead: Email exists on ${dupContact.company?.name}`);
        }
      }

      if (companyName && !isDuplicate) {
        const dupCompany = existingLeads.find(
          (l) => l.company?.name && l.company.name.toLowerCase() === companyName.toLowerCase()
        );
        if (dupCompany) {
          warnings.push(`Company already exists in CRM (${dupCompany.company?.name})`);
        }
      }

      // Domain auto-derivation
      let domain = (row.domain || '').trim();
      if (!domain && email && isValidEmail(email)) {
        domain = email.split('@')[1];
      } else if (!domain && companyName) {
        domain = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      }

      return {
        id: row.id || `csv-row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        companyName,
        domain,
        industry: (row.industry || 'Software / SaaS / Tech').trim(),
        employeeCount: Number(row.employeeCount) || 250,
        location: (row.location || 'United States').trim(),
        atsUsage: (row.atsUsage || 'Greenhouse').trim(),
        openPositionsCount: Number(row.openPositionsCount) || 12,
        recruiterHiringCount: Number(row.recruiterHiringCount) || 2,
        contactFirstName: (row.contactFirstName || 'Key').trim(),
        contactLastName: (row.contactLastName || 'Decision Maker').trim(),
        contactTitle: (row.contactTitle || 'Head of Talent Acquisition').trim(),
        contactEmail: email,
        contactPhone: (row.contactPhone || '').trim(),
        contactLinkedin: (row.contactLinkedin || '').trim(),
        isValid: errors.length === 0,
        errors,
        warnings,
        isDuplicate,
      };
    },
    [existingLeads]
  );

  // Parse CSV text into row objects
  const parseCsvContent = useCallback(
    (text: string, sourceName?: string) => {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        onShowToast('CSV file must have at least a header row and one data row.', 'warning');
        return;
      }

      // Parse headers
      const headerLine = lines[0];
      const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

      // Helper to find column index by fuzzy match
      const findCol = (...aliases: string[]): number => {
        return headers.findIndex((h) =>
          aliases.some((alias) => h === alias || h.includes(alias))
        );
      };

      const colCompany = findCol('company', 'company_name', 'organization', 'account');
      const colDomain = findCol('domain', 'website', 'url');
      const colIndustry = findCol('industry', 'sector', 'vertical');
      const colEmployees = findCol('employee', 'headcount', 'size');
      const colLocation = findCol('location', 'city', 'country', 'region');
      const colAts = findCol('ats', 'system', 'recruiting_tool');
      const colFirstName = findCol('first_name', 'firstname', 'first name', 'first');
      const colLastName = findCol('last_name', 'lastname', 'last name', 'last');
      const colTitle = findCol('title', 'job_title', 'role', 'position');
      const colEmail = findCol('email', 'contact_email', 'work_email', 'mail');
      const colPhone = findCol('phone', 'telephone', 'mobile');
      const colLinkedin = findCol('linkedin', 'profile');

      const rows: CsvRowData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rawValues = parseCsvLine(lines[i]);
        if (rawValues.length === 0 || rawValues.every((v) => !v)) continue;

        // Extract values using matched columns, or fall back to default position if header didn't match
        const companyVal = colCompany !== -1 ? rawValues[colCompany] : rawValues[0] || '';
        const emailVal = colEmail !== -1 ? rawValues[colEmail] : rawValues[9] || rawValues[1] || '';

        const rowRaw: Partial<CsvRowData> = {
          companyName: companyVal,
          domain: colDomain !== -1 ? rawValues[colDomain] : rawValues[1] || '',
          industry: colIndustry !== -1 ? rawValues[colIndustry] : rawValues[2] || '',
          employeeCount: Number(colEmployees !== -1 ? rawValues[colEmployees] : rawValues[3]) || 250,
          location: colLocation !== -1 ? rawValues[colLocation] : rawValues[4] || '',
          atsUsage: colAts !== -1 ? rawValues[colAts] : rawValues[5] || 'Greenhouse',
          contactFirstName: colFirstName !== -1 ? rawValues[colFirstName] : rawValues[6] || '',
          contactLastName: colLastName !== -1 ? rawValues[colLastName] : rawValues[7] || '',
          contactTitle: colTitle !== -1 ? rawValues[colTitle] : rawValues[8] || '',
          contactEmail: emailVal,
          contactPhone: colPhone !== -1 ? rawValues[colPhone] : rawValues[10] || '',
          contactLinkedin: colLinkedin !== -1 ? rawValues[colLinkedin] : '',
        };

        rows.push(validateRow(rowRaw, i));
      }

      setParsedRows(rows);
      if (sourceName) setFileName(sourceName);
    },
    [onShowToast, validateRow]
  );

  // Helper to parse standard CSV line with quotes support
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      onShowToast('Please upload a valid CSV file (.csv)', 'warning');
      return;
    }

    readFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvRawText(content);
        parseCsvContent(content, file.name);
      }
    };
    reader.onerror = () => {
      onShowToast('Failed to read the file. Please try again.', 'warning');
    };
    reader.readAsText(file);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    setCsvRawText(SAMPLE_CSV);
    parseCsvContent(SAMPLE_CSV, 'sample_leads.csv');
  };

  // Download template
  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'resourcely_lead_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('CSV template downloaded successfully.', 'info');
  };

  // Edit single field in preview table
  const handleUpdateRowField = (id: string, field: keyof CsvRowData, value: any) => {
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        return validateRow(updated, 0);
      })
    );
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    setParsedRows([]);
    setCsvRawText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      onShowToast('No valid leads available to import. Please resolve validation errors.', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        leads: validRows.map((r) => ({
          companyName: r.companyName,
          domain: r.domain,
          industry: r.industry,
          employeeCount: r.employeeCount,
          location: r.location,
          atsUsage: r.atsUsage,
          openPositionsCount: r.openPositionsCount,
          recruiterHiringCount: r.recruiterHiringCount,
          contactFirstName: r.contactFirstName,
          contactLastName: r.contactLastName,
          contactTitle: r.contactTitle,
          contactEmail: r.contactEmail,
          contactPhone: r.contactPhone,
          contactLinkedin: r.contactLinkedin,
        })),
        defaultSdrId: selectedSdrId,
        routingMode,
      };

      const res = await fetch('/api/leads/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(errorData.error || 'Failed to import leads');
      }

      const data = await res.json();

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // Safe fallback if canvas not available
      }

      onImportSuccess(data.leads || []);
      onShowToast(
        `Successfully imported and scored ${data.importedCount} leads into RevOps Cockpit!`,
        'success'
      );
      handleClearAll();
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Error occurred during batch import', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;

  const displayedRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'errors') return !r.isValid;
    return true;
  });

  const activeSdrs = users.filter((u) => u.role === 'SDR');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Import Leads via CSV
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Required Fields Validated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bulk upload prospective accounts. Validates mandatory fields (<strong className="text-slate-300 font-mono">Company Name</strong> & <strong className="text-slate-300 font-mono">Email</strong>), scores with ICP engine, and routes to SDRs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Mode Selector & Actions */}
        {parsedRows.length === 0 ? (
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                    activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Drag & Drop / Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                    activeTab === 'paste' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Raw CSV Text
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5"
                  title="Download standard CSV template"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Template (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition flex items-center space-x-1.5"
                  title="Load sample leads with validation scenarios"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Load Sample CSV</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone (Usability Pattern compliant) */}
            {activeTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drag & Drop your CSV file here, or{' '}
                      <span className="text-indigo-400 underline underline-offset-2">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports comma-separated values (.csv) with standard column headers.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono pt-2">
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Company Name (Required)</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Work Email (Required)</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Paste CSV text including column header row:</span>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Insert Sample
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="Company,Domain,Industry,Employees,Location,ATS,ContactFirstName,ContactLastName,ContactTitle,ContactEmail..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => parseCsvContent(csvRawText, 'pasted_data.csv')}
                  disabled={!csvRawText.trim()}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  Parse & Validate CSV Content
                </button>
              </div>
            )}

            {/* Informational Guidance */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
                <Info className="w-4 h-4" />
                <span>Smart Column Header Mapping & Validation Rules</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The import engine matches headers automatically regardless of order (e.g.{' '}
                <code className="text-slate-200">Company</code>,{' '}
                <code className="text-slate-200">Email</code>,{' '}
                <code className="text-slate-200">First Name</code>,{' '}
                <code className="text-slate-200">Title</code>,{' '}
                <code className="text-slate-200">ATS</code>). Each prospective row is rigorously validated to ensure no corrupt or missing accounts enter your SDR outreach queue.
              </p>
            </div>
          </div>
        ) : (
          /* Parsed Rows Validation & Review Mode */
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Validation Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">File:</span>
                  <span className="font-mono text-xs text-white font-semibold">{fileName || 'leads.csv'}</span>
                </div>
                <span className="text-slate-700">|</span>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-slate-300">
                    Total: {parsedRows.length} rows
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{validCount} Valid</span>
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{errorCount} Invalid / Errors</span>
                    </span>
                  )}
                  {duplicateCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                      {duplicateCount} Duplicates
                    </span>
                  )}
                </div>
              </div>

              {/* Reset / Upload New */}
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Upload Different File</span>
              </button>
            </div>

            {/* Filter Pills & Routing Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterView('all')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    filterView === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Rows ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterView('valid')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    filterView === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Valid Only ({validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterView('errors')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    filterView === 'errors' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Errors Only ({errorCount})
                </button>
              </div>

              {/* Assignment Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Route to SDR:</span>
                <select
                  value={selectedSdrId}
                  onChange={(e) => {
                    setSelectedSdrId(e.target.value);
                    if (e.target.value === 'auto') {
                      setRoutingMode('auto');
                    } else if (e.target.value === 'round_robin') {
                      setRoutingMode('round_robin');
                    } else {
                      setRoutingMode('single');
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="auto">AI RevOps Smart Route (ICP Fit)</option>
                  <option value="round_robin">Round-Robin (Even Split)</option>
                  <optgroup label="Assign Specific SDR">
                    {activeSdrs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.team})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Validation Table View */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 font-mono text-[11px] z-10">
                  <tr>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Company Name *</th>
                    <th className="py-2 px-3">Work Email *</th>
                    <th className="py-2 px-3">Decision Maker</th>
                    <th className="py-2 px-3">Industry / ATS</th>
                    <th className="py-2 px-3">Validation Details</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No rows found matching current filter view.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, idx) => {
                      const isEditing = editingRowId === row.id;

                      return (
                        <tr
                          key={row.id}
                          className={`transition ${
                            !row.isValid
                              ? 'bg-rose-950/15 hover:bg-rose-950/25'
                              : row.isDuplicate
                              ? 'bg-amber-950/10 hover:bg-amber-950/20'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Status Badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                                <span>Error</span>
                              </span>
                            )}
                          </td>

                          {/* Company Name */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={row.companyName}
                                onChange={(e) => handleUpdateRowField(row.id, 'companyName', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                                placeholder="Company Name (Required)"
                              />
                            ) : (
                              <div className="flex items-center space-x-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span
                                  className={`font-semibold ${
                                    !row.companyName ? 'text-rose-400 italic font-mono' : 'text-slate-200'
                                  }`}
                                >
                                  {row.companyName || '[Missing Company Name]'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Email */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="email"
                                value={row.contactEmail}
                                onChange={(e) => handleUpdateRowField(row.id, 'contactEmail', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                                placeholder="Email (Required)"
                              />
                            ) : (
                              <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                <span
                                  className={`${
                                    !row.contactEmail || !isValidEmail(row.contactEmail)
                                      ? 'text-rose-400 font-bold underline decoration-rose-500'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {row.contactEmail || '[Missing Email]'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Decision Maker */}
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <div className="flex space-x-1">
                                <input
                                  type="text"
                                  value={row.contactFirstName}
                                  onChange={(e) => handleUpdateRowField(row.id, 'contactFirstName', e.target.value)}
                                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                                  placeholder="First"
                                />
                                <input
                                  type="text"
                                  value={row.contactTitle}
                                  onChange={(e) => handleUpdateRowField(row.id, 'contactTitle', e.target.value)}
                                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                                  placeholder="Title"
                                />
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-200 font-medium">
                                  {row.contactFirstName} {row.contactLastName}
                                </span>
                                <div className="text-[10px] text-slate-400 line-clamp-1">{row.contactTitle}</div>
                              </div>
                            )}
                          </td>

                          {/* Industry / ATS */}
                          <td className="py-2.5 px-3">
                            <div className="text-slate-300">{row.industry.split('/')[0]}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ATS: {row.atsUsage}</div>
                          </td>

                          {/* Validation Details */}
                          <td className="py-2.5 px-3">
                            {row.errors.length > 0 ? (
                              <div className="space-y-1">
                                {row.errors.map((err, eIdx) => (
                                  <div
                                    key={eIdx}
                                    className="text-[10px] text-rose-300 bg-rose-950/50 border border-rose-900/60 rounded px-1.5 py-0.5 inline-block mr-1"
                                  >
                                    ❌ {err}
                                  </div>
                                ))}
                              </div>
                            ) : row.warnings.length > 0 ? (
                              <div className="space-y-1">
                                {row.warnings.map((warn, wIdx) => (
                                  <div
                                    key={wIdx}
                                    className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-900/60 rounded px-1.5 py-0.5 inline-block mr-1"
                                  >
                                    ⚠️ {warn}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                Ready for ICP scoring
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() => setEditingRowId(isEditing ? null : row.id)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                                  isEditing
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                                }`}
                                title={isEditing ? 'Save edits' : 'Edit row data'}
                              >
                                {isEditing ? 'Done' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Error handling options */}
            {errorCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs shrink-0">
                <div className="flex items-center space-x-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {errorCount} row{errorCount > 1 ? 's' : ''} have missing required fields (Company Name or Email).
                  </span>
                </div>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Skip invalid rows and import {validCount} valid leads</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Footer / Submit */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 && (
              <span>
                {validCount} of {parsedRows.length} leads validated & ready
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>Scoring & Routing Leads...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      Import {validCount} Valid Lead{validCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
