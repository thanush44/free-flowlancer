import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import ProfileModal from './ProfileModal';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  FileText,
  Sparkles,
  Zap,
  Play,
  Database,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onSeedSampleData, isSeeding }) {
  const { user, togglePlan } = useAuth();
  const { isRunning, startTimer, formattedTime } = useTimer();
  const [isTogglingPlan, setIsTogglingPlan] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients CRM', icon: Users },
    { id: 'projects', label: 'Projects & Tasks', icon: FolderKanban },
    { id: 'timetracker', label: 'Time Tracker', icon: Clock },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
  ];

  async function handlePlanToggle() {
    setIsTogglingPlan(true);
    try {
      const nextPlan = user?.plan === 'free' ? 'pro' : 'free';
      await togglePlan(nextPlan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTogglingPlan(false);
    }
  }

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo: Featuring Freelancer Silhouette Icon */}
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-amber-400 p-0.5 flex items-center justify-center shadow-md shadow-amber-500/15 group-hover:border-amber-500 group-hover:scale-105 transition-all overflow-hidden ring-2 ring-amber-400/20">
                <img
                  src="/freelancer-icon.png"
                  alt="FreelanceFlow Icon"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-lg tracking-tight text-stone-900 font-heading">
                    FreelanceFlow
                  </span>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                    SaaS
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 hidden sm:block">
                  Project Management & Invoicing
                </p>
              </div>
            </div>

            {/* Navigation Links: Rich active buttons */}
            <nav className="hidden md:flex items-center space-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25 font-bold'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? 'text-white' : 'text-amber-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Tools */}
            <div className="flex items-center space-x-2.5">
              {/* Quick Stopwatch trigger with rich gradient */}
              {!isRunning ? (
                <button
                  onClick={() => {
                    setActiveTab('timetracker');
                    startTimer({ description: 'New work session' });
                  }}
                  className="hidden lg:inline-flex items-center space-x-1.5 bg-white hover:bg-amber-50/50 text-stone-800 hover:text-amber-700 border border-stone-200 hover:border-amber-400 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-sm hover:shadow-md hover:shadow-amber-500/15"
                >
                  <Play className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>Quick Timer</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('timetracker')}
                  className="hidden lg:inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white border border-amber-300 text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl transition shadow-lg shadow-orange-500/30"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span className="text-white font-extrabold">{formattedTime}</span>
                </button>
              )}

              {/* Load Sample Data Button: Rich glass button */}
              <button
                onClick={onSeedSampleData}
                disabled={isSeeding}
                title="Prepopulate realistic clients, projects, tasks, time logs, and invoices"
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-stone-200 hover:border-amber-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-sm hover:shadow-amber-500/10 disabled:opacity-50"
              >
                <Database className={`w-3.5 h-3.5 text-amber-500 ${isSeeding ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSeeding ? 'Loading...' : 'Load Sample Data'}</span>
              </button>

              {/* Freemium Tier Switcher Pill */}
              <div className="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200">
                <span
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                    user?.plan === 'pro'
                      ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-stone-950 font-black shadow-sm'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {user?.plan === 'pro' ? (
                    <>
                      <Sparkles className="w-3 h-3 fill-current" />
                      PRO
                    </>
                  ) : (
                    <>FREE</>
                  )}
                </span>

                <button
                  onClick={handlePlanToggle}
                  disabled={isTogglingPlan}
                  title={`Click to switch to ${user?.plan === 'free' ? 'Pro' : 'Free'}`}
                  className="text-[11px] text-amber-700 hover:text-stone-900 px-2 py-1 transition font-bold"
                >
                  {isTogglingPlan ? '...' : user?.plan === 'pro' ? 'Free' : 'Pro'}
                </button>
              </div>

              {/* User Profile Avatar Button: Click to Open Profile Modal */}
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-2.5 pl-2 border-l border-stone-200 group text-left cursor-pointer focus:outline-none"
                title="Click to view and edit profile"
              >
                <div
                  className="w-9 h-9 rounded-full bg-white border-2 border-amber-400 p-0.5 flex items-center justify-center overflow-hidden shadow-md shadow-amber-500/20 ring-2 ring-amber-400/20 group-hover:ring-amber-500 group-hover:scale-105 transition-all shrink-0"
                >
                  <img
                    src="/profile-picture.png"
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="hidden xl:block text-left leading-tight">
                  <span className="text-xs font-bold text-stone-800 block truncate max-w-[120px] group-hover:text-amber-600 transition">
                    {user?.name?.split(' ')[0] || 'Alex'}
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-stone-200 px-2 py-1.5 flex items-center justify-around overflow-x-auto bg-white">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-2 text-xs font-medium transition ${
                  isActive ? 'text-amber-600 font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-amber-500' : 'text-stone-400'}`} />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Interactive Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
