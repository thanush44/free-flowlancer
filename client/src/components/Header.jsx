import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { Menu, Play, Database } from 'lucide-react';

const PAGE_META = {
  dashboard: {
    title: 'Workspace Dashboard',
    subtitle: "Today's priorities, upcoming deadlines, active work & cash-flow overview",
  },
  clients: {
    title: 'Clients & Accounts',
    subtitle: 'Client CRM directory, hourly billing rates & unbilled account balances',
  },
  projects: {
    title: 'Projects & Tasks',
    subtitle: 'Deliverables, task hierarchies, deadlines & automatic budget burn rates',
  },
  timetracker: {
    title: 'Time Tracking Engine',
    subtitle: 'Persistent real-time stopwatch & retroactive manual hours logging',
  },
  invoices: {
    title: 'Invoices & Billing Suite',
    subtitle: 'Generate itemized PDF invoices from logged hours and monitor collections',
  },
};

export default function Header({
  activeTab,
  setActiveTab,
  onOpenProfile,
  onSeedSampleData,
  isSeeding,
  onStartStopwatch,
  setMobileOpen,
}) {
  const { user } = useAuth();
  const { isRunning, formattedTime } = useTimer();

  const currentMeta = PAGE_META[activeTab] || PAGE_META.dashboard;

  return (
    <header className="sticky top-0 z-20 bg-[#fbf9f5]/90 backdrop-blur-md border-b border-[#e8e1d3] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-xl text-[#57534e] hover:text-[#1c1917] hover:bg-[#efe9de] border border-[#e8e1d3] transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-heading font-bold text-[#1c1917] tracking-tight truncate">
            {currentMeta.title}
          </h1>
          <p className="text-[11px] text-[#78716c] hidden sm:block truncate">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions (Quick Timer, Sample Data, Profile) */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Quick Stopwatch Button */}
        {!isRunning ? (
          <button
            onClick={() => onStartStopwatch({ description: 'Active work session' })}
            className="inline-flex items-center space-x-1.5 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Start Timer</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('timetracker')}
            className="inline-flex items-center space-x-1.5 bg-[#fffbeb] text-[#92400e] border border-[#fde68a] text-xs font-mono font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-subtle hover:bg-[#fef3c7] transition"
          >
            <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
            <span>{formattedTime}</span>
          </button>
        )}

        {/* Load Sample Data button */}
        <button
          onClick={onSeedSampleData}
          disabled={isSeeding}
          title="Pre-populate realistic clients, projects, tasks, time logs, and invoices"
          className="inline-flex items-center space-x-1.5 bg-white hover:bg-[#f7f4ee] text-[#44403c] hover:text-[#1c1917] border border-[#e8e1d3] hover:border-[#c2b6a3] text-xs font-medium px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-subtle transition disabled:opacity-50"
        >
          <Database className={`w-3.5 h-3.5 text-[#b45309] ${isSeeding ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{isSeeding ? 'Loading...' : 'Sample Data'}</span>
        </button>

        {/* User Profile trigger */}
        <button
          onClick={onOpenProfile}
          className="p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-[#efe9de] border border-transparent hover:border-[#e8e1d3] flex items-center space-x-2 transition text-left"
          title="Account profile & settings"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#e8e1d3] overflow-hidden shrink-0 shadow-subtle">
            <img
              src="/profile-picture.png"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:block leading-tight">
            <span className="text-xs font-semibold text-[#1c1917] block truncate max-w-[90px]">
              {user?.name?.split(' ')[0] || 'Alex'}
            </span>
            <span className="text-[10px] text-[#4d6b53] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4d6b53]" />
              Online
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
