import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Database,
  FileSpreadsheet,
  Filter,
  Flame,
  Key,
  Layers,
  LayoutDashboard,
  Plus,
  Radio,
  Search,
  Settings2,
  Sliders,
  Sparkles,
  TestTube2,
  UserCheck,
  Users,
} from 'lucide-react';
import { User } from '../types/index.ts';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  notifications: any[];
  onMarkAllNotificationsRead: () => void;
  onOpenNewLeadModal: () => void;
  onOpenTestSuiteModal: () => void;
  onOpenICPConfigModal: () => void;
  onOpenAskEnvModal?: () => void;
  onOpenImportModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  users,
  onSelectUser,
  notifications,
  onMarkAllNotificationsRead,
  onOpenNewLeadModal,
  onOpenTestSuiteModal,
  onOpenICPConfigModal,
  onOpenAskEnvModal,
  onOpenImportModal,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: 'RevOps Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Lead Cockpit', icon: Flame, badge: '75' },
    { id: 'assignment', label: 'SDR Assignment', icon: UserCheck },
    { id: 'signals', label: 'Signals Radar', icon: Radio, pulse: true },
    { id: 'workflows', label: 'RevOps Workflows', icon: Layers },
    { id: 'env', label: 'Env Variables', icon: Key },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white select-none">
      <div className="max-w-[100vw] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex items-center justify-between h-16 min-w-max">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => onSelectTab('dashboard')}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight text-slate-100 font-display">
                    Resourcely
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                    RevOps AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono -mt-0.5">Sales Intelligence Engine</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300">
                        {item.badge}
                      </span>
                    )}
                    {item.pulse && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-3">
            {/* System Test Suite Button */}
            <button
              onClick={onOpenTestSuiteModal}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Run 8 System Verification Tests"
            >
              <TestTube2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Suite</span>
              <span className="px-1 py-0.2 text-[9px] bg-cyan-950 text-cyan-300 rounded border border-cyan-800/60">8 tests</span>
            </button>

            {/* ICP Config Button */}
            <button
              onClick={onOpenICPConfigModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Adjust ICP Weights & Thresholds"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">ICP Config</span>
            </button>

            {/* Env Variables Button */}
            <button
              onClick={onOpenAskEnvModal || (() => onSelectTab('env'))}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                currentTab === 'env'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Manage & Ask Environment Variables"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Env Variables</span>
            </button>

            {/* Import CSV Button */}
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                title="Import leads from CSV file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Import CSV</span>
              </button>
            )}

            {/* Quick Capture Button */}
            <button
              onClick={onOpenNewLeadModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Live Intelligence Alerts
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">No recent alerts</div>
                    ) : (
                      notifications.slice(0, 8).map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 text-xs transition ${
                            notif.read ? 'text-slate-400' : 'bg-slate-800/40 text-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-slate-200 flex items-center justify-between">
                            <span>{notif.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {notif.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active User Switcher */}
            <div className="relative border-l border-slate-800 pl-3">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2.5 px-2 py-1.5 rounded-md hover:bg-slate-800 text-left transition"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
                <div className="hidden xl:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role} • {currentUser.team}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50">
                  <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Switch Perspective
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-xs transition text-left ${
                        currentUser.id === u.id
                          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-700"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {u.role} ({u.team})
                        </div>
                      </div>
                      {currentUser.id === u.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
