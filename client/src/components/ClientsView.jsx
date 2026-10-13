import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  Briefcase,
  Sparkles,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Search,
} from 'lucide-react';

export default function ClientsView({ setActiveTab }) {
  const { user, togglePlan } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [freemiumNotice, setFreemiumNotice] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
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
        'You have reached the Free Tier limit (Max 2 Clients). Switch to Pro to add unlimited clients and unlock verified PDF invoicing!'
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

  async function confirmDeleteClient() {
    if (!clientToDelete) return;
    try {
      await api.deleteClient(clientToDelete.id);
      setClientToDelete(null);
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
            <h2 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight font-heading">
              Clients CRM & Directory
            </h2>
            <span className="text-[11px] font-mono bg-[#f7f4ee] text-[#57534e] px-2.5 py-0.5 rounded-md border border-[#e8e1d3] font-semibold">
              {clients.length} {clients.length === 1 ? 'Client' : 'Clients'}
            </span>
          </div>
          <p className="text-xs text-[#78716c] mt-1">
            Directory of active clients, contract billing rates, and unbilled account balances.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Plan limit indicator */}
          {user?.plan === 'free' && (
            <div className="text-xs bg-[#fffbeb] text-[#92400e] border border-[#fde68a] px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-[#b45309]" />
              <span>Free Tier: {clients.length}/2 Clients</span>
            </div>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-1.5 bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Client</span>
          </button>
        </div>
      </div>

      {/* Freemium Limit Alert Banner */}
      {freemiumNotice && (
        <div className="bg-[#fffbeb] border border-[#fde68a] p-4 rounded-2xl flex items-start justify-between gap-4 shadow-subtle">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-[#fef3c7] rounded-xl text-[#92400e] border border-[#fde68a] mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1c1917]">Unlock Unlimited Clients with Pro</h4>
              <p className="text-xs text-[#78716c] mt-0.5">{freemiumNotice}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={async () => {
                await togglePlan('pro');
                setFreemiumNotice(null);
              }}
              className="bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-subtle transition-all"
            >
              Switch to Pro
            </button>
            <button
              onClick={() => setFreemiumNotice(null)}
              className="text-[#78716c] hover:text-[#1c1917] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]" />
        <input
          type="text"
          placeholder="Filter by name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-[#b45309] shadow-subtle placeholder-[#a8a29e]"
        />
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#78716c] text-xs">Loading client directory...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-[#e8e1d3] p-8 shadow-subtle">
          <Users className="w-10 h-10 text-[#a8a29e] mx-auto mb-2.5 opacity-80" />
          <h3 className="text-sm font-semibold text-[#1c1917]">No clients found</h3>
          <p className="text-xs text-[#78716c] mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No clients match your filter criteria.' : 'Get started by adding your first client or use "Sample Data" to explore.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-3.5 inline-flex items-center space-x-1.5 text-xs text-[#b45309] font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add your first client</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-[#e8e1d3] p-5 hover:border-[#c2b6a3] transition flex flex-col justify-between shadow-subtle group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#1c1917] group-hover:text-[#b45309] transition truncate">
                      {client.name}
                    </h3>
                    {client.company && (
                      <p className="text-[11px] text-[#78716c] flex items-center gap-1 mt-0.5 truncate">
                        <Building className="w-3 h-3 text-[#a8a29e] shrink-0" />
                        <span className="truncate">{client.company}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#f7f4ee] text-[#1c1917] border border-[#e8e1d3] shrink-0">
                    ${client.default_hourly_rate}/hr
                  </span>
                </div>

                {/* Contact metadata */}
                <div className="mt-3.5 space-y-1 text-xs text-[#57534e]">
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#a8a29e] shrink-0" />
                      <span className="truncate text-[#1c1917] font-medium">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#a8a29e] shrink-0" />
                      <span className="text-[#57534e] font-mono text-[11px]">{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Metrics pill */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-[#f4efe6] text-xs">
                  <div>
                    <span className="text-[10px] text-[#a8a29e] block uppercase font-medium">Projects</span>
                    <span className="font-semibold text-[#1c1917]">
                      {client.active_projects || 0} active ({client.total_projects || 0} total)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a8a29e] block uppercase font-medium">Unbilled Balance</span>
                    <span className="font-semibold text-[#b45309] font-mono">
                      ${Number(client.unbilled_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-[#f4efe6] flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-[#b45309] hover:text-[#78350f] flex items-center gap-1.5 transition font-medium"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#b45309]" />
                  <span>Projects</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(client)}
                    className="p-1.5 text-[#78716c] hover:text-[#1c1917] rounded-lg hover:bg-[#f7f4ee] transition"
                    title="Edit client"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setClientToDelete(client)}
                    className="p-1.5 text-[#78716c] hover:text-[#c05638] rounded-lg hover:bg-[#fdf6f4] transition"
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

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm">
          <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-md p-6 shadow-dropdown relative">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] flex items-center justify-center text-[#c05638] shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1c1917] font-heading">
                  Delete Client "{clientToDelete.name}"?
                </h3>
                <p className="text-xs text-[#78716c] mt-1 leading-relaxed">
                  Deleting this client will also delete their associated deliverables, tasks, and unbilled work records. This operation cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 pt-3 border-t border-[#e8e1d3]">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#57534e] hover:text-[#1c1917] rounded-xl hover:bg-[#efe9de] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#c05638] hover:bg-[#a74328] rounded-xl shadow-subtle transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/40 backdrop-blur-sm">
          <div className="bg-[#fbf9f5] border border-[#e8e1d3] rounded-2xl w-full max-w-lg p-6 shadow-dropdown relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e8e1d3]">
              <h3 className="text-base font-bold text-[#1c1917] font-heading">
                {editingClient ? 'Edit Client Details' : 'Add New Client'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#78716c] hover:text-[#1c1917] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3.5 p-3 rounded-xl bg-[#fdf6f4] border border-[#f5d3ca] text-[#86341f] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#c05638]" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">
                  Full Name / Contact Person *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Cyberdyne Systems"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Default Hourly Rate ($/hr) *
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
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403c] mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, Country"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-[#e8e1d3] text-[#1c1917] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#b45309] placeholder-[#a8a29e]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#e8e1d3]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#57534e] hover:text-[#1c1917] rounded-xl hover:bg-[#efe9de] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#4d6b53] hover:bg-[#3d5642] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-subtle hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
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

