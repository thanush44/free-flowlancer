import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import { api } from './api';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StopwatchBar from './components/StopwatchBar';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import ProjectsView from './components/ProjectsView';
import TimeTrackerView from './components/TimeTrackerView';
import InvoicesView from './components/InvoicesView';

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { startTimer } = useTimer();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectsList, setProjectsList] = useState([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      await api.seedSampleData();
      showToast(
        'Sample data populated: 4 Clients, 5 Projects, 11 Tasks, 11 Time Logs & 3 Invoices!',
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

  function handleStartStopwatch(opts = {}) {
    startTimer(opts);
    setActiveTab('timetracker');
    showToast(`Timer started: ${opts.projectName || opts.description || 'Session'}`, 'info');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fbf9f5] flex flex-col items-center justify-center text-[#1c1917]">
        <div className="w-9 h-9 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="font-heading font-medium text-xs text-[#78716c]">
          Initializing FreelanceFlow workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-[#1c1917] flex flex-row font-sans selection:bg-[#e8e1d3]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-dropdown border flex items-center space-x-2.5 text-xs font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-[#f4f7f4] text-[#243327] border-[#cedece]'
              : toast.type === 'error'
              ? 'bg-[#fdf6f4] text-[#6a2a19] border-[#f5d3ca]'
              : 'bg-[#fffbeb] text-[#78350f] border-[#fde68a]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4d6b53] shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#c05638] shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#b45309] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Refined Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Right Column: Header, Stopwatch Bar, Content, and Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Workspace Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenProfile={() => setIsProfileOpen(true)}
          onSeedSampleData={handleSeedSampleData}
          isSeeding={isSeeding}
          onStartStopwatch={handleStartStopwatch}
          setMobileOpen={setMobileOpen}
        />

        {/* Persistent Global Stopwatch Bar (when active) */}
        <StopwatchBar
          projects={projectsList}
          onOpenTracker={() => setActiveTab('timetracker')}
        />

        {/* Main View Workspace Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
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

        {/* Subtle, Professional Workspace Footer */}
        <footer className="border-t border-[#e8e1d3] py-4 text-center text-[11px] text-[#78716c] bg-[#f7f4ee]/70">
          <p>
            FreelanceFlow &bull; Professional Freelancer Workspace &bull; Express, SQLite & PDFKit
          </p>
        </footer>
      </div>

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSwitchAccount={() => {
          setIsProfileOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Auth Modal for Sign In, Registration, and Multi-user Isolation */}
      <AuthModal
        isOpen={!user || isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <TimerProvider>
          <AppContent />
        </TimerProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
