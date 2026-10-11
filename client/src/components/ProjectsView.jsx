import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useTimer } from '../context/TimerContext';
import {
  FolderKanban,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  X,
  ListTodo,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function ProjectsView({ onStartStopwatch }) {
  const { startTimer, isRunning, projectId: activeTimerProjectId } = useTimer();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFormData, setProjectFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    status: 'active',
    budget: 3000,
    deadline: '',
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    status: 'todo',
    due_date: '',
    estimated_hours: 4,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('ff_time_logged', handleRefresh);
    return () => window.removeEventListener('ff_time_logged', handleRefresh);
  }, []);

  async function loadData() {
    try {
      const [projRes, clientsRes] = await Promise.all([
        api.getProjects(),
        api.getClients(),
      ]);
      setProjects(projRes.projects || []);
      setClients(clientsRes.clients || []);

      if (selectedProject) {
        loadTasksForProject(selectedProject.id);
      }
    } catch (err) {
      console.error('Failed to load projects/clients:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTasksForProject(projId) {
    setTasksLoading(true);
    try {
      const res = await api.getTasks({ project_id: projId });
      setProjectTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }

  function handleSelectProject(proj) {
    if (selectedProject?.id === proj.id) {
      setSelectedProject(null);
      setProjectTasks([]);
    } else {
      setSelectedProject(proj);
      loadTasksForProject(proj.id);
    }
  }

  function openCreateProjectModal() {
    setEditingProject(null);
    setProjectFormData({
      client_id: clients[0]?.id || '',
      name: '',
      description: '',
      status: 'active',
      budget: 3000,
      deadline: '',
    });
    setErrorMessage('');
    setIsProjectModalOpen(true);
  }

  function openEditProjectModal(proj) {
    setEditingProject(proj);
    setProjectFormData({
      client_id: proj.client_id,
      name: proj.name,
      description: proj.description || '',
      status: proj.status || 'active',
      budget: proj.budget || 0,
      deadline: proj.deadline || '',
    });
    setErrorMessage('');
    setIsProjectModalOpen(true);
  }

  async function handleProjectSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, projectFormData);
      } else {
        await api.createProject(projectFormData);
      }
      setIsProjectModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProject(proj) {
    if (!window.confirm(`Delete project "${proj.name}" and all associated tasks?`)) return;
    try {
      await api.deleteProject(proj.id);
      if (selectedProject?.id === proj.id) setSelectedProject(null);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Task Creation
  async function handleTaskSubmit(e) {
    e.preventDefault();
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      await api.createTask({
        project_id: selectedProject.id,
        ...taskFormData,
      });
      setIsTaskModalOpen(false);
      setTaskFormData({ title: '', status: 'todo', due_date: '', estimated_hours: 4 });
      await loadTasksForProject(selectedProject.id);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTaskStatus(task) {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await api.updateTaskStatus(task.id, nextStatus);
      await loadTasksForProject(selectedProject.id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.deleteTask(taskId);
      await loadTasksForProject(selectedProject.id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-heading">
              Projects & Tasks
            </h1>
            <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-semibold">
              {projects.length} Total
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Track business deliverables, task hierarchies, and automatic budget burn rates.
          </p>
        </div>

        <button
          onClick={openCreateProjectModal}
          disabled={clients.length === 0}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-4.5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Project</span>
        </button>
      </div>

      {clients.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
          <span>You need at least 1 client before you can create a project.</span>
        </div>
      )}

      {/* Main Layout: Projects List and Selected Project Task Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Cards Grid */}
        <div className={selectedProject ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {loading ? (
            <div className="text-center py-12 text-stone-400 text-sm">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
              <FolderKanban className="w-12 h-12 text-amber-400/60 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-stone-900">No projects created yet</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Create a project to begin tracking tasks, real-time hours, and budget consumption.
              </p>
            </div>
          ) : (
            <div className={`grid gap-4 ${selectedProject ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {projects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                const pct = proj.burn_rate_percent || 0;
                const isOver = pct >= 100;
                const isWarn = pct >= 80 && pct < 100;

                return (
                  <div
                    key={proj.id}
                    className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-sm relative ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/10'
                        : 'border-stone-200/90 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {proj.client_name}
                          </span>
                          <h3 className="text-base font-bold text-stone-900 mt-1.5 line-clamp-1">
                            {proj.name}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            proj.status === 'completed'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-orange-50 text-orange-800 border border-orange-200'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-xs text-stone-500 mt-2 line-clamp-2">{proj.description}</p>
                      )}

                      {/* Burn Rate Progress Bar */}
                      <div className="mt-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-stone-600 font-medium">Budget Burn Rate</span>
                          <span
                            className={`font-bold font-mono ${
                              isOver
                                ? 'text-red-600'
                                : isWarn
                                ? 'text-orange-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver
                                ? 'bg-gradient-to-r from-red-600 to-rose-500'
                                : isWarn
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-amber-400 to-amber-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                          <span className="text-stone-900 font-bold">${Number(proj.spent_amount || 0).toLocaleString()} spent</span>
                          <span>Budget: ${Number(proj.budget || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Metadata: deadline & tasks */}
                      <div className="mt-3.5 flex items-center justify-between text-xs text-stone-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{Number(proj.total_hours_logged || 0).toFixed(1)} hrs logged</span>
                        </span>

                        {proj.deadline && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" />
                            <span>Due {proj.deadline}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <button
                        onClick={() => handleSelectProject(proj)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md shadow-orange-500/20'
                            : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        <ListTodo className="w-3.5 h-3.5 text-amber-500" />
                        <span>Tasks ({proj.completed_tasks || 0}/{proj.total_tasks || 0})</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() =>
                            onStartStopwatch({
                              projectId: proj.id,
                              projectName: proj.name,
                              description: `Working on ${proj.name}`,
                            })
                          }
                          title="Start timer for this project"
                          className="p-1.5 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-stone-100 transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => openEditProjectModal(proj)}
                          className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition"
                          title="Edit project"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Task Management Drawer */}
        {selectedProject && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xl flex flex-col h-fit sticky top-20">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700">
                  Tasks for Project
                </span>
                <h3 className="text-base font-bold text-stone-900 line-clamp-1">
                  {selectedProject.name}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="mt-4 space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {tasksLoading ? (
                <div className="text-center py-8 text-xs text-stone-400">Loading tasks...</div>
              ) : projectTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">
                  No tasks added yet for this project.
                </div>
              ) : (
                projectTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                        isDone
                          ? 'bg-stone-50 border-stone-200/60 opacity-60'
                          : 'bg-stone-50 border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`w-4 h-4 rounded flex items-center justify-center transition shrink-0 ${
                            isDone
                              ? 'bg-amber-500 text-white'
                              : 'border border-amber-400 hover:border-amber-500'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-medium truncate ${
                              isDone ? 'line-through text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 font-mono">
                            {t.due_date && <span>Due: {t.due_date}</span>}
                            {t.estimated_hours > 0 && <span>Est: {t.estimated_hours}h</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() =>
                            onStartStopwatch({
                              projectId: selectedProject.id,
                              projectName: selectedProject.name,
                              taskId: t.id,
                              taskTitle: t.title,
                              description: `Working on: ${t.title}`,
                            })
                          }
                          title="Start timer for this task"
                          className="p-1 text-amber-600 hover:text-amber-800 rounded hover:bg-stone-200/60 transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-stone-200/60 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900 font-heading">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Assign to Client *
                </label>
                <select
                  required
                  value={projectFormData.client_id}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, client_id: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="">Select a Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} - ${c.default_hourly_rate}/hr
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign & SEO"
                  value={projectFormData.name}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, name: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief scope of work..."
                  value={projectFormData.description}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, description: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Budget ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={projectFormData.budget}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, budget: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
                  <select
                    value={projectFormData.status}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, status: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={projectFormData.deadline}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, deadline: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900 font-heading">
                Add Task for {selectedProject?.name}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user login & sessions"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskFormData.due_date}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, due_date: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={taskFormData.estimated_hours}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, estimated_hours: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2 rounded-xl shadow-md shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
