import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import { api } from './api';

import Navbar from './components/Navbar';
import StopwatchBar from './components/StopwatchBar';
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import ProjectsView from './components/ProjectsView';
import TimeTrackerView from './components/TimeTrackerView';
import InvoicesView from './components/InvoicesView';

import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { startTimer } = useTimer();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectsList, setProjectsList] = useState([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      loadProjectsForGlobalTimer();
    }
  }, [user, activeTab]);

  async function loadProjectsForGlobalTimer() {
    try {
      const res = await api.getProjects();
      setProjectsList(res.projects || []);
    } catch (e) {
      console.warn('Could not preload projects list', e);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  async function handleSeedSampleData() {
    setIsSeeding(true);
    try {
      const res = await api.seedSampleData();
      showToast(
        'Sample data populated: 4 Clients, 5 Projects, 15 Tasks, 28 Time Logs & Invoices!',
        'success'
      );
      await loadProjectsForGlobalTimer();
      window.dispatchEvent(new CustomEvent('ff_time_logged'));
    } catch (err) {
      showToast(err.message || 'Failed to seed sample data', 'error');
    } finally {
      setIsSeeding(false);
    }
  }

  function handleStartStopwatch(opts) {
    startTimer(opts);
    setActiveTab('timetracker');
    showToast(`Stopwatch started for ${opts.projectName || 'session'}`, 'info');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f4f6] flex flex-col items-center justify-center text-amber-700">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-heading font-semibold text-sm">Initializing FreelanceFlow...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-stone-900 flex flex-col font-sans">
      {/* Toast Notification: White, Gold, Red, Orange */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border-2 flex items-center space-x-2 text-xs font-semibold transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-white text-stone-900 border-amber-400 shadow-amber-500/15'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-400 shadow-red-500/15'
              : 'bg-orange-50 text-orange-950 border-orange-400 shadow-orange-500/15'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Persistent Global Stopwatch Bar */}
      <StopwatchBar
        projects={projectsList}
        onOpenTracker={() => setActiveTab('timetracker')}
      />

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSeedSampleData={handleSeedSampleData}
        isSeeding={isSeeding}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onStartStopwatch={handleStartStopwatch}
            onSeedSampleData={handleSeedSampleData}
          />
        )}

        {activeTab === 'clients' && <ClientsView setActiveTab={setActiveTab} />}

        {activeTab === 'projects' && (
          <ProjectsView onStartStopwatch={handleStartStopwatch} />
        )}

        {activeTab === 'timetracker' && (
          <TimeTrackerView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'invoices' && <InvoicesView setActiveTab={setActiveTab} />}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200/90 py-6 text-center text-xs text-stone-500 bg-white/70">
        <p>
          FreelanceFlow SaaS &copy; 2026. Built with React, Express, SQLite & PDFKit.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </AuthProvider>
  );
}
