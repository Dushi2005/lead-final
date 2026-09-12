import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Kanban,
  Layers,
  ListFilter,
  Loader2,
  Mail,
  RefreshCw,
  Scale,
  Search,
  Shuffle,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Lead, LeadCategory, LeadStatus, User } from '../types/index.ts';

interface SdrAssignmentViewProps {
  leads: Lead[];
  users: User[];
  onUpdateLead: (lead: Lead) => void;
  onBatchAssign: (updatedLeads: Lead[]) => void;
  onSelectLead: (lead: Lead) => void;
  onShowToast: (message: string) => void;
}

export const SdrAssignmentView: React.FC<SdrAssignmentViewProps> = ({
  leads,
  users,
  onUpdateLead,
  onBatchAssign,
  onSelectLead,
  onShowToast,
}) => {
  // SDR Filter and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSdrFilter, setSelectedSdrFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'score_desc' | 'score_asc' | 'company' | 'updated'>('score_desc');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  // Multi-Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkTargetSdrId, setBulkTargetSdrId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [updatingSingleId, setUpdatingSingleId] = useState<string | null>(null);

  // SDR list
  const sdrs = useMemo(() => users.filter((u) => u.role === 'SDR'), [users]);

  // SDR Workload stats
  const sdrWorkloads = useMemo(() => {
    return sdrs.map((sdr) => {
      const assigned = leads.filter((l) => l.owner_sdr_id === sdr.id);
      const hotCount = assigned.filter((l) => l.category === 'HOT').length;
      const highPriorityCount = assigned.filter((l) => l.category === 'HIGH_PRIORITY').length;
      const bookedCount = assigned.filter((l) => l.status === 'MEETING_BOOKED').length;
      const activeCount = assigned.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length;
      // Target capacity is 30 active leads
      const capacityPct = Math.min(Math.round((activeCount / 30) * 100), 100);

      return {
        sdr,
        total: assigned.length,
        hot: hotCount,
        highPriority: highPriorityCount,
        booked: bookedCount,
        active: activeCount,
        capacityPct,
      };
    });
  }, [sdrs, leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // SDR filter
      if (selectedSdrFilter !== 'ALL' && lead.owner_sdr_id !== selectedSdrFilter) {
        return false;
      }
      // Category filter
      if (selectedCategoryFilter !== 'ALL' && lead.category !== selectedCategoryFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'ALL' && lead.status !== selectedStatusFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const companyName = lead.company?.name.toLowerCase() || '';
        const contactName = `${lead.contact?.first_name || ''} ${lead.contact?.last_name || ''}`.toLowerCase();
        const contactTitle = lead.contact?.title.toLowerCase() || '';
        const contactEmail = lead.contact?.email.toLowerCase() || '';
        const domain = lead.company?.domain.toLowerCase() || '';
        if (
          !companyName.includes(q) &&
          !contactName.includes(q) &&
          !contactTitle.includes(q) &&
          !contactEmail.includes(q) &&
          !domain.includes(q)
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'score_desc') return b.score - a.score;
      if (sortField === 'score_asc') return a.score - b.score;
      if (sortField === 'company') return (a.company?.name || '').localeCompare(b.company?.name || '');
      if (sortField === 'updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return 0;
    });
  }, [leads, selectedSdrFilter, selectedCategoryFilter, selectedStatusFilter, searchQuery, sortField]);

  // Selection helpers
  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleSelectOnlyHot = () => {
    const hotIds = filteredLeads.filter((l) => l.category === 'HOT').map((l) => l.id);
    setSelectedLeadIds(hotIds);
  };

  // Single Lead Assignment
  const handleAssignSingleLead = async (leadId: string, newSdrId: string) => {
    const targetSdr = sdrs.find((s) => s.id === newSdrId);
    if (!targetSdr) return;

    try {
      setUpdatingSingleId(leadId);
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_sdr_id: newSdrId }),
      });

      if (!res.ok) throw new Error('Failed to update lead SDR');
      const updated = await res.json();
      onUpdateLead(updated);
      onShowToast(`Reassigned to SDR ${targetSdr.name}`);
    } catch (err: any) {
      alert(`Error assigning lead: ${err.message}`);
    } finally {
      setUpdatingSingleId(null);
    }
  };

  // Batch Assignment (Single SDR or Round Robin or Rebalance)
  const handleExecuteBatchAssign = async (
    mode: 'single' | 'round_robin' | 'balance_workload',
    specificSdrId?: string
  ) => {
    if (selectedLeadIds.length === 0) {
      alert('Please select at least one lead to assign.');
      return;
    }

    const sdrId = specificSdrId || bulkTargetSdrId;
    if (mode === 'single' && !sdrId) {
      alert('Please select a target SDR.');
      return;
    }

    try {
      setIsAssigning(true);
      const res = await fetch('/api/leads/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          sdrId: mode === 'single' ? sdrId : undefined,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to batch assign leads');

      if (data.leads && Array.isArray(data.leads)) {
        onBatchAssign(data.leads);
      }
      const targetSdrObj = sdrs.find((s) => s.id === sdrId);
      const sdrLabel = mode === 'round_robin' ? 'distributed via Round-Robin' : mode === 'balance_workload' ? 'rebalanced across active SDRs' : `assigned to ${targetSdrObj?.name || 'SDR'}`;
      onShowToast(`Successfully ${sdrLabel} ${selectedLeadIds.length} leads!`);
      setSelectedLeadIds([]);
    } catch (err: any) {
      alert(`Batch assignment error: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              RevOps SDR Operations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            SDR Lead Assignment & Workload Routing
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Assign, rebalance, and distribute high-intent leads among active sales development representatives.
            Leverage round-robin rules, capacity monitors, and instant single or bulk reassignment.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Table Queue</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'board'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>SDR Boards</span>
            </button>
          </div>

          <button
            onClick={() => handleExecuteBatchAssign('balance_workload')}
            disabled={isAssigning || leads.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition shadow-sm disabled:opacity-40"
            title="Auto-distribute selected leads to SDRs with lowest capacity"
          >
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rebalance Workloads</span>
          </button>
        </div>
      </div>

      {/* SDR Team Roster & Capacity Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sdrWorkloads.map(({ sdr, total, hot, highPriority, booked, active, capacityPct }) => {
          const isSelectedFilter = selectedSdrFilter === sdr.id;
          return (
            <div
              key={sdr.id}
              onClick={() => setSelectedSdrFilter(isSelectedFilter ? 'ALL' : sdr.id)}
              className={`cursor-pointer rounded-xl p-5 border transition duration-150 shadow-sm relative overflow-hidden group ${
                isSelectedFilter
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-indigo-500/10'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={sdr.avatar}
                      alt={sdr.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-700 shadow"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition flex items-center space-x-1.5">
                      <span>{sdr.name}</span>
                      {isSelectedFilter && (
                        <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-mono">
                          Active Filter
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">{sdr.team}</p>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                      <span>{sdr.timezone.replace('America/', '')}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Calendar Active</span>
                    </p>
                  </div>
                </div>

                <span className="text-xl font-bold font-mono text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {total}
                </span>
              </div>

              {/* Badges Breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
                  <div className="text-[10px] text-rose-400 font-medium flex items-center justify-center space-x-0.5">
                    <Flame className="w-3 h-3 text-rose-500" />
                    <span>HOT</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{hot}</div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
                  <div className="text-[10px] text-amber-400 font-medium flex items-center justify-center space-x-0.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>HIGH</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{highPriority}</div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/60">
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-center space-x-0.5">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>DEMOS</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{booked}</div>
                </div>
              </div>

              {/* Workload Progress */}
              <div className="mt-3.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Active Capacity</span>
                  <span className="font-mono text-slate-300">
                    {active} / 30 ({capacityPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      capacityPct >= 90
                        ? 'bg-rose-500'
                        : capacityPct >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-indigo-400 group-hover:underline">
                  {isSelectedFilter ? 'Showing assigned leads' : 'Click to filter table'}
                </span>
                {selectedLeadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteBatchAssign('single', sdr.id);
                    }}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-[10px] shadow transition"
                  >
                    Assign {selectedLeadIds.length} Selected Here →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies, contacts, titles, domains..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Select Presets */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg font-medium transition"
            >
              {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0
                ? 'Deselect All'
                : `Select All (${filteredLeads.length})`}
            </button>
            <button
              onClick={handleSelectOnlyHot}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 rounded-lg font-medium transition flex items-center space-x-1"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Select HOT Only</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-1 text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* SDR Select */}
          <select
            value={selectedSdrFilter}
            onChange={(e) => setSelectedSdrFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All SDRs</option>
            {sdrs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.team})
              </option>
            ))}
          </select>

          {/* Category Select */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All ICP Tiers</option>
            <option value="HOT">🔥 HOT (90+)</option>
            <option value="HIGH_PRIORITY">⚡ HIGH PRIORITY (75-89)</option>
            <option value="QUALIFIED">✓ QUALIFIED (60-74)</option>
            <option value="NURTURE">🌱 NURTURE</option>
            <option value="LOW_FIT">✕ LOW FIT</option>
          </select>

          {/* Status Select */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Stages</option>
            <option value="NEW">New</option>
            <option value="ENRICHED">Enriched</option>
            <option value="RESEARCHED">Researched</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REPLIED">Replied</option>
            <option value="MEETING_BOOKED">Meeting Booked</option>
          </select>

          {/* Sort Field */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 ml-auto"
          >
            <option value="score_desc">Sort: Highest Score</option>
            <option value="score_asc">Sort: Lowest Score</option>
            <option value="company">Sort: Company (A-Z)</option>
            <option value="updated">Sort: Recently Updated</option>
          </select>

          {(selectedSdrFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSdrFilter('ALL');
                setSelectedCategoryFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="sticky top-20 z-30 bg-indigo-950/90 border border-indigo-500/50 backdrop-blur-md rounded-xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold font-mono flex items-center justify-center">
              {selectedLeadIds.length}
            </span>
            <span className="text-xs font-medium text-white">
              Selected <strong>{selectedLeadIds.length}</strong> lead{selectedLeadIds.length > 1 ? 's' : ''} for SDR assignment:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Target SDR Selector */}
            <select
              value={bulkTargetSdrId}
              onChange={(e) => setBulkTargetSdrId(e.target.value)}
              className="bg-slate-950 border border-indigo-400/40 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-300"
            >
              <option value="">Choose Target SDR...</option>
              {sdrs.map((sdr) => (
                <option key={sdr.id} value={sdr.id}>
                  Assign to {sdr.name} ({sdr.team})
                </option>
              ))}
            </select>

            <button
              onClick={() => handleExecuteBatchAssign('single')}
              disabled={isAssigning || !bulkTargetSdrId}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-40 transition flex items-center space-x-1.5"
            >
              {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              <span>Assign to SDR</span>
            </button>

            <button
              onClick={() => handleExecuteBatchAssign('round_robin')}
              disabled={isAssigning}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 disabled:opacity-40 transition flex items-center space-x-1.5"
              title="Distribute selected leads evenly among all active SDRs"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Round-Robin Distribute</span>
            </button>

            <button
              onClick={() => handleExecuteBatchAssign('balance_workload')}
              disabled={isAssigning}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/60 disabled:opacity-40 transition flex items-center space-x-1.5"
              title="Send leads to SDRs who have the lowest workload"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Balance by Capacity</span>
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Display */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAllFiltered}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-medium">Company & Target</th>
                  <th className="py-3 px-4 font-medium">ICP Score & Fit</th>
                  <th className="py-3 px-4 font-medium">Assigned SDR Representative</th>
                  <th className="py-3 px-4 font-medium">Partner AE</th>
                  <th className="py-3 px-4 font-medium">Stage & Status</th>
                  <th className="py-3 px-4 font-medium text-right">360° Cockpit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">No leads match current filters.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try resetting your search query or SDR selection filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    const currentSdr = sdrs.find((s) => s.id === lead.owner_sdr_id);
                    const isUpdating = updatingSingleId === lead.id;

                    return (
                      <tr
                        key={lead.id}
                        className={`transition hover:bg-slate-800/40 ${
                          isSelected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Company & Contact */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0 font-mono text-xs">
                              {lead.company?.name.charAt(0) || 'C'}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center space-x-1.5">
                                <span>{lead.company?.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {lead.company?.domain}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                                <span className="text-slate-200">
                                  {lead.contact?.first_name} {lead.contact?.last_name}
                                </span>
                                <span>•</span>
                                <span className="truncate max-w-[180px]">{lead.contact?.title}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ICP Score */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                lead.score >= 85
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                  : lead.score >= 70
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {lead.score}/100
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              {lead.category.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Interactive SDR Assignment Dropdown */}
                        <td className="py-3 px-4">
                          <div className="relative inline-block w-48">
                            <select
                              value={lead.owner_sdr_id}
                              disabled={isUpdating}
                              onChange={(e) => handleAssignSingleLead(lead.id, e.target.value)}
                              className={`w-full text-xs rounded-lg px-2.5 py-1.5 font-medium transition cursor-pointer focus:outline-none border ${
                                isUpdating
                                  ? 'opacity-50 bg-slate-900 border-slate-700 text-slate-400'
                                  : 'bg-slate-950 hover:bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500'
                              }`}
                            >
                              {sdrs.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.team.split(' ')[0]})
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-2.5 top-2.5 pointer-events-none" />
                            )}
                          </div>
                        </td>

                        {/* Partner AE */}
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {lead.owner_ae_name || 'Unassigned AE'}
                        </td>

                        {/* Stage / Status */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Action View */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition text-xs font-medium inline-flex items-center space-x-1"
                          >
                            <span>Open Cockpit</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SDR Kanban Columns View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sdrs.map((sdr) => {
            const sdrLeads = filteredLeads.filter((l) => l.owner_sdr_id === sdr.id);
            const otherSdrs = sdrs.filter((s) => s.id !== sdr.id);

            return (
              <div
                key={sdr.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-[700px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={sdr.avatar}
                      alt={sdr.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-sm"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{sdr.name}</h4>
                      <p className="text-[10px] text-slate-400">{sdr.team}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 text-xs font-mono font-bold">
                    {sdrLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {sdrLeads.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                      <UserPlus className="w-6 h-6 mb-2 opacity-40" />
                      <span>No leads currently assigned matching filters</span>
                    </div>
                  ) : (
                    sdrLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition shadow-sm group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-white group-hover:text-indigo-300 transition leading-snug">
                              {lead.company?.name}
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              {lead.contact?.first_name} {lead.contact?.last_name} • {lead.contact?.title}
                            </p>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                              lead.score >= 85
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {lead.score}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800">
                            {lead.status.replace('_', ' ')}
                          </span>

                          <button
                            onClick={() => onSelectLead(lead)}
                            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-0.5"
                          >
                            <span>Cockpit</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Quick Transfer to another SDR */}
                        <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between text-[11px]">
                          <span className="text-[10px] text-slate-500">Transfer to:</span>
                          <div className="flex items-center space-x-1">
                            {otherSdrs.map((other) => (
                              <button
                                key={other.id}
                                type="button"
                                title={`Reassign to ${other.name}`}
                                onClick={() => handleAssignSingleLead(lead.id, other.id)}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-800 text-[10px] font-medium transition"
                              >
                                {other.name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
