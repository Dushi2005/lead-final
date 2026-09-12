import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  History,
  Layers,
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Activity as ActivityType,
  BookedMeeting,
  CalendarSlot,
  Lead,
  LeadOutcome,
  User as UserType,
} from '../types/index.ts';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onApplyRemark: (leadId: string, remarkKey: any, customNote?: string) => void;
  onUpdateLead: (lead: Lead) => void;
  allUsers: UserType[];
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  onClose,
  onApplyRemark,
  onUpdateLead,
  allUsers,
}) => {
  const [activeTab, setActiveTab] = useState<
    'scoring' | 'research' | 'outreach' | 'calendar' | 'timeline' | 'outcome'
  >('scoring');

  // AI Research State
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<any>(lead?.research_report || null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(lead?.ai_analysis || null);

  // AI Outreach State
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'linkedin' | 'call_script' | 'followup'>('email');
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Calendar Booking State
  const [meetingDuration, setMeetingDuration] = useState<number>(30);
  const [availableSlots, setAvailableSlots] = useState<CalendarSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState<BookedMeeting | null>(null);

  // Activities
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [newRemarkText, setNewRemarkText] = useState('');

  // Outcome
  const [selectedOutcome, setSelectedOutcome] = useState<LeadOutcome>(lead?.outcome || 'WON');
  const [outcomeNotes, setOutcomeNotes] = useState(lead?.outcome_notes || '');

  const loadSlots = (duration: number) => {
    if (!lead) return;
    setIsLoadingSlots(true);
    fetch(`/api/calendar/availability?sdr_id=${lead.owner_sdr_id}&ae_id=${lead.owner_ae_id}&duration=${duration}`)
      .then((res) => res.json())
      .then((data) => {
        setAvailableSlots(data.slots || []);
        setIsLoadingSlots(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoadingSlots(false);
      });
  };

  // Load activities, outcomes, and slots when lead changes
  useEffect(() => {
    if (!lead) return;
    setSelectedOutcome(lead.outcome || 'WON');
    setOutcomeNotes(lead.outcome_notes || '');
    setNewRemarkText('');

    fetch(`/api/activities?lead_id=${lead.id}`)
      .then((res) => res.json())
      .then((data) => setActivities(data || []))
      .catch((err) => console.error(err));

    loadSlots(meetingDuration);
  }, [lead?.id]);

  if (!lead) return null;

  const handleRunAiResearch = async () => {
    setIsResearching(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/research`, { method: 'POST' });
      const data = await res.json();
      if (data.research) {
        setResearchData(data.lead.research_report);
        setAiAnalysis(data.lead.ai_analysis);
        onUpdateLead(data.lead);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerateOutreach = async (channel: typeof outreachChannel) => {
    setIsGeneratingOutreach(true);
    setOutreachChannel(channel);
    try {
      const res = await fetch(`/api/leads/${lead.id}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      setGeneratedOutreach(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleBookSlot = async (slot: CalendarSlot) => {
    try {
      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          slotId: slot.id,
          startIso: slot.start_iso,
          endIso: slot.end_iso,
          title: `Resourcely AI Recruitment Demo - ${lead.company?.name}`,
        }),
      });
      const data = await res.json();
      setBookedSuccess(data);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });

      // refresh activities
      const actRes = await fetch(`/api/activities?lead_id=${lead.id}`);
      setActivities(await actRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogOutcome = async () => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: selectedOutcome, notes: outcomeNotes }),
      });
      const updated = await res.json();
      onUpdateLead(updated);
      alert(`Deal outcome successfully logged as ${selectedOutcome}!`);
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bd = lead.score_breakdown;
  const isHot = lead.category === 'HOT';
  const isHigh = lead.category === 'HIGH_PRIORITY';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white font-display tracking-tight">
                  {lead.company?.name}
                </h2>
                <div
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    isHot
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {lead.score} PTS • {lead.category.replace('_', ' ')}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  ATS: {lead.company?.ats_usage}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-400">
                <span className="text-slate-200 font-semibold flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {lead.contact?.first_name} {lead.contact?.last_name} ({lead.contact?.title})
                  </span>
                </span>
                <span>{lead.company?.location}</span>
                <span>{lead.company?.employee_count} employees</span>
                <span className="text-emerald-400 font-medium">
                  {lead.company?.open_positions_count} open positions
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SLA & Recommended Action Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-indigo-300">Next Action:</span>
              <span className="text-slate-200 font-medium">{lead.next_action}</span>
            </div>
            <div className="text-slate-400 text-[11px] font-mono flex items-center space-x-2">
              <span className="flex items-center space-x-1">
                <span>SDR:</span>
                <select
                  value={lead.owner_sdr_id}
                  onChange={async (e) => {
                    const newSdrId = e.target.value;
                    const sdr = allUsers.find((u) => u.id === newSdrId);
                    if (!sdr) return;
                    try {
                      const res = await fetch(`/api/leads/${lead.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ owner_sdr_id: newSdrId }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        onUpdateLead(updated);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[11px] font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {allUsers
                    .filter((u) => u.role === 'SDR')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </span>
              <span>•</span>
              <span>AE: <strong className="text-slate-200">{lead.owner_ae_name}</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 bg-slate-950/60 border-b border-slate-800 overflow-x-auto shrink-0">
          {[
            { id: 'scoring', label: '1. Transparent Score', icon: Award },
            { id: 'research', label: '2. AI Research Dossier', icon: BookOpen },
            { id: 'outreach', label: '3. AI Outreach Generator', icon: Send },
            { id: 'calendar', label: '4. Calendar & 1-Click Booking', icon: Calendar },
            { id: 'timeline', label: '5. Activity History', icon: History },
            { id: 'outcome', label: '6. Deal Outcome', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SCORING */}
          {activeTab === 'scoring' && (
            <div className="space-y-6">
              {/* Overall Score Dial */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                      Normalized ICP Fit Score
                    </div>
                    <div className="flex items-baseline space-x-3 mt-1">
                      <span className="text-4xl font-extrabold text-white font-mono">{lead.score}</span>
                      <span className="text-sm text-slate-400">/ 100 maximum</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          isHot
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {lead.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      SLA Target: <strong className="text-slate-200">{lead.score >= 90 ? '< 15 Minutes' : '< 2 Hours'}</strong> response time.
                    </p>
                  </div>

                  {/* 5 Dimension Progress Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { name: 'Company Fit', val: bd?.company_fit_score || 0, max: 25, color: 'bg-indigo-500' },
                      { name: 'Hiring Velocity', val: bd?.hiring_velocity_score || 0, max: 25, color: 'bg-amber-500' },
                      { name: 'Tech Stack', val: bd?.tech_stack_score || 0, max: 20, color: 'bg-blue-500' },
                      { name: 'Persona Fit', val: bd?.persona_fit_score || 0, max: 15, color: 'bg-emerald-500' },
                      { name: 'Intent / Signals', val: bd?.intent_score || 0, max: 15, color: 'bg-purple-500' },
                    ].map((dim) => (
                      <div key={dim.name} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] text-slate-400 font-mono truncate">{dim.name}</div>
                        <div className="text-base font-bold text-white font-mono mt-1">
                          {dim.val} <span className="text-[10px] text-slate-500">/{dim.max}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div
                            className={`${dim.color} h-full rounded-full`}
                            style={{ width: `${Math.min(100, (dim.val / dim.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Factor by Factor Transparent Audit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Positive Contributing Factors */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Positive Score Drivers</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 pt-1">
                    {(bd?.reasons || []).map((reason, idx) => (
                      <div key={idx} className="py-2 flex items-start justify-between text-xs">
                        <span className="text-slate-300 pr-2">{reason.factor}</span>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          +{reason.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negative / Deductions */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider font-mono">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Risk Factors & Deductions</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 pt-1">
                    {(bd?.deductions || []).length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        Zero negative deductions applied. Strong ICP alignment.
                      </div>
                    ) : (
                      (bd?.deductions || []).map((ded, idx) => (
                        <div key={idx} className="py-2 flex items-start justify-between text-xs">
                          <span className="text-slate-300 pr-2">{ded.factor}</span>
                          <span className="font-mono font-bold text-rose-400 shrink-0">
                            {ded.points}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Score Change Audit Trail */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Score History Audit Trail</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Full tamper-evident record</span>
                </div>

                <div className="space-y-2 pt-1">
                  {(lead.score_history || []).map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-200">
                            {hist.previous_score} → {hist.new_score}
                          </span>
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              hist.change >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {hist.change >= 0 ? `+${hist.change}` : hist.change} PTS
                          </span>
                        </div>
                        <ul className="text-[11px] text-slate-400 list-disc list-inside">
                          {hist.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(hist.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI RESEARCH DOSSIER */}
          {activeTab === 'research' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Deep Prospect & Company Research
                  </h3>
                  <p className="text-xs text-slate-400">
                    AI synthesizes company filings, active job postings, ATS technology, and executive moves.
                  </p>
                </div>
                <button
                  onClick={handleRunAiResearch}
                  disabled={isResearching}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin' : ''}`} />
                  <span>{isResearching ? 'Synthesizing...' : 'Run Deep AI Research'}</span>
                </button>
              </div>

              {/* Executive Summary & Hypothesis */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Executive Overview
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {aiAnalysis?.lead_summary || lead.ai_analysis?.lead_summary}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-900/50 space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Buying Hypothesis (AI Inferred)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiAnalysis?.buying_hypothesis || lead.ai_analysis?.buying_hypothesis}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                      Recommended Resourcely Pitch
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiAnalysis?.recommended_pitch || lead.ai_analysis?.recommended_pitch}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                      Risk / Objection Warning
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiAnalysis?.risk || lead.ai_analysis?.risk}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verified Web Findings Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Research Findings & Verified Sources
                  </span>
                  <span className="text-[10px] text-slate-400">Strict zero-hallucination tracking</span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {((researchData?.findings || lead.research_report?.findings) || []).map(
                    (finding: any, idx: number) => (
                      <div key={idx} className="py-3 flex items-start justify-between gap-4 text-xs">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase ${
                                finding.confidence === 'Verified'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {finding.confidence}
                            </span>
                            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                              {finding.category}
                            </span>
                          </div>
                          <p className="text-slate-200">{finding.information}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <a
                            href={finding.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 justify-end font-medium"
                          >
                            <span>{finding.source}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {finding.date_discovered}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI OUTREACH GENERATOR */}
          {activeTab === 'outreach' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Personalized Outreach Generator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Generates copy grounded in verified facts, ATS integration details, and hiring signals.
                  </p>
                </div>

                {/* Channel Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {[
                    { id: 'email', label: 'Email', icon: Mail },
                    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                    { id: 'call_script', label: 'Call Script', icon: Phone },
                    { id: 'followup', label: 'Follow-up', icon: Send },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleGenerateOutreach(ch.id as any)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          outreachChannel === ch.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isGeneratingOutreach ? (
                <div className="py-16 text-center text-xs text-indigo-400 flex flex-col items-center justify-center space-y-2">
                  <Sparkles className="w-6 h-6 animate-spin" />
                  <span>Synthesizing personalized {outreachChannel} copy...</span>
                </div>
              ) : generatedOutreach ? (
                <div className="space-y-4">
                  {/* Generated Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                          Subject Line
                        </span>
                        <div className="text-xs font-bold text-slate-100">
                          {generatedOutreach.subject || 'Inquiry regarding hiring efficiency'}
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(generatedOutreach.body)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Copy'}</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans pt-1">
                      {generatedOutreach.body}
                    </div>
                  </div>

                  {/* Facts used breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                      <div className="text-emerald-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
                        Verified Facts Grounded In Copy
                      </div>
                      <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
                        {generatedOutreach.verifiedFactsUsed?.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                      <div className="text-indigo-400 font-semibold font-mono text-[10px] uppercase tracking-wider">
                        AI Hypothesis Applied
                      </div>
                      <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
                        {generatedOutreach.aiHypothesisUsed?.map((h: string, i: number) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-3">
                  <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click any channel above to instantly generate customized sales outreach for {lead.contact?.first_name}.
                  </p>
                  <button
                    onClick={() => handleGenerateOutreach('email')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
                  >
                    Generate Email Outreach
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CALENDAR AVAILABILITY & BOOKING */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    SDR & AE Overlapping Calendar Availability
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculates free/busy windows, 15m buffer, and business hours for {lead.owner_sdr_name} (SDR) & {lead.owner_ae_name} (AE).
                  </p>
                </div>

                {/* Duration Picker */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Duration:</span>
                  {[30, 45, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setMeetingDuration(d);
                        loadSlots(d);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition ${
                        meetingDuration === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {bookedSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Meeting Confirmed & Google Meet Generated!</span>
                    </div>
                    <div className="text-emerald-200">
                      Scheduled for {new Date(bookedSuccess.start_iso).toLocaleString()} with {lead.owner_ae_name} (AE).
                    </div>
                  </div>
                  <a
                    href={bookedSuccess.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1"
                  >
                    <span>Open Meet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Slot Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isLoadingSlots ? (
                  <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                    Scanning calendar schedules...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                    No overlapping slots found in the next 3 business days.
                  </div>
                ) : (
                  availableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2.5 ${
                        slot.recommended
                          ? 'bg-indigo-950/20 border-indigo-900/60 hover:border-indigo-700'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{slot.day_label}</div>
                          <div className="text-xs text-indigo-300 font-mono mt-0.5">
                            {slot.time_label}
                          </div>
                        </div>
                        {slot.recommended && (
                          <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                            Recommended
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Both Available</span>
                        </span>
                        <button
                          onClick={() => handleBookSlot(slot)}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95"
                        >
                          Book Slot
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: TIMELINE & ACTIVITIES */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {/* Quick Add Remark */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Log SDR Activity / Remark
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRemarkText || ''}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    placeholder="Enter call notes, reply update, or blocker..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (!newRemarkText.trim()) return;
                      onApplyRemark(lead.id, 'FOLLOWUP_REQUIRED', newRemarkText);
                      setNewRemarkText('');
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
                  >
                    Log Note
                  </button>
                </div>
              </div>

              {/* Reverse Chronological Feed */}
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-semibold text-slate-200">{act.user_name}</span>
                      <span className="font-mono text-[10px]">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 leading-snug">{act.description}</p>
                    {act.ai_context && (
                      <div className="text-[11px] text-indigo-300/90 font-mono pt-1">
                        ↳ {act.ai_context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DEAL OUTCOME */}
          {activeTab === 'outcome' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Log Closed Deal Outcome for RevOps ML Feedback
                </h3>
                <p className="text-xs text-slate-400">
                  Closed deal outcomes are correlated against initial ICP scores and signals to optimize scoring weights.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">Outcome Category</label>
                  <select
                    value={selectedOutcome || 'WON'}
                    onChange={(e: any) => setSelectedOutcome(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="WON">Closed Won (Customer Signed)</option>
                    <option value="LOST_COMPETITOR">Lost to Competitor</option>
                    <option value="LOST_TIMING">Lost due to Timing / Budget</option>
                    <option value="LOST_NO_RESPONSE">Lost - Ghosted / No Response</option>
                    <option value="DISQUALIFIED_NOT_ICP">Disqualified (Not true ICP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">Outcome Notes</label>
                  <textarea
                    rows={3}
                    value={outcomeNotes || ''}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Details on contract size, why they bought, competitor chosen, or reason for disqualification..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleLogOutcome}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  Save Deal Outcome & Retrain Weights
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
