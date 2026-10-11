import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Download,
  Printer,
  CheckCircle,
  Clock,
  Sparkles,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function InvoiceTemplateModal({ invoice, onClose, onStatusUpdated }) {
  const { user, togglePlan } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  if (!invoice) return null;

  async function handleDownloadPdf() {
    setDownloadError('');
    setIsDownloading(true);

    try {
      const blob = await api.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.data && err.data.upgradeRequired) {
        setDownloadError(
          'PDF Invoicing is a Pro Feature. Please upgrade your account to Pro (top right) to download official PDF invoices!'
        );
      } else {
        setDownloadError(err.message || 'Failed to download PDF invoice');
      }
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleToggleStatus() {
    const nextStatus = invoice.status === 'paid' ? 'pending' : 'paid';
    try {
      await api.updateInvoiceStatus(invoice.id, nextStatus);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message);
    }
  }

  const items = invoice.items || [];
  const isPaid = invoice.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/50 backdrop-blur-md overflow-y-auto">
      <div className="bg-white border border-stone-200/90 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto">
        {/* Top Control Bar: Light Refined / Gold */}
        <div className="px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-white rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-bold text-stone-900 font-heading">
              Invoice #{invoice.invoice_number}
            </h2>
            <button
              onClick={handleToggleStatus}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition ${
                isPaid
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-orange-100 text-orange-800 border border-orange-300'
              }`}
            >
              {isPaid ? <CheckCircle className="w-3.5 h-3.5 text-amber-600" /> : <Clock className="w-3.5 h-3.5 text-orange-600" />}
              <span className="capitalize">{invoice.status} (Click to toggle)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-stone-200 transition"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 stroke-[3]" />
              <span>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            {user?.plan === 'free' && (
              <button
                onClick={async () => {
                  await togglePlan('pro');
                  setDownloadError('');
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-3 py-1.5 rounded-xl text-[11px] shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        )}

        {/* Invoice Document Body: Crisp White with Gold, Orange & Obsidian accents */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-stone-800 rounded-b-3xl" id="printable-invoice">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-stone-200 pb-8">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tight text-stone-900 font-heading">
                  FREELANCEFLOW
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded border border-amber-300">
                  Verified Invoice
                </span>
              </div>
              <div className="mt-3 text-xs text-stone-600 space-y-0.5">
                <p className="font-bold text-stone-900">{invoice.user_name || 'Independent Professional'}</p>
                <p>{invoice.user_email || 'alex.freelancer@persevex.io'}</p>
                <p>Digital Engineering & Consulting Services</p>
              </div>
            </div>

            <div className="sm:text-right">
              <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight font-heading">
                INVOICE
              </h1>
              <p className="text-xs font-mono font-semibold text-stone-500 mt-1">
                #{invoice.invoice_number}
              </p>
              <div
                className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  isPaid ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-orange-100 text-orange-900 border border-orange-300'
                }`}
              >
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Addresses and Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8 text-xs">
            <div>
              <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider block mb-2">
                Billed To
              </span>
              <p className="font-bold text-stone-900 text-sm">{invoice.client_name}</p>
              {invoice.client_company && (
                <p className="text-stone-700 font-semibold">{invoice.client_company}</p>
              )}
              {invoice.client_email && <p className="text-stone-500">{invoice.client_email}</p>}
              {invoice.client_address && (
                <p className="text-stone-500 mt-1">{invoice.client_address}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider block mb-2">
                Payment Details
              </span>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-900">Payment Term:</span> Net 14 Days
              </p>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-900">Method:</span> Direct Wire / Stripe
              </p>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-900">Currency:</span> USD ($)
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-bold text-stone-400 uppercase text-[10px] tracking-wider block mb-2">
                Timeline
              </span>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-900">Issue Date:</span> {invoice.issue_date}
              </p>
              <p className="text-stone-600">
                <span className="font-semibold text-stone-900">Due Date:</span> {invoice.due_date}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden mb-8 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900 text-amber-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">Item / Service Description</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Hours</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">
                      No line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'}>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">
                          {item.project_name || 'Project Service'}
                        </div>
                        <div className="text-stone-500 text-[11px]">
                          {item.task_title || item.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-500">{item.date || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        {Number(item.hours || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-500">
                        ${Number(item.rate || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        ${Number(item.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
              <span className="font-bold text-stone-900 uppercase text-[10px] tracking-wider block mb-1">
                Notes & Terms
              </span>
              <p className="text-stone-600 leading-relaxed">
                {invoice.notes ||
                  'Thank you for your business. Please remit payment via bank transfer or credit card on or before the due date.'}
              </p>
            </div>

            <div className="space-y-2 text-right">
              <div className="flex justify-between py-1 text-stone-600 border-b border-stone-100">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between py-1 text-stone-600 border-b border-stone-100">
                  <span>Tax ({invoice.tax_rate}%):</span>
                  <span className="font-mono font-semibold">
                    ${Number(invoice.tax_amount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 text-base font-bold text-stone-900 border-t-2 border-stone-900">
                <span>Total Due:</span>
                <span className="font-mono text-amber-600 font-black text-lg">
                  ${Number(invoice.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-stone-200 text-center text-[10px] text-stone-400">
            FreelanceFlow SaaS — Empowering Independent Professionals Worldwide.
          </div>
        </div>
      </div>
    </div>
  );
}
