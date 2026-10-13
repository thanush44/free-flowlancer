import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  FolderKanban,
  FileText,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  Play,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function DashboardView({
  setActiveTab,
  onStartStopwatch,
  onSeedSampleData,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        setLoadError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener('ff_time_logged', handleRefresh);
    return () => window.removeEventListener('ff_time_logged', handleRefresh);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="flex flex-col items-center space-y-2.5">
          <div className="w-8 h-8 border-2 border-[#b45309] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#78716c] font-medium">Loading workspace metrics...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 bg-[#fdf6f4] border border-[#f5d3ca] rounded-2xl text-xs text-[#6a2a19] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-[#c05638] shrink-0" />
          <span>{loadError}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-white border border-[#f5d3ca] rounded-lg text-xs font-semibold hover:bg-[#faeae5] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const chartData = stats?.chart_data || [];
  const upcoming = stats?.upcoming_deadlines || [];
  const recentProjects = stats?.recent_projects || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Warm ivory tactile card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e8e1d3] shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#f7f4ee] border border-[#e8e1d3] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-subtle">
            <img
              src="/freelancer-icon.png"
              alt="Freelancer Icon"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1c1917] tracking-tight font-heading">
              Freelancer Operations & Financial Ledger
            </h2>
            <p className="text-xs text-[#57534e] mt-0.5">
              Budget burn rates, billable unbilled hours, and real collected cash flow.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onStartStopwatch({ description: 'New project sprint' })}
            className="inline-flex items-center space-x-1.5 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Stopwatch</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className="inline-flex items-center space-x-1.5 bg-white hover:bg-[#f7f4ee] text-[#1c1917] border border-[#e8e1d3] hover:border-[#c2b6a3] text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-subtle"
          >
            <FileText className="w-3.5 h-3.5 text-[#b45309]" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Pure White Cards with subtle tactile borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div
          onClick={() => setActiveTab('projects')}
          className="bg-white hover:bg-[#fdfcf9] cursor-pointer p-4 sm:p-5 rounded-2xl border border-[#e8e1d3] hover:border-[#c2b6a3] transition shadow-subtle group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716c]">Active Deliverables</span>
            <div className="w-8 h-8 rounded-xl bg-[#f7f4ee] border border-[#e8e1d3] flex items-center justify-center text-[#57534e] group-hover:text-[#1c1917] transition">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight font-mono">
              {summary.active_projects || 0}
            </span>
            <span className="text-[11px] text-[#4d6b53] font-medium">
              {summary.completed_projects || 0} completed
            </span>
          </div>
        </div>

        {/* Card 2: Pending Invoices & Outstanding */}
        <div
          onClick={() => setActiveTab('invoices')}
          className="bg-white hover:bg-[#fdfcf9] cursor-pointer p-4 sm:p-5 rounded-2xl border border-[#e8e1d3] hover:border-[#c2b6a3] transition shadow-subtle group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716c]">Pending Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] flex items-center justify-center text-[#c05638] transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight font-mono">
              {summary.pending_invoices || 0}
            </span>
            <span className="text-[11px] font-mono font-semibold text-[#c05638]">
              ${Number(summary.outstanding_amount || 0).toLocaleString()} unpaid
            </span>
          </div>
        </div>

        {/* Card 3: Unbilled Work Ready to Invoice */}
        <div
          onClick={() => setActiveTab('invoices')}
          className="bg-white hover:bg-[#fdfcf9] cursor-pointer p-4 sm:p-5 rounded-2xl border border-[#e8e1d3] hover:border-[#c2b6a3] transition shadow-subtle group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716c]">Unbilled Work</span>
            <div className="w-8 h-8 rounded-xl bg-[#fffbeb] border border-[#fde68a] flex items-center justify-center text-[#b45309] transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#b45309] tracking-tight font-mono">
              {Number(summary.unbilled_hours || 0).toFixed(1)}h
            </span>
            <span className="text-[11px] font-mono font-medium text-[#57534e]">
              &asymp; ${Number(summary.unbilled_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Total Revenue (Paid) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e1d3] shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#78716c]">Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-[#f4f7f4] border border-[#cedece] flex items-center justify-center text-[#4d6b53]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#1c1917] tracking-tight font-mono">
              ${Number(summary.total_revenue || 0).toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-[#304434] bg-[#f4f7f4] border border-[#cedece] px-2 py-0.5 rounded-md uppercase">
              Paid in full
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Financial Chart & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart (Sage Green for Revenue, Subtle Amber for Outstanding) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-[#e8e1d3] shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] font-heading">
                Monthly Invoicing & Collections
              </h3>
              <p className="text-xs text-[#78716c]">
                Past 6 months: Paid revenue vs outstanding receivables
              </p>
            </div>
            <span className="text-[11px] bg-[#f7f4ee] text-[#57534e] px-2.5 py-1 rounded-lg border border-[#e8e1d3] font-mono font-medium">
              USD ($)
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d3" opacity={0.7} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e8e1d3',
                    borderRadius: '0.75rem',
                    color: '#1c1917',
                    fontSize: '11px',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px -2px rgba(28, 25, 23, 0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Collected (Paid)" fill="#4d6b53" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Deadlines Widget */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e8e1d3] shadow-subtle flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#b45309]" />
              <h3 className="text-base font-bold text-[#1c1917] font-heading">Upcoming Deadlines</h3>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-[#b45309] hover:text-[#78350f] font-semibold flex items-center gap-0.5 transition"
            >
              Projects <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#a8a29e]">
              <CheckCircle2 className="w-8 h-8 text-[#4d6b53] mb-2 opacity-70" />
              <p className="text-xs">No pending deadlines in the next 30 days!</p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {upcoming.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-[#f7f4ee] border border-[#e8e1d3] hover:border-[#c2b6a3] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1c1917] line-clamp-1">
                      {task.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white text-[#92400e] border border-[#fde68a] whitespace-nowrap font-medium">
                      {task.due_date}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#78716c]">
                    <span className="text-[#57534e] font-medium truncate max-w-[140px]">{task.project_name}</span>
                    <span className="capitalize text-[#1c1917] font-semibold text-[10px]">{task.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Burn Rate Trackers: Compact Cards with Sage, Amber & Terracotta Bars */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#e8e1d3] shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1c1917] font-heading">Project Budget Burn Rates</h3>
            <p className="text-xs text-[#78716c]">
              Real logged hours &times; hourly rate compared against project budget
            </p>
          </div>
          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs text-[#b45309] hover:text-[#78350f] font-semibold flex items-center gap-0.5 transition"
          >
            Manage <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-[#78716c]">
            <p className="text-xs">No active projects found.</p>
            <button
              onClick={onSeedSampleData}
              className="mt-2.5 inline-flex items-center space-x-1.5 text-xs text-[#b45309] hover:underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load sample data to view budget burn engine</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recentProjects.map((p) => {
              const pct = p.burn_rate_percent || 0;
              const isOver = pct >= 100;
              const isWarning = pct >= 80 && pct < 100;
              const barColor = isOver
                ? 'bg-[#c05638]'
                : isWarning
                ? 'bg-[#d97706]'
                : 'bg-[#4d6b53]';

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#f7f4ee] border border-[#e8e1d3] hover:border-[#c2b6a3] transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#1c1917] truncate">{p.name}</h4>
                      <p className="text-[11px] text-[#78716c] truncate">{p.client_name}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isOver
                          ? 'bg-[#fdf6f4] text-[#86341f] border border-[#f5d3ca]'
                          : isWarning
                          ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                          : 'bg-[#f4f7f4] text-[#304434] border-[#cedece]'
                      }`}
                    >
                      {pct}% Burn
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-[#e8e1d3] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#78716c] font-mono">
                    <span className="text-[#1c1917] font-semibold">${Number(p.spent || 0).toLocaleString()} spent</span>
                    <span>Budget: ${Number(p.budget || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

