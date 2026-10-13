import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  FolderKanban,
  Plus,
  Play,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  X,
  ListTodo,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function ProjectsView({ onStartStopwatch }) {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
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

  async function confirmDeleteProject() {
    if (!projectToDelete) return;
    try {
      await api.deleteProject(projectToDelete.id);
      if (selectedProject?.id === projectToDelete.id) setSelectedProject(null);
      setProjectToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete project');
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
            <h2 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight font-heading">
              Projects & Deliverables
            </h2>
            <span className="text-[11px] font-mono bg-[#f7f4ee] text-[#57534e] px-2.5 py-0.5 rounded-md border border-[#e8e1d3] font-semibold">
              {projects.length} Total
            </span>
          </div>
          <p className="text-xs text-[#78716c] mt-1">
            Track business deliverables, task hierarchies, and automatic budget burn rates.
          </p>
        </div>

        <button
          onClick={openCreateProjectModal}
          disabled={clients.length === 0}
          className="inline-flex items-center space-x-1.5 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {clients.length === 0 && (
        <div className="p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-xs flex items-center justify-between">
          <span>You need at least 1 client before you can create a project.</span>
        </div>
      )}

      {/* Main Layout: Projects List and Selected Project Task Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Cards Grid */}
        <div className={selectedProject ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {loading ? (
            <div className="text-center py-12 text-[#78716c] text-xs">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-[#e8e1d3] p-8 shadow-subtle">
              <FolderKanban className="w-10 h-10 text-[#a8a29e] mx-auto mb-2.5 opacity-80" />
              <h3 className="text-sm font-semibold text-[#1c1917]">No projects created yet</h3>
              <p className="text-xs text-[#78716c] mt-1 max-w-sm mx-auto">
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
                    className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-subtle relative ${
                      isSelected
                        ? 'border-[#b45309] ring-1 ring-[#b45309]/30 bg-[#fdfcf9]'
                        : 'border-[#e8e1d3] hover:border-[#c2b6a3]'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#78716c] bg-[#f7f4ee] px-2 py-0.5 rounded-md border border-[#e8e1d3]">
                            {proj.client_name}
                          </span>
                          <h3 className="text-sm font-bold text-[#1c1917] mt-1.5 truncate">
                            {proj.name}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md capitalize shrink-0 ${
                            proj.status === 'completed'
                              ? 'bg-[#f4f7f4] text-[#304434] border border-[#cedece]'
                              : 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-xs text-[#78716c] mt-2 line-clamp-2">{proj.description}</p>
                      )}

                      {/* Burn Rate Progress Bar */}
                      <div className="mt-3.5 p-3 rounded-xl bg-[#f7f4ee] border border-[#e8e1d3]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#57534e] font-medium text-[11px]">Budget Burn Rate</span>
                          <span
                            className={`font-bold font-mono text-xs ${
                              isOver
                                ? 'text-[#c05638]'
                                : isWarn
                                ? 'text-[#d97706]'
                                : 'text-[#4d6b53]'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div className="w-full bg-[#e8e1d3] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver
                                ? 'bg-[#c05638]'
                                : isWarn
                                ? 'bg-[#d97706]'
                                : 'bg-[#4d6b53]'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#78716c] font-mono">
                          <span className="text-[#1c1917] font-semibold">${Number(proj.spent_amount || 0).toLocaleString()} spent</span>
                          <span>Budget: ${Number(proj.budget || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Metadata: deadline & tasks */}
                      <div className="mt-3 flex items-center justify-between text-xs text-[#78716c]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#a8a29e]" />
                          <span className="font-mono text-[11px]">{Number(proj.total_hours_logged || 0).toFixed(1)} hrs</span>
                        </span>

                        {proj.deadline && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#92400e]">
                            <Calendar className="w-3.5 h-3.5 text-[#b45309]" />
                            <span>Due {proj.deadline}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[#f4efe6] flex items-center justify-between">
                      <button
                        onClick={() => handleSelectProject(proj)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-[#1c1917] text-white shadow-subtle'
                            : 'bg-[#f7f4ee] text-[#44403c] hover:bg-[#efe9de] border border-[#e8e1d3]'
                        }`}
                      >
                        <ListTodo className="w-3.5 h-3.5 text-[#b45309]" />
                        <span>Tasks ({proj.completed_tasks || 0}/{proj.total_tasks || 0})</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            onStartStopwatch({
                              projectId: proj.id,
                              projectName: proj.name,
                              description: `Working on ${proj.name}`,
                            })
                          }
                          title="Start stopwatch for this project"
                          className="p-1.5 text-[#4d6b53] hover:text-[#3d5642] rounded-lg hover:bg-[#f4f7f4] transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => openEditProjectModal(proj)}
                          className="p-1.5 text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f7f4ee] transition"
                          title="Edit project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProjectToDelete(proj)}
                          className="p-1.5 text-[#78716c] hover:text-[#c05638] rounded-lg hover:bg-[#fdf6f4] transition"
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
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#e8e1d3] p-5 shadow-dropdown flex flex-col h-fit sticky top-24">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e8e1d3]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#b45309]">
                  Tasks for Project
                </span>
                <h3 className="text-sm font-bold text-[#1c1917] line-clamp-1">
                  {selectedProject.name}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-[#78716c] hover:text-[#1c1917] p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="mt-3.5 space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {tasksLoading ? (
                <div className="text-center py-8 text-xs text-[#78716c]">Loading tasks...</div>
              ) : projectTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#78716c]">
                  No tasks added yet for this project.
                </div>
              ) : (
                projectTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                        isDone
                          ? 'bg-[#f7f4ee] border-[#e8e1d3] opacity-60'
                          : 'bg-white border-[#e8e1d3] hover:border-[#c2b6a3]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`w-4 h-4 rounded flex items-center justify-center transition shrink-0 ${
                            isDone
                              ? 'bg-[#4d6b53] text-white'
                              : 'border border-[#e8e1d3] hover:border-[#4d6b53]'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-medium truncate ${
                              isDone ? 'line-through text-[#a8a29e]' : 'text-[#1c1917]'
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#78716c] mt-0.5 font-mono">
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
                          className="p-1 text-[#4d6b53] hover:text-[#3d5642] rounded hover:bg-[#f4f7f4] transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1 text-[#78716c] hover:text-[#c05638] rounded hover:bg-[#fdf6f4] transition"
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

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm">
          <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-md p-6 shadow-dropdown relative">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] flex items-center justify-center text-[#c05638] shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1c1917] font-heading">
                  Delete Project "{projectToDelete.name}"?
                </h3>
                <p className="text-xs text-[#78716c] mt-1 leading-relaxed">
                  Deleting this project will permanently remove all associated tasks and work logs. This operation cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 pt-3 border-t border-[#e8e1d3]">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#57534e] hover:text-[#1c1917] rounded-xl hover:bg-[#efe9de] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#c05638] hover:bg-[#a74328] rounded-xl shadow-subtle transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm">
          <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-lg p-6 shadow-dropdown relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e8e1d3]">
              <h3 className="text-base font-bold text-[#1c1917] font-heading">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-[#78716c] hover:text-[#1c1917] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3.5 p-3 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] text-[#86341f] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#c05638]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleProjectSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Assign to Client *
                </label>
                <select
                  required
                  value={projectFormData.client_id}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, client_id: e.target.value })
                  }
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309]"
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
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign & Technical SEO"
                  value={projectFormData.name}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, name: e.target.value })
                  }
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief scope of deliverable..."
                  value={projectFormData.description}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, description: e.target.value })
                  }
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
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
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Status</label>
                  <select
                    value={projectFormData.status}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, status: e.target.value })
                    }
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309]"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={projectFormData.deadline}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, deadline: e.target.value })
                    }
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e8e1d3]">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#57534e] hover:text-[#1c1917] rounded-xl hover:bg-[#efe9de] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm">
          <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-md p-6 shadow-dropdown">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e8e1d3]">
              <h3 className="text-sm font-bold text-[#1c1917] font-heading">
                Add Task for {selectedProject?.name}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-[#78716c] hover:text-[#1c1917] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user login & sessions"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskFormData.due_date}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, due_date: e.target.value })
                    }
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
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
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e8e1d3]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#57534e] hover:text-[#1c1917] rounded-xl hover:bg-[#efe9de]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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

