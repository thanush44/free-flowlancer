import React, { useState } from 'react';
import { useTimer } from '../context/TimerContext';
import { Square, X, Clock, AlertCircle } from 'lucide-react';

export default function StopwatchBar({ projects = [], onOpenTracker }) {
  const {
    isRunning,
    formattedTime,
    projectId,
    taskTitle,
    description,
    isSubmitting,
    stopTimer,
    discardTimer,
    updateTimerDetails,
  } = useTimer();

  const [errorMsg, setErrorMsg] = useState('');

  if (!isRunning) return null;

  async function handleStop() {
    setErrorMsg('');
    if (!projectId) {
      setErrorMsg('Please select a project before saving this time log');
      return;
    }
    try {
      await stopTimer();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save time log');
    }
  }

  return (
    <div className="sticky top-[57px] z-20 bg-[#fffdfa] border-b border-[#e8e1d3] px-4 sm:px-8 py-2.5 shadow-subtle transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Time */}
        <div
          onClick={onOpenTracker}
          className="flex items-center space-x-3 cursor-pointer group"
          title="Open Time Tracker"
        >
          <div className="flex items-center space-x-2 bg-[#fef3c7] border border-[#fde68a] px-2.5 py-1 rounded-lg group-hover:bg-[#fde68a]/60 transition">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d97706] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d97706]"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-[#92400e] uppercase">
              Timer Active
            </span>
          </div>

          <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#1c1917] flex items-center gap-2 group-hover:text-[#b45309] transition">
            <Clock className="w-4 h-4 text-[#b45309]" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Center: Project, Task & Work Note */}
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-[260px]">
          <select
            value={projectId || ''}
            onChange={(e) => {
              const selectedP = projects.find((p) => String(p.id) === e.target.value);
              updateTimerDetails({
                projectId: e.target.value,
                projectName: selectedP ? selectedP.name : '',
              });
            }}
            className="bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#b45309] max-w-[200px]"
          >
            <option value="">Select Project *</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.client_name})
              </option>
            ))}
          </select>

          {taskTitle && (
            <span className="text-xs bg-[#f4f7f4] text-[#304434] border border-[#cedece] px-2 py-1 rounded-lg font-medium">
              Task: {taskTitle}
            </span>
          )}

          <input
            type="text"
            placeholder="What are you working on right now?"
            value={description || ''}
            onChange={(e) => updateTimerDetails({ description: e.target.value })}
            className="flex-1 min-w-[160px] bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {errorMsg && (
            <span className="text-xs text-[#a74328] font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#c05638]" />
              {errorMsg}
            </span>
          )}

          <button
            onClick={handleStop}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 bg-[#c05638] hover:bg-[#a74328] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{isSubmitting ? 'Saving...' : 'Stop & Log'}</span>
          </button>

          <button
            onClick={discardTimer}
            title="Discard current timer without logging"
            className="text-[#78716c] hover:text-[#1c1917] p-1.5 rounded-xl hover:bg-[#efe9de] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

