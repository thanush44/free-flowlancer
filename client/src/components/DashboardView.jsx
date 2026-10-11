import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  FolderKanban,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Plus,
  Play,
  Sparkles,
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
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
    const handleRefresh = () => loadStats();
    window.addEventListener('ff_time_logged', handleRefresh);
    return () => window.removeEventListener('ff_time_logged', handleRefresh);
  }, []);

  async function loadStats() {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-amber-200">Loading FreelanceFlow metrics...</p>
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const chartData = stats?.chart_data || [];
  const upcoming = stats?.upcoming_deadlines || [];
  const burnAlerts = stats?.burn_rate_alerts || [];
  const recentProjects = stats?.recent_projects || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: White, Gold, Red, Orange on Ash */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md shadow-amber-500/5">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-400 p-1 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 overflow-hidden ring-2 ring-amber-400/20">
            <img
              src="/freelancer-icon.png"
              alt="Freelancer Icon"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-heading">
              Freelance Operations & Financials
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Real-time project budget burn rates, unbilled hours, and cash-flow analytics.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onStartStopwatch({ description: 'New project sprint' })}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Timer</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className="inline-flex items-center space-x-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 hover:border-amber-400 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Pure White Cards with Gold & Orange Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div
          onClick={() => setActiveTab('projects')}
          className="bg-white hover:bg-amber-50/20 cursor-pointer p-5 rounded-2xl border border-stone-200/90 hover:border-amber-300 transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Active Projects</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-100 transition">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight font-heading">
              {summary.active_projects || 0}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              {summary.completed_projects || 0} completed
            </span>
          </div>
        </div>

        {/* Card 2: Pending Invoices & Outstanding */}
        <div
          onClick={() => setActiveTab('invoices')}
          className="bg-white hover:bg-orange-50/20 cursor-pointer p-5 rounded-2xl border border-stone-200/90 hover:border-orange-300 transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Pending Invoices</span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 group-hover:scale-110 group-hover:bg-orange-100 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight font-heading">
              {summary.pending_invoices || 0}
            </span>
            <span className="text-xs font-bold text-orange-600">
              ${Number(summary.outstanding_amount || 0).toLocaleString()} unpaid
            </span>
          </div>
        </div>

        {/* Card 3: Unbilled Work Ready to Invoice */}
        <div
          onClick={() => setActiveTab('invoices')}
          className="bg-white hover:bg-amber-50/20 cursor-pointer p-5 rounded-2xl border border-stone-200/90 hover:border-amber-300 transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Unbilled Hours</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-100 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 tracking-tight font-heading">
              {Number(summary.unbilled_hours || 0).toFixed(1)}h
            </span>
            <span className="text-xs font-semibold text-stone-700">
              ≈ ${Number(summary.unbilled_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Total Revenue (Paid) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Collected Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-stone-900 tracking-tight font-heading">
              ${Number(summary.total_revenue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              Paid in full
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Financial Chart & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart (Gold & Orange-Red Gradients) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 font-heading">
                Monthly Revenue & Outstanding Payments
              </h2>
              <p className="text-xs text-stone-500">
                Past 6 months comparison: Collected Revenue vs Outstanding Invoices
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200 font-mono font-bold">
              USD ($)
            </span>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="outstandingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                    <stop offset="50%" stopColor="#ea580c" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.9} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#f59e0b',
                    borderRadius: '1rem',
                    color: '#18181b',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    border: '2px solid #f59e0b',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Collected Revenue" fill="url(#revenueGrad)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding (Pending)" fill="url(#outstandingGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Deadlines Widget */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-stone-900 font-heading">Upcoming Deadlines</h2>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-0.5 transition"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <CheckCircle2 className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
              <p className="text-xs">No pending deadlines in the next 30 days!</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {upcoming.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-900 line-clamp-1">
                      {task.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 whitespace-nowrap font-medium">
                      {task.due_date}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="text-amber-700 font-medium">{task.project_name}</span>
                    <span className="capitalize text-stone-800 font-semibold">{task.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Burn Rate Trackers: White Cards with Gold/Orange/Red Bars */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 font-heading">Project Budget Burn Rates</h2>
            <p className="text-xs text-stone-500">
              Calculated from logged hours × client hourly rate vs total budget
            </p>
          </div>
          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-0.5 transition"
          >
            Manage Projects <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <p className="text-sm">No projects created yet.</p>
            <button
              onClick={onSeedSampleData}
              className="mt-3 inline-flex items-center space-x-1.5 text-xs text-amber-600 hover:underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load sample data to test burn rate engine</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((p) => {
              const pct = p.burn_rate_percent || 0;
              const isOver = pct >= 100;
              const isWarning = pct >= 80 && pct < 100;
              const barColor = isOver
                ? 'bg-gradient-to-r from-red-600 to-rose-500'
                : isWarning
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : 'bg-gradient-to-r from-amber-400 to-amber-500';

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{p.name}</h4>
                      <p className="text-[11px] text-amber-700 font-medium">{p.client_name}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOver
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isWarning
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {pct}% Burn
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                    <span className="text-stone-900 font-bold">${Number(p.spent || 0).toLocaleString()} spent</span>
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
