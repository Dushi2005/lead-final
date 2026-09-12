import React, { useState } from 'react';
import {
  ExternalLink,
  Filter,
  Flame,
  Plus,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Signal } from '../types/index.ts';

interface SignalsViewProps {
  signals: Signal[];
  onIngestSignal: (signalData: any) => void;
}

export const SignalsView: React.FC<SignalsViewProps> = ({ signals, onIngestSignal }) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('Acme Cloud Technologies');
  const [signalType, setSignalType] = useState<Signal['signal_type']>('FUNDING_ANNOUNCEMENT');
  const [title, setTitle] = useState('Acme Cloud announces $15M Growth Investment');
  const [description, setDescription] = useState('Follow-on financing announced to expand EMEA and APAC sales and engineering.');
  const [sourceName, setSourceName] = useState('VentureWire Tech');
  const [sourceUrl, setSourceUrl] = useState('https://venturewire.example.com/acme-growth');
  const [scoreImpact, setScoreImpact] = useState(8);

  const filteredSignals = signals.filter((s) => {
    if (selectedType !== 'ALL' && s.signal_type !== selectedType) return false;
    return true;
  });

  const handleSubmitSignal = (e: React.FormEvent) => {
    e.preventDefault();
    onIngestSignal({
      companyName,
      signalType,
      title,
      description,
      sourceName,
      sourceUrl,
      scoreImpact: Number(scoreImpact),
      confidence: 'Verified',
    });
    setShowSimulateModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h1 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
              Autonomous Market Signals Radar
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuously monitors venture funding, recruiter hiring requisitions, ATS implementations, and TA leadership changes to dynamically boost lead priority.
          </p>
        </div>

        <button
          onClick={() => setShowSimulateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Simulate New Signal</span>
        </button>
      </div>

      {/* Signal Type Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Signals' },
          { id: 'FUNDING_ANNOUNCEMENT', label: '💰 Funding Rounds (+8)' },
          { id: 'RECRUITER_HIRING', label: '👥 Recruiter Hiring Spikes (+5)' },
          { id: 'TA_LEADERSHIP_CHANGE', label: '👔 TA Leadership Moves (+6)' },
          { id: 'ATS_IMPLEMENTATION', label: '⚙️ ATS Deployments (+5)' },
          { id: 'EXPANSION', label: '🌍 Regional Expansions (+6)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              selectedType === tab.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Signals Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSignals.map((sig) => (
          <div
            key={sig.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-3 shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{sig.company_name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  +{sig.score_impact} Lead Score Points
                </span>
              </div>

              <div className="text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{sig.title}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{sig.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-emerald-400 font-medium">{sig.confidence}</span>
                <span>•</span>
                <a
                  href={sig.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-400 flex items-center space-x-1 font-medium transition"
                >
                  <span>{sig.source_name}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <span className="font-mono text-slate-500">
                {new Date(sig.detected_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Simulate Signal Ingestion Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Simulate Market Signal Ingestion
                </h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSignal} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName || ''}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Signal Type</label>
                <select
                  value={signalType || 'FUNDING_ANNOUNCEMENT'}
                  onChange={(e: any) => {
                    setSignalType(e.target.value);
                    if (e.target.value === 'FUNDING_ANNOUNCEMENT') setScoreImpact(8);
                    else if (e.target.value === 'RECRUITER_HIRING') setScoreImpact(5);
                    else if (e.target.value === 'TA_LEADERSHIP_CHANGE') setScoreImpact(6);
                    else setScoreImpact(5);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="FUNDING_ANNOUNCEMENT">Funding Announcement (+8)</option>
                  <option value="RECRUITER_HIRING">Recruiter Hiring Spike (+5)</option>
                  <option value="TA_LEADERSHIP_CHANGE">TA Leadership Change (+6)</option>
                  <option value="ATS_IMPLEMENTATION">ATS Implementation / Switch (+5)</option>
                  <option value="EXPANSION">Regional / Headcount Expansion (+6)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Signal Headline / Title</label>
                <input
                  type="text"
                  required
                  value={title || ''}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description / Details</label>
                <textarea
                  rows={2}
                  value={description || ''}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Source Name</label>
                  <input
                    type="text"
                    value={sourceName || ''}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Score Impact</label>
                  <input
                    type="number"
                    value={scoreImpact ?? 0}
                    onChange={(e) => setScoreImpact(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                >
                  Ingest & Adjust Lead Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
