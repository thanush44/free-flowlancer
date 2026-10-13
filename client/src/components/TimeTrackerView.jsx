import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useTimer } from '../context/TimerContext';
import {
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  Filter,
  Check,
  AlertCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function TimeTrackerView({ setActiveTab }) {
  const {
    isRunning,
    formattedTime,
    projectId,
    projectName,
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

  // Delete confirmation modal state
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch {
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

  async function confirmDeleteLog() {
    if (!logToDelete) return;
    if (logToDelete.is_billed) {
      alert('This time entry is already billed on an invoice and cannot be deleted.');
      setLogToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteTimeLog(logToDelete.id);
      setLogToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight font-heading">
            Time Tracking Engine
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time persistent stopwatch and retroactive manual hour logging.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {totalUnbilled > 0 && setActiveTab && (
            <button
              onClick={() => setActiveTab('invoices')}
              className="inline-flex items-center space-x-2 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 border border-charcoal-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
              title="Jump to invoices to bill this time"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Draft Invoice (${Number(totalUnbilled).toLocaleString()})</span>
            </button>
          )}

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-charcoal-900 hover:bg-charcoal-800 text-ivory-50 text-xs font-medium px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Main Stopwatch Console Card: Warm Ivory with Charcoal & Sage Accents */}
      <div
        className={`surface-card rounded-2xl p-6 relative overflow-hidden transition-all ${
          isRunning
            ? 'border-sage-400 ring-2 ring-sage-200/50 bg-ivory-50'
            : 'border-charcoal-200/90'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Stopwatch Display */}
          <div className="flex items-center space-x-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${
                isRunning
                  ? 'bg-sage-100/70 border-sage-300 text-sage-800'
                  : 'bg-ivory-200/70 border-charcoal-200 text-charcoal-600'
              }`}
            >
              <Clock
                className={`w-8 h-8 ${
                  isRunning ? 'animate-pulse text-sage-700' : 'text-charcoal-600'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isRunning
                      ? 'bg-sage-100 text-sage-800 border border-sage-300'
                      : 'bg-ivory-200 text-charcoal-700 border border-charcoal-300'
                  }`}
                >
                  {isRunning ? 'Timer Active • Persists on refresh' : 'Stopwatch Ready'}
                </span>
                {isRunning && projectName && (
                  <span className="text-xs font-medium text-charcoal-700">
                    &bull; {projectName}
                  </span>
                )}
              </div>
              <div className="font-mono text-4xl sm:text-5xl font-extrabold text-charcoal-900 tracking-tight mt-1">
                {formattedTime}
              </div>
            </div>
          </div>

          {/* Center: Active configuration */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
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
                className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sage-500 focus:bg-white transition"
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
              <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                Task Description
              </label>
              <input
                type="text"
                placeholder="What are you working on?"
                value={description || ''}
                onChange={(e) => updateTimerDetails({ description: e.target.value })}
                className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sage-500 focus:bg-white placeholder-charcoal-400 transition"
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
                className="inline-flex items-center space-x-2 bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Timer</span>
              </button>
            ) : (
              <button
                onClick={stopTimer}
                disabled={isStopwatchSubmitting}
                className="inline-flex items-center space-x-2 bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>{isStopwatchSubmitting ? 'Saving...' : 'Stop & Log'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 surface-card p-4 rounded-xl border border-charcoal-200/90 shadow-sm">
        <div className="flex items-center space-x-6 text-xs">
          <div>
            <span className="text-charcoal-500 block font-medium">Total Logged Time</span>
            <span className="text-sm font-bold text-charcoal-900 font-mono">
              {Number(totalHours).toFixed(2)} hrs
            </span>
          </div>
          <div>
            <span className="text-charcoal-500 block font-medium">Unbilled Value</span>
            <span className="text-sm font-bold text-amber-700 font-mono">
              ${Number(totalUnbilled).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-charcoal-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Filter:</span>
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sage-500 focus:bg-white transition"
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
            className="bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-sage-500 focus:bg-white transition"
          >
            <option value="">All Statuses</option>
            <option value="0">Unbilled Only</option>
            <option value="1">Billed Only</option>
          </select>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="surface-card rounded-2xl border border-charcoal-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-100 text-charcoal-700 uppercase font-semibold text-[10px] tracking-wider border-b border-charcoal-200">
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
            <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-charcoal-400">
                    Loading time logs...
                  </td>
                </tr>
              ) : timeLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-charcoal-500">
                    No time logged yet. Start the stopwatch above or click "Manual Entry".
                  </td>
                </tr>
              ) : (
                timeLogs.map((log) => {
                  const dateStr = log.start_time ? log.start_time.split('T')[0] : '—';
                  const isBilled = !!log.is_billed;

                  return (
                    <tr key={log.id} className="hover:bg-ivory-50 transition">
                      <td className="py-3.5 px-4 font-mono text-charcoal-600 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-charcoal-900">{log.project_name}</div>
                        <div className="text-[11px] text-charcoal-500 font-medium">
                          {log.client_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-charcoal-900 truncate font-medium">
                          {log.task_title || log.description}
                        </div>
                        {log.task_title && log.description && (
                          <div className="text-[11px] text-charcoal-500 truncate">
                            {log.description}
                          </div>
                        )}
                        {log.is_manual ? (
                          <span className="text-[10px] text-amber-700 italic">Manual entry</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-charcoal-900">
                        {Number(log.hours || 0).toFixed(2)}h
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-charcoal-500">
                        ${log.client_hourly_rate}/h
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-charcoal-900">
                        ${Number(log.amount || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isBilled ? (
                          <span className="badge-sage inline-flex items-center space-x-1">
                            <Check className="w-3 h-3 text-sage-600" />
                            <span>Billed</span>
                          </span>
                        ) : (
                          <span className="badge-amber inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Unbilled</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isBilled && (
                          <button
                            onClick={() => setLogToDelete(log)}
                            className="p-1 text-charcoal-400 hover:text-terracotta-600 rounded-lg hover:bg-ivory-100 transition"
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

      {/* Delete Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/40 backdrop-blur-xs">
          <div className="surface-card rounded-2xl w-full max-w-sm p-6 shadow-dropdown border border-charcoal-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-charcoal-900 font-heading mb-1">
              Delete Time Log?
            </h3>
            <p className="text-xs text-charcoal-600 mb-4">
              Are you sure you want to remove this logged entry ({Number(logToDelete.hours || 0).toFixed(2)} hrs on {logToDelete.project_name})? This cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 rounded-xl hover:bg-ivory-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-terracotta-600 hover:bg-terracotta-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/40 backdrop-blur-xs">
          <div className="surface-card rounded-2xl w-full max-w-md p-6 shadow-dropdown border border-charcoal-200 relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-charcoal-900 font-heading mb-4">
              Manual Hour Logging
            </h3>

            {manualError && (
              <div className="mb-4 p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Project *
                </label>
                <select
                  required
                  value={manualFormData.project_id}
                  onChange={(e) => handleProjectSelectForManual(e.target.value)}
                  className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white transition"
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
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Related Task (Optional)
                  </label>
                  <select
                    value={manualFormData.task_id}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, task_id: e.target.value })
                    }
                    className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white transition"
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
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualFormData.date}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, date: e.target.value })
                    }
                    className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={manualFormData.hours}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, hours: e.target.value })
                    }
                    className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
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
                    className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white font-mono transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of work completed..."
                  value={manualFormData.description}
                  onChange={(e) =>
                    setManualFormData({ ...manualFormData, description: e.target.value })
                  }
                  className="w-full bg-ivory-50 border border-charcoal-200 text-charcoal-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sage-500 focus:bg-white placeholder-charcoal-400 transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-charcoal-200">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isManualSubmitting}
                  className="bg-charcoal-900 hover:bg-charcoal-800 text-ivory-50 text-xs font-medium px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
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
