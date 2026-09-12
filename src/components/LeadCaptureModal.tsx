import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Search,
  UploadCloud,
  User,
  X,
} from 'lucide-react';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLead: (payload: any) => Promise<void>;
  onCheckDuplicate: (payload: any) => Promise<any>;
  onOpenFullCsvModal?: () => void;
}

export const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  isOpen,
  onClose,
  onSubmitLead,
  onCheckDuplicate,
  onOpenFullCsvModal,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'csv'>('single');

  // Single form fields
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('Software / SaaS / Tech');
  const [employeeCount, setEmployeeCount] = useState(250);
  const [location, setLocation] = useState('San Francisco, CA');
  const [atsUsage, setAtsUsage] = useState('Greenhouse');
  const [openPositionsCount, setOpenPositionsCount] = useState(15);
  const [recruiterHiringCount, setRecruiterHiringCount] = useState(2);
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactTitle, setContactTitle] = useState('Head of Talent Acquisition');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');

  // Duplicate Check Feedback
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Debounced duplicate checking
  useEffect(() => {
    if (!isOpen || (!contactEmail && !domain && !companyName)) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await onCheckDuplicate({
          email: contactEmail,
          domain: domain,
          companyName: companyName,
        });
        if (res.isDuplicate) {
          setDuplicateWarning(`Potential duplicate detected: ${res.reasons.join(', ')}`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, contactEmail, domain, companyName]);

  if (!isOpen) return null;

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitLead({
      companyName,
      domain,
      industry,
      employeeCount: Number(employeeCount),
      location,
      atsUsage,
      openPositionsCount: Number(openPositionsCount),
      recruiterHiringCount: Number(recruiterHiringCount),
      contactFirstName,
      contactLastName,
      contactTitle,
      contactEmail,
      contactPhone,
      contactLinkedin,
      source: 'Inbound Demo',
    });
    onClose();
  };

  const isValidEmail = (email: string) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleProcessCsv = async () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setCsvErrors([{ row: 0, error: 'CSV must contain a header row and at least one data row.' }]);
      return;
    }

    setCsvErrors([]);
    setImportStatus(null);
    setIsProcessingCsv(true);

    const validationErrors: Array<{ row: number; error: string }> = [];
    const validRowsToImport: any[] = [];

    // Parse each row (skipping header)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const rowNum = i + 1;

      // Extract Company and Email
      const compName = cols[0]?.trim();
      const email = (cols.length >= 10 ? cols[9] : cols[1])?.trim();

      // REQUIRED FIELD 1: Company Name
      if (!compName) {
        validationErrors.push({
          row: rowNum,
          error: `Row ${rowNum}: Missing required field "Company Name".`,
        });
        continue;
      }

      // REQUIRED FIELD 2: Email
      if (!email) {
        validationErrors.push({
          row: rowNum,
          error: `Row ${rowNum} (${compName}): Missing required field "Work Email".`,
        });
        continue;
      }

      if (!isValidEmail(email)) {
        validationErrors.push({
          row: rowNum,
          error: `Row ${rowNum} (${compName}): Invalid email format "${email}".`,
        });
        continue;
      }

      validRowsToImport.push({
        companyName: compName,
        domain: cols[1] || email.split('@')[1] || `${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        industry: cols[2] || 'Software / SaaS / Tech',
        employeeCount: Number(cols[3]) || 200,
        location: cols[4] || 'United States',
        atsUsage: cols[5] || 'Greenhouse',
        contactFirstName: cols[6] || 'Key',
        contactLastName: cols[7] || 'Decision Maker',
        contactTitle: cols[8] || 'Head of Talent Acquisition',
        contactEmail: email,
        source: 'CSV Import',
      });
    }

    if (validationErrors.length > 0 && validRowsToImport.length === 0) {
      setCsvErrors(validationErrors);
      setIsProcessingCsv(false);
      return;
    }

    if (validationErrors.length > 0) {
      setCsvErrors(validationErrors);
    }

    let count = 0;
    for (const leadData of validRowsToImport) {
      await onSubmitLead(leadData);
      count++;
    }

    setIsProcessingCsv(false);
    setImportStatus(
      `Successfully ingested, scored, and routed ${count} valid lead${count !== 1 ? 's' : ''}!${
        validationErrors.length > 0
          ? ` (${validationErrors.length} invalid rows skipped due to missing required fields).`
          : ''
      }`
    );

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const sampleCsvData = `Company,Domain,Industry,Employees,Location,ATS,ContactFirstName,ContactLastName,ContactTitle,ContactEmail
ScaleOps Cloud,scaleops.example.io,Software / SaaS / Tech,450,Austin TX,Greenhouse,Rachel,Adams,Head of Talent Acquisition,rachel@scaleops.example.io
FinEdge Payments,finedge.example.com,Financial Services & FinTech,320,New York NY,Lever,Daniel,Kim,Director of Recruiting,daniel@finedge.example.com
Apex Logistics,apexlog.example.net,Logistics & Supply Chain,890,Chicago IL,iCIMS,Marcus,Brody,Talent Acquisition Manager,m.brody@apexlog.example.net`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCsvText(text);
          setCsvErrors([]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCsvText(text);
          setCsvErrors([]);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Single Lead Entry
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'csv' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                CSV / Bulk Import
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {duplicateWarning && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {activeTab === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="space-y-4 text-xs">
            {/* Company Info */}
            <div className="space-y-3">
              <span className="font-bold text-white uppercase font-mono tracking-wider text-[11px] block">
                1. Company & Recruitment Intelligence
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Labs"
                    value={companyName || ''}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Domain *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. acmetech.example.com"
                    value={domain || ''}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Industry</label>
                  <select
                    value={industry || 'Software / SaaS / Tech'}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Software / SaaS / Tech">Software / SaaS / Tech</option>
                    <option value="Financial Services & FinTech">Financial Services & FinTech</option>
                    <option value="Healthcare & HealthTech">Healthcare & HealthTech</option>
                    <option value="Staffing & Recruiting Agencies">Staffing & Recruiting Agencies</option>
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="E-commerce & Retail">E-commerce & Retail</option>
                    <option value="Manufacturing / Industrial">Manufacturing / Industrial</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Employee Count</label>
                  <input
                    type="number"
                    value={employeeCount ?? 0}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Primary ATS</label>
                  <select
                    value={atsUsage || 'Greenhouse'}
                    onChange={(e) => setAtsUsage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Greenhouse">Greenhouse</option>
                    <option value="Lever">Lever</option>
                    <option value="Workday">Workday Recruiting</option>
                    <option value="Ashby">Ashby</option>
                    <option value="Bullhorn">Bullhorn</option>
                    <option value="iCIMS">iCIMS</option>
                    <option value="None">None / Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Open Positions Count</label>
                  <input
                    type="number"
                    value={openPositionsCount ?? 0}
                    onChange={(e) => setOpenPositionsCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <span className="font-bold text-white uppercase font-mono tracking-wider text-[11px] block">
                2. Prospect & Decision Maker
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={contactFirstName || ''}
                    onChange={(e) => setContactFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={contactLastName || ''}
                    onChange={(e) => setContactLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={contactTitle || ''}
                    onChange={(e) => setContactTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail || ''}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
              >
                Create, Score & Auto-Route Lead
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Required Validation Notice */}
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-slate-200">
                  Required Fields: <strong className="text-white font-mono">Company Name</strong> and valid <strong className="text-white font-mono">Work Email</strong>.
                </span>
              </div>
              {onOpenFullCsvModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullCsvModal();
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition shrink-0 ml-2"
                >
                  Full CSV Studio →
                </button>
              )}
            </div>

            {/* Drag & Drop File Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingCsv(true);
              }}
              onDragLeave={() => setIsDraggingCsv(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                isDraggingCsv
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center space-x-2 text-slate-300">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span className="font-medium text-[11px]">
                  Drop a CSV file here, or <span className="text-indigo-400 underline">browse</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
                  Sample CSV Template (Copy & Paste)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCsvText(sampleCsvData);
                    setCsvErrors([]);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Load Sample CSV
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                Paste rows with header: <code className="text-slate-200 font-mono">Company,Domain,Industry,Employees,Location,ATS,ContactFirstName,ContactLastName,ContactTitle,ContactEmail</code>
              </p>
            </div>

            <textarea
              rows={6}
              value={csvText || ''}
              onChange={(e) => {
                setCsvText(e.target.value);
                setCsvErrors([]);
              }}
              placeholder="Paste raw CSV lines here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />

            {/* Validation Errors Box */}
            {csvErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Validation Errors ({csvErrors.length} issues detected):</span>
                </div>
                <ul className="space-y-1 text-[11px] pl-5 list-disc text-rose-300 max-h-28 overflow-y-auto font-mono">
                  {csvErrors.map((err, idx) => (
                    <li key={idx}>{err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importStatus && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessCsv}
                disabled={!csvText.trim() || isProcessingCsv}
                className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>{isProcessingCsv ? 'Validating & Ingesting...' : 'Validate & Ingest CSV Leads'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
