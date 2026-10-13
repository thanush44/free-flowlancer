import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenProfile,
  mobileOpen,
  setMobileOpen,
}) {
  const { user } = useAuth();
  const { isRunning, formattedTime, projectName } = useTimer();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & metrics' },
    { id: 'clients', label: 'Clients', icon: Users, desc: 'CRM & directory' },
    { id: 'projects', label: 'Projects & Tasks', icon: FolderKanban, desc: 'Delivery & burn rates' },
    { id: 'timetracker', label: 'Time Tracker', icon: Clock, desc: 'Stopwatch & work logs' },
    { id: 'invoices', label: 'Invoices', icon: FileText, desc: 'Billing & PDF invoices' },
  ];

  function handleSelect(id) {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
  }

  const content = (
    <div className="flex flex-col h-full bg-[#f7f4ee] border-r border-[#e8e1d3] select-none text-[#1c1917]">
      {/* Workspace Brand Header */}
      <div className="p-5 border-b border-[#e8e1d3] flex items-center justify-between">
        <div
          onClick={() => handleSelect('dashboard')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-[#e8e1d3] p-1 flex items-center justify-center shadow-subtle group-hover:border-[#c2b6a3] transition-all overflow-hidden shrink-0">
            <img
              src="/freelancer-icon.png"
              alt="FreelanceFlow"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-1.5">
              <span className="font-heading font-bold text-base tracking-tight text-[#1c1917]">
                FreelanceFlow
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium tracking-normal">
              Workspace & Billing
            </p>
          </div>
        </div>

        {/* Tier indicator pill */}
        <span
          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
            user?.plan === 'pro'
              ? 'bg-[#f4f7f4] text-[#304434] border-[#cedece]'
              : 'bg-[#fdfcf9] text-[#78716c] border-[#e8e1d3]'
          }`}
        >
          {user?.plan === 'pro' ? 'PRO' : 'FREE'}
        </span>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#a8a29e]">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-white text-[#1c1917] font-semibold shadow-subtle border border-[#e8e1d3]'
                  : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#efe9de]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#b45309]' : 'text-[#78716c] group-hover:text-[#1c1917]'
                  }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Stopwatch Indicator (when active) */}
      {isRunning && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white border border-[#fde68a] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#92400e] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
              Timer Running
            </span>
            <span className="font-mono text-xs font-bold text-[#1c1917]">
              {formattedTime}
            </span>
          </div>
          {projectName && (
            <p className="text-[11px] text-[#57534e] truncate mt-1 font-medium">
              {projectName}
            </p>
          )}
          <button
            onClick={() => handleSelect('timetracker')}
            className="w-full mt-2 py-1 px-2 text-[11px] font-semibold text-[#b45309] hover:text-[#78350f] bg-[#fffbeb] hover:bg-[#fef3c7] rounded-lg transition text-center border border-[#fde68a]"
          >
            Open Tracker &rarr;
          </button>
        </div>
      )}

      {/* Bottom User Profile & Workspace Plan */}
      <div className="p-3 border-t border-[#e8e1d3] bg-[#f7f4ee] space-y-2">
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center space-x-3 p-2 rounded-xl hover:bg-[#efe9de] transition group text-left border border-transparent hover:border-[#e8e1d3]"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-[#e8e1d3] overflow-hidden shrink-0 shadow-subtle group-hover:border-[#c2b6a3]">
            <img
              src="/profile-picture.png"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1c1917] truncate group-hover:text-[#b45309] transition">
              {user?.name || 'Alex Rivera'}
            </p>
            <p className="text-[10px] text-[#78716c] truncate">
              {user?.email || 'alex.freelancer@persevex.io'}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#a8a29e] group-hover:text-[#1c1917] transition" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop and Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#1c1917]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#f7f4ee] shadow-dropdown z-10 animate-fade-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
