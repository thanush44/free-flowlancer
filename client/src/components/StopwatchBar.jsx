import React, { useState } from 'react';
import { useTimer } from '../context/TimerContext';
import { Play, Square, X, Clock, AlertCircle } from 'lucide-react';

export default function StopwatchBar({ projects = [], onOpenTracker }) {
  const {
    isRunning,
    formattedTime,
    projectId,
    projectName,
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
    <div className="sticky top-0 z-50 bg-white border-b-2 border-amber-400 shadow-md shadow-amber-500/10 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Time */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
              Timer Active
            </span>
          </div>

          <div className="font-mono text-2xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Center: Project, Task & Work Note */}
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-[280px]">
          <select
            value={projectId || ''}
            onChange={(e) => {
              const selectedP = projects.find((p) => String(p.id) === e.target.value);
              updateTimerDetails({
                projectId: e.target.value,
                projectName: selectedP ? selectedP.name : '',
              });
            }}
            className="bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:bg-white max-w-[200px]"
          >
            <option value="">Select Project *</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.client_name})
              </option>
            ))}
          </select>

          {taskTitle && (
            <span className="text-xs bg-orange-50 text-orange-800 border border-orange-200 px-2 py-1 rounded-lg font-medium">
              Task: {taskTitle}
            </span>
          )}

          <input
            type="text"
            placeholder="What are you working on right now?"
            value={description || ''}
            onChange={(e) => updateTimerDetails({ description: e.target.value })}
            className="flex-1 min-w-[160px] bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {errorMsg && (
            <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              {errorMsg}
            </span>
          )}

          <button
            onClick={handleStop}
            disabled={isSubmitting}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>{isSubmitting ? 'Saving...' : 'Stop & Log'}</span>
          </button>

          <button
            onClick={discardTimer}
            title="Discard current timer without logging"
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
