import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { LeadsView } from './components/LeadsView.tsx';
import { LeadDetailDrawer } from './components/LeadDetailDrawer.tsx';
import { SignalsView } from './components/SignalsView.tsx';
import { WorkflowsView } from './components/WorkflowsView.tsx';
import { ICPConfigModal } from './components/ICPConfigModal.tsx';
import { LeadCaptureModal } from './components/LeadCaptureModal.tsx';
import { CsvImportModal } from './components/CsvImportModal.tsx';
import { TestSuiteModal } from './components/TestSuiteModal.tsx';
import { EnvVariablesView } from './components/EnvVariablesView.tsx';
import { AskEnvModal } from './components/AskEnvModal.tsx';
import { SdrAssignmentView } from './components/SdrAssignmentView.tsx';
import {
  ICPConfig,
  Lead,
  Notification,
  Signal,
  User,
  WorkflowExecution,
  WorkflowRule,
} from './types/index.ts';
import { defaultICPConfig } from './lib/scoringEngine.ts';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [icpConfig, setIcpConfig] = useState<ICPConfig>(defaultICPConfig);

  // Selection & Modals State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState<boolean>(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState<boolean>(false);
  const [isTestSuiteModalOpen, setIsTestSuiteModalOpen] = useState<boolean>(false);
  const [isICPConfigModalOpen, setIsICPConfigModalOpen] = useState<boolean>(false);
  const [isAskEnvModalOpen, setIsAskEnvModalOpen] = useState<boolean>(false);

  // Initial Load
  const fetchAllData = async () => {
    try {
      const [leadsRes, signalsRes, workflowsRes, usersRes, notifsRes, configRes] =
        await Promise.all([
          fetch('/api/leads').then((r) => r.json()),
          fetch('/api/signals').then((r) => r.json()),
          fetch('/api/workflows').then((r) => r.json()),
          fetch('/api/users').then((r) => r.json()),
          fetch('/api/notifications').then((r) => r.json()),
          fetch('/api/icp/config').then((r) => r.json()),
        ]);

      setLeads(leadsRes);
      setSignals(signalsRes);
      setWorkflows(workflowsRes.rules || []);
      setWorkflowExecutions(workflowsRes.executions || []);
      setUsers(usersRes);
      if (usersRes.length > 0 && !currentUser) {
        setCurrentUser(usersRes[0]); // Default to Sarah Jenkins (SDR)
      }
      setNotifications(notifsRes);
      if (configRes) {
        setIcpConfig(configRes);
      }
    } catch (err) {
      console.error('Failed to load RevOps data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Quick Remark Handler
  const handleApplyRemark = async (leadId: string, remarkKey: any, customNote?: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/remark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarkKey,
          note: customNote,
          userId: currentUser?.id,
          userName: currentUser?.name,
        }),
      });
      const data = await res.json();
      if (data.lead) {
        // Update in list
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(data.lead);
        }
        showToast(
          `Logged remark "${remarkKey.replace('_', ' ')}". Score updated: ${data.lead.score} PTS.`
        );

        // Refresh notifications
        const notifs = await fetch('/api/notifications').then((r) => r.json());
        setNotifications(notifs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ingest Signal Handler
  const handleIngestSignal = async (signalData: any) => {
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalData),
      });
      const data = await res.json();
      showToast(
        `Signal detected! ${data.leadsUpdated} lead(s) score adjusted (+${signalData.scoreImpact} PTS).`
      );

      // Refresh data
      await fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Lead Handler
  const handleSubmitLead = async (payload: any) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const newLead = await res.json();
      setLeads((prev) => [newLead, ...prev]);
      showToast(
        `Lead created! Scored ${newLead.score}/100 (${newLead.category}) and assigned to ${newLead.owner_sdr_name}.`
      );

      // Refresh notifs and workflows
      const notifs = await fetch('/api/notifications').then((r) => r.json());
      setNotifications(notifs);
      const wf = await fetch('/api/workflows').then((r) => r.json());
      setWorkflowExecutions(wf.executions || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Check Duplicate Handler
  const handleCheckDuplicate = async (payload: any) => {
    const res = await fetch('/api/leads/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  };

  // Save ICP Config Handler
  const handleSaveICPConfig = async (newConfig: ICPConfig) => {
    const res = await fetch('/api/icp/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    const data = await res.json();
    setIcpConfig(newConfig);

    // Refresh leads to show updated scores
    const updatedLeads = await fetch('/api/leads').then((r) => r.json());
    setLeads(updatedLeads);
    showToast(`ICP weights saved! ${data.updatedCount} leads re-scored across pipeline.`);
    return data;
  };

  // Toggle Workflow Handler
  const handleToggleWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, enabled: data.workflow.enabled } : w))
      );
      showToast(`Workflow "${data.workflow.name}" ${data.workflow.enabled ? 'activated' : 'disabled'}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all notifications read
  const handleMarkAllNotificationsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Batch Assign Leads
  const handleBatchAssignLeads = (updatedBatch: Lead[]) => {
    const updatedMap = new Map(updatedBatch.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => updatedMap.get(l.id) || l));
    if (selectedLead && updatedMap.has(selectedLead.id)) {
      setSelectedLead(updatedMap.get(selectedLead.id)!);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navigation Bar */}
      {currentUser && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentUser={currentUser}
          users={users}
          onSelectUser={setCurrentUser}
          notifications={notifications}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
          onOpenImportModal={() => setIsCsvImportModalOpen(true)}
          onOpenTestSuiteModal={() => setIsTestSuiteModalOpen(true)}
          onOpenICPConfigModal={() => setIsICPConfigModalOpen(true)}
          onOpenAskEnvModal={() => setIsAskEnvModalOpen(true)}
        />
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-indigo-500/50 shadow-2xl rounded-xl px-4 py-3 flex items-center space-x-3 text-xs text-slate-100 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs font-mono">Initializing Resourcely Sales Intelligence...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                leads={leads}
                signals={signals}
                users={users}
                onSelectLead={setSelectedLead}
                onNavigateToTab={setCurrentTab}
              />
            )}

            {currentTab === 'leads' && (
              <LeadsView
                leads={leads}
                users={users}
                onSelectLead={setSelectedLead}
                onApplyRemark={handleApplyRemark}
                onOpenImportModal={() => setIsCsvImportModalOpen(true)}
                onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
              />
            )}

            {currentTab === 'assignment' && (
              <SdrAssignmentView
                leads={leads}
                users={users}
                onUpdateLead={(updated) => {
                  setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                  if (selectedLead?.id === updated.id) setSelectedLead(updated);
                }}
                onBatchAssign={handleBatchAssignLeads}
                onSelectLead={setSelectedLead}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'signals' && (
              <SignalsView
                signals={signals}
                onIngestSignal={handleIngestSignal}
              />
            )}

            {currentTab === 'workflows' && (
              <WorkflowsView
                workflows={workflows}
                executions={workflowExecutions}
                onToggleWorkflow={handleToggleWorkflow}
              />
            )}

            {currentTab === 'env' && (
              <EnvVariablesView onShowToast={showToast} />
            )}
          </>
        )}
      </main>

      {/* 360-Degree Lead Cockpit Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onApplyRemark={handleApplyRemark}
          onUpdateLead={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setSelectedLead(updated);
          }}
          allUsers={users}
        />
      )}

      {/* Modals */}
      {isNewLeadModalOpen && (
        <LeadCaptureModal
          isOpen={isNewLeadModalOpen}
          onClose={() => setIsNewLeadModalOpen(false)}
          onSubmitLead={handleSubmitLead}
          onCheckDuplicate={handleCheckDuplicate}
          onOpenFullCsvModal={() => setIsCsvImportModalOpen(true)}
        />
      )}

      {isCsvImportModalOpen && (
        <CsvImportModal
          isOpen={isCsvImportModalOpen}
          onClose={() => setIsCsvImportModalOpen(false)}
          existingLeads={leads}
          users={users}
          onImportSuccess={(newLeads) => {
            fetchAllData();
          }}
          onShowToast={showToast}
        />
      )}

      {isICPConfigModalOpen && (
        <ICPConfigModal
          config={icpConfig}
          isOpen={isICPConfigModalOpen}
          onClose={() => setIsICPConfigModalOpen(false)}
          onSaveConfig={handleSaveICPConfig}
        />
      )}

      {isTestSuiteModalOpen && (
        <TestSuiteModal
          isOpen={isTestSuiteModalOpen}
          onClose={() => setIsTestSuiteModalOpen(false)}
        />
      )}

      {isAskEnvModalOpen && (
        <AskEnvModal
          isOpen={isAskEnvModalOpen}
          onClose={() => setIsAskEnvModalOpen(false)}
          onSaved={(key) => showToast(`Environment variable "${key}" applied directly to runtime!`)}
          onNavigateToFullTable={() => setCurrentTab('env')}
        />
      )}
    </div>
  );
}
