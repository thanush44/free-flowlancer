import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useTimer } from '../context/TimerContext';
import {
  Clock,
  Play,
  Square,
  Plus,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Trash2,
  Filter,
  Check,
  FileText,
} from 'lucide-react';

export default function TimeTrackerView({ setActiveTab }) {
  const {
    isRunning,
    formattedTime,
    projectId,
    projectName,
    taskId,
    taskTitle,
    description,
    isSubmitting: isStopwatchSubmitting,
    startTimer,
    stopTimer,
    updateTimerDetails,
  } = useTimer();

  const [timeLogs, setTimeLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterBilled, setFilterBilled] = useState('');

  // Manual entry modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    project_id: '',
    task_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    hours: 2,
    minutes: 0,
  });
  const [manualError, setManualError] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('ff_time_logged', handleRefresh);
    return () => window.removeEventListener('ff_time_logged', handleRefresh);
  }, [filterProject, filterBilled]);

  async function loadData() {
    try {
      const params = {};
      if (filterProject) params.project_id = filterProject;
      if (filterBilled !== '') params.is_billed = filterBilled;

      const [logsRes, projRes] = await Promise.all([
        api.getTimeLogs(params),
        api.getProjects(),
      ]);
      setTimeLogs(logsRes.logs || []);
      setProjects(projRes.projects || []);
    } catch (err) {
      console.error('Failed to load time logs:', err);
    } finally {
      setLoading(false);
    }
  }

  // When project changes in manual modal, load tasks
  async function handleProjectSelectForManual(pId) {
    setManualFormData((prev) => ({ ...prev, project_id: pId, task_id: '' }));
    if (!pId) {
      setTasks([]);
      return;
    }
    try {
      const res = await api.getTasks({ project_id: pId });
      setTasks(res.tasks || []);
    } catch (e) {
      setTasks([]);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setManualError('');
    setIsManualSubmitting(true);

    try {
      const totalMinutes =
        parseFloat(manualFormData.hours || 0) * 60 +
        parseFloat(manualFormData.minutes || 0);

      if (totalMinutes <= 0) {
        throw new Error('Please enter a duration greater than 0');
      }

      const logDate = manualFormData.date || new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${logDate}T09:00:00Z`).toISOString();
      const endDateTime = new Date(
        new Date(startDateTime).getTime() + totalMinutes * 60000
      ).toISOString();

      await api.createTimeLog({
        project_id: manualFormData.project_id,
        task_id: manualFormData.task_id || null,
        description: manualFormData.description || 'Manual time entry',
        start_time: startDateTime,
        end_time: endDateTime,
        duration_minutes: totalMinutes,
        is_manual: true,
      });

      setIsManualModalOpen(false);
      setManualFormData({
        project_id: '',
        task_id: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        hours: 2,
        minutes: 0,
      });
      await loadData();
    } catch (err) {
      setManualError(err.message || 'Failed to log manual time');
    } finally {
      setIsManualSubmitting(false);
    }
  }

  async function handleDeleteLog(log) {
    if (log.is_billed) {
      alert('This time entry is already billed on an invoice and cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this time log?')) return;
    try {
      await api.deleteTimeLog(log.id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalHours = timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const totalUnbilled = timeLogs
    .filter((l) => !l.is_billed)
    .reduce((sum, log) => sum + (log.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-heading">
            Time Tracking Engine
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time persistent stopwatch and retroactive manual hour logging.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 hover:border-amber-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Main Stopwatch Console Card: Pure White with Amber/Orange Border */}
      <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-md shadow-amber-500/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Stopwatch Display */}
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock
                className={`w-8 h-8 text-amber-500 ${
                  isRunning ? 'animate-pulse text-amber-600' : ''
                }`}
              />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                {isRunning ? 'Timer Active (Persists on Refresh)' : 'Stopwatch Ready'}
              </span>
              <div className="font-mono text-4xl sm:text-5xl font-black text-stone-900 tracking-tight">
                {formattedTime}
              </div>
            </div>
          </div>

          {/* Center: Active configuration */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Project *
              </label>
              <select
                value={projectId || ''}
                disabled={isRunning && !!projectId}
                onChange={(e) => {
                  const sel = projects.find((p) => String(p.id) === e.target.value);
                  updateTimerDetails({
                    projectId: e.target.value,
                    projectName: sel ? sel.name : '',
                  });
                }}
                className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.client_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Task Description
              </label>
              <input
                type="text"
                placeholder="What are you working on?"
                value={description || ''}
                onChange={(e) => updateTimerDetails({ description: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
              />
            </div>
          </div>

          {/* Right: Trigger Button */}
          <div className="flex items-center space-x-3 shrink-0">
            {!isRunning ? (
              <button
                onClick={() => {
                  if (!projectId && projects.length > 0) {
                    startTimer({
                      projectId: projects[0].id,
                      projectName: projects[0].name,
                      description: description || 'Active work session',
                    });
                  } else {
                    startTimer({ description: description || 'Active work session' });
                  }
                }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Timer</span>
              </button>
            ) : (
              <button
                onClick={stopTimer}
                disabled={isStopwatchSubmitting}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>{isStopwatchSubmitting ? 'Saving...' : 'Stop & Log'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200/90 shadow-sm">
        <div className="flex items-center space-x-6 text-xs">
          <div>
            <span className="text-stone-500 block font-medium">Total Logged Time</span>
            <span className="text-sm font-bold text-stone-900 font-mono">
              {Number(totalHours).toFixed(2)} hrs
            </span>
          </div>
          <div>
            <span className="text-stone-500 block font-medium">Unbilled Value</span>
            <span className="text-sm font-bold text-amber-600 font-mono">
              ${Number(totalUnbilled).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-amber-800 font-semibold">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Filter:</span>
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:bg-white"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterBilled}
            onChange={(e) => setFilterBilled(e.target.value)}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="0">Unbilled Only</option>
            <option value="1">Billed Only</option>
          </select>
        </div>
      </div>

      {/* Time Logs Table */}
      {/* Time Logs Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Project & Client</th>
                <th className="py-3 px-4">Task / Description</th>
                <th className="py-3 px-4 text-right">Hours</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Billing Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    Loading time logs...
                  </td>
                </tr>
              ) : timeLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No time logged yet. Start the stopwatch above or click "Manual Entry".
                  </td>
                </tr>
              ) : (
                timeLogs.map((log) => {
                  const dateStr = log.start_time ? log.start_time.split('T')[0] : '—';
                  const isBilled = !!log.is_billed;

                  return (
                    <tr key={log.id} className="hover:bg-amber-50/20 transition">
                      <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{log.project_name}</div>
                        <div className="text-[11px] text-amber-700 font-medium">{log.client_name}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-stone-900 truncate font-medium">
                          {log.task_title || log.description}
                        </div>
                        {log.task_title && log.description && (
                          <div className="text-[11px] text-stone-500 truncate">
                            {log.description}
                          </div>
                        )}
                        {log.is_manual ? (
                          <span className="text-[10px] text-amber-600 italic">Manual entry</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {Number(log.hours || 0).toFixed(2)}h
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-stone-500">
                        ${log.client_hourly_rate}/h
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-600">
                        ${Number(log.amount || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isBilled ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                            <Check className="w-3 h-3 text-amber-600" />
                            <span>Billed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                            <Clock className="w-3 h-3 text-orange-600" />
                            <span>Unbilled</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isBilled && (
                          <button
                            onClick={() => handleDeleteLog(log)}
                            className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition"
                            title="Delete time log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-stone-900 font-heading mb-4">
              Manual Hour Logging ("I worked 3 hours yesterday")
            </h3>

            {manualError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={manualFormData.project_id}
                  onChange={(e) => handleProjectSelectForManual(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.client_name}) - ${p.effective_rate || 50}/hr
                    </option>
                  ))}
                </select>
              </div>

              {tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Related Task (Optional)
                  </label>
                  <select
                    value={manualFormData.task_id}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, task_id: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="">General Work</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualFormData.date}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, date: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={manualFormData.hours}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, hours: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={manualFormData.minutes}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, minutes: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of work completed..."
                  value={manualFormData.description}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, description: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isManualSubmitting}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isManualSubmitting ? 'Saving...' : 'Log Hours'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
