import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [taskId, setTaskId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedLog, setLastSavedLog] = useState(null);

  const intervalRef = useRef(null);

  // Restore timer state from localStorage on load
  useEffect(() => {
    const savedRunning = localStorage.getItem('ff_timer_isRunning') === 'true';
    const savedStartTime = localStorage.getItem('ff_timer_startTime');
    const savedProjectId = localStorage.getItem('ff_timer_projectId') || '';
    const savedProjectName = localStorage.getItem('ff_timer_projectName') || '';
    const savedTaskId = localStorage.getItem('ff_timer_taskId') || '';
    const savedTaskTitle = localStorage.getItem('ff_timer_taskTitle') || '';
    const savedDesc = localStorage.getItem('ff_timer_description') || '';

    if (savedRunning && savedStartTime) {
      setIsRunning(true);
      setStartTime(savedStartTime);
      setProjectId(savedProjectId);
      setProjectName(savedProjectName);
      setTaskId(savedTaskId);
      setTaskTitle(savedTaskTitle);
      setDescription(savedDesc);

      const diff = Math.floor((Date.now() - new Date(savedStartTime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    }
  }, []);

  // Interval ticker using true Date delta
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const startMs = new Date(startTime).getTime();
        const nowMs = Date.now();
        const diff = Math.floor((nowMs - startMs) / 1000);
        setElapsedSeconds(Math.max(0, diff));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  // Start Timer
  function startTimer({
    projectId: pId,
    projectName: pName = '',
    taskId: tId = '',
    taskTitle: tTitle = '',
    description: desc = '',
  }) {
    const nowIso = new Date().toISOString();
    setIsRunning(true);
    setStartTime(nowIso);
    setProjectId(pId || '');
    setProjectName(pName || '');
    setTaskId(tId || '');
    setTaskTitle(tTitle || '');
    setDescription(desc || '');
    setElapsedSeconds(0);

    localStorage.setItem('ff_timer_isRunning', 'true');
    localStorage.setItem('ff_timer_startTime', nowIso);
    localStorage.setItem('ff_timer_projectId', pId || '');
    localStorage.setItem('ff_timer_projectName', pName || '');
    localStorage.setItem('ff_timer_taskId', tId || '');
    localStorage.setItem('ff_timer_taskTitle', tTitle || '');
    localStorage.setItem('ff_timer_description', desc || '');
  }

  // Update timer metadata on the fly
  function updateTimerDetails({ description: newDesc, projectId: newPId, projectName: newPName, taskId: newTId, taskTitle: newTTitle }) {
    if (newDesc !== undefined) {
      setDescription(newDesc);
      localStorage.setItem('ff_timer_description', newDesc);
    }
    if (newPId !== undefined) {
      setProjectId(newPId);
      localStorage.setItem('ff_timer_projectId', newPId);
    }
    if (newPName !== undefined) {
      setProjectName(newPName);
      localStorage.setItem('ff_timer_projectName', newPName);
    }
    if (newTId !== undefined) {
      setTaskId(newTId);
      localStorage.setItem('ff_timer_taskId', newTId);
    }
    if (newTTitle !== undefined) {
      setTaskTitle(newTTitle);
      localStorage.setItem('ff_timer_taskTitle', newTTitle);
    }
  }

  // Stop & Log Time to Backend
  async function stopTimer() {
    if (!isRunning || !startTime) return null;

    setIsSubmitting(true);
    const endTimeIso = new Date().toISOString();
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    try {
      const response = await api.createTimeLog({
        project_id: projectId,
        task_id: taskId || null,
        description: description || 'Stopwatch tracked session',
        start_time: startTime,
        end_time: endTimeIso,
        duration_minutes: durationMinutes,
        is_manual: false,
      });

      // Clear local storage & active timer state
      clearTimerStorage();
      setLastSavedLog(response.log);
      setIsSubmitting(false);

      // Dispatch custom event to notify listeners (e.g. project list or time tracker view)
      window.dispatchEvent(new CustomEvent('ff_time_logged', { detail: response.log }));

      return response.log;
    } catch (err) {
      setIsSubmitting(false);
      console.error('Failed to save time log:', err);
      throw err;
    }
  }

  // Discard Timer without logging
  function discardTimer() {
    clearTimerStorage();
  }

  function clearTimerStorage() {
    setIsRunning(false);
    setStartTime(null);
    setProjectId('');
    setProjectName('');
    setTaskId('');
    setTaskTitle('');
    setDescription('');
    setElapsedSeconds(0);

    localStorage.removeItem('ff_timer_isRunning');
    localStorage.removeItem('ff_timer_startTime');
    localStorage.removeItem('ff_timer_projectId');
    localStorage.removeItem('ff_timer_projectName');
    localStorage.removeItem('ff_timer_taskId');
    localStorage.removeItem('ff_timer_taskTitle');
    localStorage.removeItem('ff_timer_description');
  }

  // Format hh:mm:ss
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        startTime,
        projectId,
        projectName,
        taskId,
        taskTitle,
        description,
        elapsedSeconds,
        formattedTime: formatTime(elapsedSeconds),
        isSubmitting,
        lastSavedLog,
        startTimer,
        stopTimer,
        discardTimer,
        updateTimerDetails,
        formatTime,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}
