import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  DollarSign,
  Briefcase,
  Clock,
  Sparkles,
  AlertCircle,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';

export default function ClientsView({ setActiveTab }) {
  const { user, togglePlan } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [freemiumNotice, setFreemiumNotice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    default_hourly_rate: 65,
    address: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const res = await api.getClients();
      setClients(res.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    // Client-side quick check for Freemium limit
    if (user?.plan === 'free' && clients.length >= 2) {
      setFreemiumNotice(
        'You have reached the Free Tier limit (Max 2 Clients). Upgrade to Pro to add unlimited clients and unlock PDF invoicing!'
      );
      return;
    }

    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      default_hourly_rate: user?.hourly_rate || 65,
      address: '',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(client) {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      default_hourly_rate: client.default_hourly_rate || 65,
      address: client.address || '',
      notes: client.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formData);
      } else {
        await api.createClient(formData);
      }
      setIsModalOpen(false);
      await loadClients();
    } catch (err) {
      if (err.data && err.data.limitReached) {
        setFreemiumNotice(err.data.error);
        setIsModalOpen(false);
      } else {
        setFormError(err.message || 'Failed to save client');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(client) {
    if (!window.confirm(`Are you sure you want to delete client "${client.name}"? This will delete associated projects and logs.`)) {
      return;
    }
    try {
      await api.deleteClient(client.id);
      await loadClients();
    } catch (err) {
      alert(err.message || 'Failed to delete client');
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-heading">Clients CRM</h1>
            <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-semibold">
              {clients.length} {clients.length === 1 ? 'Client' : 'Clients'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Manage your client directory, hourly billing rates, and unbilled work balances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Plan limit indicator */}
          {user?.plan === 'free' && (
            <div className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Free Tier: {clients.length}/2 Clients</span>
            </div>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-4.5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Client</span>
          </button>
        </div>
      </div>

      {/* Freemium Limit Alert Modal / Banner */}
      {freemiumNotice && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 border border-amber-300 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900">Unlock Unlimited Clients with Pro</h4>
              <p className="text-xs text-stone-600 mt-0.5">{freemiumNotice}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={async () => {
                await togglePlan('pro');
                setFreemiumNotice(null);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md shadow-orange-500/25 transition-all hover:scale-105"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={() => setFreemiumNotice(null)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
        <input
          type="text"
          placeholder="Search by client name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 text-stone-900 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-amber-500 shadow-sm placeholder-stone-400"
        />
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Loading client directory...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <Users className="w-12 h-12 text-amber-400/60 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-900">No clients found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Get started by adding your first client or use "Load Sample Data" to explore.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center space-x-1.5 text-xs text-amber-600 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add your first client</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-stone-200/90 p-5 hover:border-amber-400 transition flex flex-col justify-between shadow-sm group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-600 transition line-clamp-1">
                      {client.name}
                    </h3>
                    {client.company && (
                      <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-amber-500" />
                        <span>{client.company}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-300">
                    ${client.default_hourly_rate}/hr
                  </span>
                </div>

                {/* Contact metadata */}
                <div className="mt-4 space-y-1.5 text-xs text-stone-500">
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate text-stone-800 font-medium">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-stone-700">{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Metrics pill */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-stone-100 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Projects</span>
                    <span className="font-semibold text-stone-800">
                      {client.active_projects || 0} active ({client.total_projects || 0} total)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Unbilled Work</span>
                    <span className="font-semibold text-amber-600">
                      ${Number(client.unbilled_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-amber-700 hover:text-amber-900 flex items-center gap-1.5 transition font-semibold"
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                  <span>View Projects</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition"
                    title="Edit client"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition"
                    title="Delete client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900 font-heading">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Cyberdyne Systems"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Default Rate ($/hr) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.default_hourly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, default_hourly_rate: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, Country"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
