import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Info,
  Key,
  Layers,
  Loader2,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import { EnvTestResult, EnvVariableItem } from '../types/index.ts';

interface EnvVariablesViewProps {
  onShowToast?: (msg: string) => void;
}

export const EnvVariablesView: React.FC<EnvVariablesViewProps> = ({ onShowToast }) => {
  const [variables, setVariables] = useState<EnvVariableItem[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    configured: 0,
    missingRequired: 0,
    activeAIProvider: 'gemini',
    isGeminiActive: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'MISSING'>('ALL');

  // Direct Ask / Inject State
  const [askKey, setAskKey] = useState('GEMINI_API_KEY');
  const [askValue, setAskValue] = useState('');
  const [askCategory, setAskCategory] = useState<string>('AI & Intelligence');
  const [askDescription, setAskDescription] = useState('');
  const [showAskValue, setShowAskValue] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ [key: string]: EnvTestResult | null }>({});

  // Inline table edits state: { [key: string]: string }
  const [inlineEdits, setInlineEdits] = useState<{ [key: string]: string }>({});
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: boolean }>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Fetch variables from backend
  const fetchEnvVariables = async (reveal = revealSecrets) => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/env?reveal=${reveal ? 'true' : 'false'}`);
      const data = await res.json();
      if (data && data.variables) {
        setVariables(data.variables);
        setSummary(data.summary || {});

        // Initialize inline edits with current values
        const initialEdits: { [key: string]: string } = {};
        data.variables.forEach((v: EnvVariableItem) => {
          initialEdits[v.key] = reveal ? v.value : (v.isSecret && v.isSet ? '' : v.value);
        });
        setInlineEdits(initialEdits);
      }
    } catch (err) {
      console.error('Failed to fetch environment variables:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnvVariables(revealSecrets);
  }, [revealSecrets]);

  const handleApplySingleVar = async (keyToSave: string, valToSave: string) => {
    try {
      setSavingKey(keyToSave);
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToSave, value: valToSave }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onShowToast) onShowToast(data.message || `Saved ${keyToSave}`);
        await fetchEnvVariables();
      } else {
        alert(data.error || 'Failed to update environment variable.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating environment variable.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDirectAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askKey.trim()) return;

    setIsApplying(true);
    try {
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: askKey, value: askValue }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onShowToast) onShowToast(`Environment variable "${askKey}" applied directly to runtime!`);
        setAskValue('');
        await fetchEnvVariables();
      } else {
        alert(data.error || 'Failed to inject environment variable.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleTestKey = async (key: string, customValue?: string) => {
    try {
      setIsTesting(true);
      setTestFeedback((prev) => ({ ...prev, [key]: null }));
      const val = customValue !== undefined ? customValue : (inlineEdits[key] || '');

      const res = await fetch('/api/env/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: val }),
      });
      const data = await res.json();
      setTestFeedback((prev) => ({ ...prev, [key]: data }));
      if (data.success && onShowToast) {
        onShowToast(`Verification passed for ${key}: ${data.message}`);
      }
    } catch (err: any) {
      setTestFeedback((prev) => ({
        ...prev,
        [key]: { success: false, message: 'Test failed', error: err.message },
      }));
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Are you sure you want to clear/unset environment variable "${key}"?`)) return;

    try {
      const res = await fetch(`/api/env/${key}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onShowToast) onShowToast(`Cleared "${key}" from runtime.`);
        await fetchEnvVariables();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast(`Copied ${label} to clipboard!`);
  };

  // Presets for quick asking
  const quickAskPresets = [
    { key: 'GEMINI_API_KEY', category: 'AI & Intelligence', label: 'GEMINI_API_KEY (AI Studio)' },
    { key: 'AI_PROVIDER', category: 'AI & Intelligence', label: 'AI_PROVIDER (gemini / fallback)' },
    { key: 'AI_MODEL', category: 'AI & Intelligence', label: 'AI_MODEL (gemini-3.8-flash)' },
    { key: 'DATABASE_URL', category: 'Database & Storage', label: 'DATABASE_URL (PostgreSQL URI)' },
    { key: 'GOOGLE_CLIENT_ID', category: 'OAuth & Integrations', label: 'GOOGLE_CLIENT_ID (Calendar)' },
    { key: 'GROQ_API_KEY', category: 'AI & Intelligence', label: 'GROQ_API_KEY (Fast Inference)' },
  ];

  // Filtering
  const filteredVars = variables.filter((v) => {
    const matchesSearch =
      v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || v.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONFIGURED' && v.isSet) ||
      (statusFilter === 'MISSING' && !v.isSet);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['ALL', 'AI & Intelligence', 'Database & Storage', 'OAuth & Integrations', 'App & Runtime', 'Custom'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              Environment Variables & Secrets Manager
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Runtime
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Directly configure, inspect, and test required environment variables within this application. Values take effect immediately in the running backend without container redeployment.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchEnvVariables(revealSecrets)}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setRevealSecrets(!revealSecrets)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
              revealSecrets
                ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {revealSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealSecrets ? 'Mask Secrets' : 'Reveal Secrets'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tracked Variables</span>
            <Server className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{summary.total}</p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">System & custom variables</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Configured & Active</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <p className="text-2xl font-bold font-mono text-emerald-400">{summary.configured}</p>
            <span className="text-xs text-slate-400">/ {summary.total}</span>
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-1 font-mono">Available in process.env</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Primary AI Engine</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-base font-bold text-slate-100 mt-1 flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${summary.isGeminiActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{summary.isGeminiActive ? 'Gemini 3.8 Flash' : 'Fallback Engine'}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {summary.isGeminiActive ? 'Live Google GenAI Active' : 'Offline Intelligent Mock'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Missing Required</span>
            <AlertCircle className={`w-4 h-4 ${summary.missingRequired > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <p className={`text-2xl font-bold font-mono mt-1 ${summary.missingRequired > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {summary.missingRequired}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {summary.missingRequired === 0 ? 'All essential keys ready' : 'Needs configuration'}
          </p>
        </div>
      </div>

      {/* Direct Ask & Inject Form Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-900/40 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Ask & Configure Environment Variable Directly
            </h2>
          </div>
          <span className="text-xs text-indigo-300 font-medium bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            Injects into server process.env
          </span>
        </div>

        {/* Quick selection chips */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium block">Quick Pick Variable:</label>
          <div className="flex flex-wrap gap-2">
            {quickAskPresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setAskKey(preset.key);
                  setAskCategory(preset.category);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                  askKey === preset.key
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {preset.key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAskKey('');
                setAskCategory('Custom');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                !quickAskPresets.some((p) => p.key === askKey)
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-700/60'
              }`}
            >
              + Custom Key...
            </button>
          </div>
        </div>

        {/* Direct Ask Form */}
        <form onSubmit={handleDirectAskSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Variable Name (KEY) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GEMINI_API_KEY"
                value={askKey}
                onChange={(e) => setAskKey(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-300 font-medium">
                  Variable Value <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAskValue(!showAskValue)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  {showAskValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAskValue ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showAskValue ? 'text' : 'password'}
                  required
                  placeholder={`Enter value for ${askKey || 'variable'}...`}
                  value={askValue}
                  onChange={(e) => setAskValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-24 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-1.5 top-1.5 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleTestKey(askKey, askValue)}
                    disabled={isTesting || !askValue}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 disabled:opacity-40 transition flex items-center space-x-1"
                  >
                    {isTesting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                    <span>Test</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Feedback Display */}
          {testFeedback[askKey] && (
            <div
              className={`p-3 rounded-lg text-xs font-mono border flex items-start space-x-2 ${
                testFeedback[askKey]?.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {testFeedback[askKey]?.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {testFeedback[askKey]?.success ? 'Connection Test Verified' : 'Validation Error'}
                  {testFeedback[askKey]?.latencyMs && ` (${testFeedback[askKey]?.latencyMs}ms)`}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {testFeedback[askKey]?.message || testFeedback[askKey]?.error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Changes update <code className="text-indigo-300">process.env</code> instantly in the active session.
            </span>
            <button
              type="submit"
              disabled={isApplying || !askKey || !askValue}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-40 transition flex items-center space-x-1.5"
            >
              {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save & Apply Directly</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search environment variables..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIGURED">Configured Only</option>
                <option value="MISSING">Missing Only</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 mr-1 text-[11px] font-medium">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* The Environment Variables Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Variable Name</th>
                <th className="py-3 px-4">Category & Purpose</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 min-w-[260px]">Current Value / Direct Input</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVars.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-medium text-slate-400">No environment variables match your search</p>
                    <p className="text-[11px] mt-1">Try resetting filters or use the form above to add a new variable.</p>
                  </td>
                </tr>
              ) : (
                filteredVars.map((v) => {
                  const isKeyRevealed = revealSecrets || Boolean(revealedKeys[v.key]);
                  const currentInputVal = inlineEdits[v.key] ?? '';
                  const hasPendingChanges = currentInputVal !== '' && currentInputVal !== v.value;
                  const isThisSaving = savingKey === v.key;

                  return (
                    <tr key={v.key} className="hover:bg-slate-850/40 transition">
                      {/* Variable Name Column */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {v.key}
                          </span>
                          <button
                            onClick={() => copyToClipboard(v.key, 'variable name')}
                            className="text-slate-500 hover:text-slate-300 p-1 rounded"
                            title="Copy variable name"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1.5">
                          {v.required && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Required
                            </span>
                          )}
                          {v.isSecret && (
                            <span className="flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Secret</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Purpose Column */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <span className="inline-block text-[10px] font-medium font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/60 mb-1">
                          {v.category}
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{v.description}</p>
                        {v.defaultValue && (
                          <p className="text-[10px] text-slate-500 font-mono mt-1">
                            Default: <span className="text-slate-400">{v.defaultValue}</span>
                          </p>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {v.isSet ? (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Configured</span>
                          </span>
                        ) : v.required ? (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>Missing Required</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <span>Not Set (Optional)</span>
                          </span>
                        )}
                        {v.isSet && (
                          <p className="text-[10px] font-mono text-slate-500 mt-1">
                            {v.rawLength} chars
                          </p>
                        )}
                      </td>

                      {/* Current Value / Direct Input Column */}
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1.5">
                          <div className="relative flex items-center">
                            <input
                              type={!v.isSecret || isKeyRevealed ? 'text' : 'password'}
                              value={currentInputVal}
                              onChange={(e) =>
                                setInlineEdits({
                                  ...inlineEdits,
                                  [v.key]: e.target.value,
                                })
                              }
                              placeholder={
                                v.isSet && v.isSecret && !isKeyRevealed
                                  ? '••••••••••••••••'
                                  : `Enter ${v.key}...`
                              }
                              className={`w-full bg-slate-950 border rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none ${
                                hasPendingChanges
                                  ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                                  : 'border-slate-800 focus:border-indigo-500'
                              }`}
                            />
                            {v.isSecret && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedKeys((prev) => ({
                                    ...prev,
                                    [v.key]: !prev[v.key],
                                  }))
                                }
                                className="absolute right-2 text-slate-500 hover:text-slate-300"
                                title={isKeyRevealed ? 'Mask value' : 'Show value'}
                              >
                                {isKeyRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Quick test feedback line */}
                          {testFeedback[v.key] && (
                            <div
                              className={`text-[10px] font-mono px-2 py-1 rounded flex items-center space-x-1.5 ${
                                testFeedback[v.key]?.success
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {testFeedback[v.key]?.success ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              )}
                              <span className="truncate">
                                {testFeedback[v.key]?.message || testFeedback[v.key]?.error}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Save / Apply button */}
                          <button
                            type="button"
                            onClick={() => handleApplySingleVar(v.key, currentInputVal)}
                            disabled={isThisSaving}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                              hasPendingChanges
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                            }`}
                            title="Apply to runtime"
                          >
                            {isThisSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Save</span>
                          </button>

                          {/* Test button */}
                          <button
                            type="button"
                            onClick={() => handleTestKey(v.key, currentInputVal || undefined)}
                            disabled={!v.isSet && !currentInputVal}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 disabled:opacity-40 transition flex items-center space-x-1"
                            title="Verify and test variable connection"
                          >
                            <Play className="w-3 h-3" />
                            <span>Test</span>
                          </button>

                          {/* Clear button if set */}
                          {v.isSet && (
                            <button
                              type="button"
                              onClick={() => handleDeleteKey(v.key)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition"
                              title="Clear variable"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidance & Documentation Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono">Google Gemini API</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Get an API key from Google AI Studio. Set <code className="text-indigo-300">GEMINI_API_KEY</code> above to unlock real-time company intelligence, objection mitigation, and pitch generation.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono">Database Persistence</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Provide a <code className="text-cyan-300">DATABASE_URL</code> (e.g. PostgreSQL) for cloud durability. When omitted, Resourcely seamlessly runs its in-memory enterprise ledger.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono">Calendar OAuth</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure Google Workspace or Microsoft Graph Client IDs & Secrets to automatically synchronize rep calendars and discover overlapping free-time windows.
          </p>
        </div>
      </div>
    </div>
  );
};
