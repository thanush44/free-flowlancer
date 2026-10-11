import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import InvoiceTemplateModal from './InvoiceTemplateModal';
import {
  FileText,
  Plus,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  ChevronRight,
  X,
  Filter,
} from 'lucide-react';

export default function InvoicesView({ setActiveTab }) {
  const { user, togglePlan } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Selected invoice for preview modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Invoice Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardClientId, setWizardClientId] = useState('');
  const [wizardStartDate, setWizardStartDate] = useState('');
  const [wizardEndDate, setWizardEndDate] = useState('');
  const [unbilledLogs, setUnbilledLogs] = useState([]);
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState(
    'Payment is requested within 14 days of issue via Bank Transfer or Stripe.'
  );

  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('ff_time_logged', handleRefresh);
    return () => window.removeEventListener('ff_time_logged', handleRefresh);
  }, []);

  async function loadData() {
    try {
      const [invRes, clientsRes] = await Promise.all([
        api.getInvoices(),
        api.getClients(),
      ]);
      setInvoices(invRes.invoices || []);
      setClients(clientsRes.clients || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }

  function openWizard() {
    setWizardStep(1);
    setWizardClientId(clients[0]?.id || '');
    setWizardStartDate('');
    setWizardEndDate('');
    setUnbilledLogs([]);
    setSelectedLogIds([]);
    setTaxRate(0);
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setWizardError('');
    setIsWizardOpen(true);
  }

  async function fetchUnbilledForWizard() {
    if (!wizardClientId) {
      setWizardError('Please select a client to bill');
      return;
    }

    setWizardLoading(true);
    setWizardError('');
    try {
      const res = await api.getUnbilledLogs(
        wizardClientId,
        wizardStartDate || undefined,
        wizardEndDate || undefined
      );

      setUnbilledLogs(res.items || []);
      setSelectedLogIds((res.items || []).map((i) => i.id));
      setWizardStep(2);
    } catch (err) {
      setWizardError(err.message || 'Failed to fetch unbilled time logs');
    } finally {
      setWizardLoading(false);
    }
  }

  function toggleLogSelection(id) {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter((item) => item !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  }

  function selectAllLogs() {
    if (selectedLogIds.length === unbilledLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(unbilledLogs.map((i) => i.id));
    }
  }

  const selectedItems = unbilledLogs.filter((l) => selectedLogIds.includes(l.id));
  const wizardSubtotal = selectedItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const wizardTaxAmount = (wizardSubtotal * (parseFloat(taxRate) || 0)) / 100.0;
  const wizardTotalAmount = wizardSubtotal + wizardTaxAmount;

  async function handleCreateInvoice() {
    if (selectedItems.length === 0) {
      setWizardError('Please select at least 1 time log to invoice');
      return;
    }

    setIsSubmitting(true);
    setWizardError('');

    try {
      const payload = {
        client_id: wizardClientId,
        invoice_number: invoiceNumber,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate,
        tax_rate: parseFloat(taxRate) || 0,
        notes,
        items: selectedItems,
        log_ids: selectedLogIds,
      };

      const res = await api.createInvoice(payload);
      setIsWizardOpen(false);
      await loadData();
      setSelectedInvoice(res.invoice);
    } catch (err) {
      setWizardError(err.message || 'Failed to generate invoice');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteInvoice(inv) {
    if (
      !window.confirm(
        `Delete Invoice #${inv.invoice_number}? This will revert all associated time logs back to Unbilled status.`
      )
    ) {
      return;
    }
    try {
      await api.deleteInvoice(inv.id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (!filterStatus) return true;
    return inv.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Wizard Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-heading">
              Invoices & Billing Suite
            </h1>
            <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-semibold">
              {invoices.length} Total
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Convert tracked unbilled hours into branded PDF invoices and monitor payment status.
          </p>
        </div>

        <button
          onClick={openWizard}
          disabled={clients.length === 0}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* Filter and Overview Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-stone-200/90 shadow-sm">
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
              filterStatus === ''
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 border border-stone-200'
            }`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
              filterStatus === 'pending'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 border border-stone-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all text-xs ${
              filterStatus === 'paid'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/20'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 border border-stone-200'
            }`}
          >
            Paid
          </button>
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-700 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No invoices found. Click "Generate Invoice" or "Load Sample Data" to begin.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const itemsCount = (inv.items || []).length;

                  return (
                    <tr key={inv.id} className="hover:bg-amber-50/20 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                        #{inv.invoice_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{inv.client_name}</div>
                        {inv.client_company && (
                          <div className="text-[11px] text-amber-700 font-medium">{inv.client_company}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-stone-600">{inv.issue_date}</td>

                      <td className="py-3.5 px-4 font-mono text-orange-700 font-medium">{inv.due_date}</td>

                      <td className="py-3.5 px-4 text-right text-stone-600">
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-600 text-sm">
                        ${Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            isPaid
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-orange-50 text-orange-800 border border-orange-200'
                          }`}
                        >
                          {isPaid ? <CheckCircle className="w-3 h-3 text-amber-600" /> : <Clock className="w-3 h-3 text-orange-600" />}
                          <span>{inv.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-stone-500 hover:text-amber-700 rounded-lg hover:bg-stone-100 transition"
                            title="Preview & Print Invoice"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-stone-500 hover:text-orange-700 rounded-lg hover:bg-stone-100 transition"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-orange-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition"
                            title="Delete invoice (unlocks time logs)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Generator Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-md overflow-y-auto">
          <div className="bg-white border border-stone-200/90 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                  Step {wizardStep} of 2
                </span>
                <h3 className="text-lg font-bold text-stone-900 font-heading">
                  {wizardStep === 1
                    ? 'Create Invoice: Select Client & Scope'
                    : 'Review Billable Time & Details'}
                </h3>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {wizardError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* Step 1: Client & Date Range */}
            {wizardStep === 1 && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Select Client *
                  </label>
                  <select
                    value={wizardClientId}
                    onChange={(e) => setWizardClientId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="">Select a Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} - ${c.default_hourly_rate}/hr
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      From Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={wizardStartDate}
                      onChange={(e) => setWizardStartDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      To Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={wizardEndDate}
                      onChange={(e) => setWizardEndDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p>
                    FreelanceFlow will automatically query all unbilled stopwatch & manual hours
                    logged for this client and format them into itemized billable rows.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-stone-200">
                  <button
                    onClick={fetchUnbilledForWizard}
                    disabled={wizardLoading || !wizardClientId}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>{wizardLoading ? 'Fetching Time Logs...' : 'Next: Review Logs'}</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Unbilled Logs, Invoice Details, and Confirm */}
            {wizardStep === 2 && (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-stone-700">
                      Unbilled Time Logs ({selectedLogIds.length} of {unbilledLogs.length} selected)
                    </label>
                    {unbilledLogs.length > 0 && (
                      <button
                        onClick={selectAllLogs}
                        className="text-[11px] text-amber-600 hover:underline font-semibold"
                      >
                        {selectedLogIds.length === unbilledLogs.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>

                  {unbilledLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                      No unbilled time logs found for this client and date range.
                    </div>
                  ) : (
                    <div className="border border-stone-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-700 text-[10px] uppercase font-bold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-3 w-8"></th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">Hours</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {unbilledLogs.map((log) => {
                            const isSelected = selectedLogIds.includes(log.id);
                            return (
                              <tr
                                key={log.id}
                                onClick={() => toggleLogSelection(log.id)}
                                className={`cursor-pointer transition ${
                                  isSelected ? 'bg-amber-50/80' : 'hover:bg-stone-50'
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="rounded border-stone-300 text-amber-600 focus:ring-0"
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-mono text-stone-500">{log.date}</td>
                                <td className="py-2.5 px-3 truncate max-w-xs text-stone-800 font-medium">
                                  {log.project_name}: {log.description}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900">
                                  {Number(log.hours).toFixed(2)}h
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                                  ${Number(log.amount).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Invoice Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Invoice #
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Notes & Terms
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 focus:bg-white placeholder-stone-400"
                  />
                </div>

                {/* Subtotal & Total Preview */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-stone-600 block font-medium">Subtotal: ${wizardSubtotal.toFixed(2)}</span>
                    {taxRate > 0 && (
                      <span className="text-stone-600 block font-medium">
                        Tax ({taxRate}%): ${wizardTaxAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-amber-700 block uppercase font-bold">
                      Total Invoice Amount
                    </span>
                    <span className="text-lg font-bold text-amber-600 font-mono">
                      ${wizardTotalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleCreateInvoice}
                    disabled={isSubmitting || selectedItems.length === 0}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSubmitting ? 'Creating...' : 'Generate & Lock Invoicing'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Preview & Printable PDF Modal */}
      {selectedInvoice && (
        <InvoiceTemplateModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onStatusUpdated={loadData}
        />
      )}
    </div>
  );
}
