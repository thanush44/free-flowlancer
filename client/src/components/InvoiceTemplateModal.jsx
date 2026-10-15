import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import {
  X,
  Download,
  Printer,
  CheckCircle,
  Clock,
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
          'PDF Invoicing is a Pro Feature. Please switch your plan to Pro (or click the button below) to download official PDF invoices.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal-950/45 backdrop-blur-xs overflow-y-auto">
      <div className="surface-card rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-dropdown border border-charcoal-200 relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-charcoal-200 flex flex-wrap items-center justify-between gap-3 bg-ivory-50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-bold text-charcoal-900 font-heading">
              Invoice #{invoice.invoice_number}
            </h2>
            <button
              onClick={handleToggleStatus}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition cursor-pointer ${
                isPaid ? 'badge-sage' : 'badge-amber'
              }`}
              title="Click to toggle Paid / Pending"
            >
              {isPaid ? <CheckCircle className="w-3.5 h-3.5 text-sage-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
              <span className="capitalize">{invoice.status} &bull; Toggle</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal-800 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-charcoal-200 transition"
            >
              <Printer className="w-3.5 h-3.5 text-charcoal-600" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-1.5 bg-charcoal-900 hover:bg-charcoal-800 text-ivory-50 text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-ivory-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-terracotta-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            {user?.plan === 'free' && (
              <button
                onClick={async () => {
                  await togglePlan('pro');
                  setDownloadError('');
                }}
                className="bg-charcoal-900 hover:bg-charcoal-800 text-ivory-50 font-medium px-3 py-1.5 rounded-xl text-[11px] shadow-sm transition"
              >
                Switch to Pro
              </button>
            )}
          </div>
        )}

        {/* Invoice Document Body: Clean Stationery Styling */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-charcoal-800 rounded-b-2xl" id="printable-invoice">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-charcoal-200 pb-8">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-charcoal-900 font-heading">
                  FREELANCEFLOW
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-ivory-100 text-charcoal-600 px-2 py-0.5 rounded border border-charcoal-200">
                  Verified Statement
                </span>
              </div>
              <div className="mt-3 text-xs text-charcoal-600 space-y-0.5">
                <p className="font-semibold text-charcoal-900">{invoice.user_name || 'Independent Professional'}</p>
                <p>{invoice.user_email || 'alex.freelancer@persevex.io'}</p>
                <p>Digital Engineering & Consulting Services</p>
              </div>
            </div>

            <div className="sm:text-right">
              <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight font-heading">
                INVOICE
              </h1>
              <p className="text-xs font-mono font-semibold text-charcoal-500 mt-1">
                #{invoice.invoice_number}
              </p>
              <div
                className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  isPaid ? 'badge-sage' : 'badge-amber'
                }`}
              >
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Addresses and Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8 text-xs">
            <div>
              <span className="font-bold text-charcoal-400 uppercase text-[10px] tracking-wider block mb-2">
                Billed To
              </span>
              <p className="font-semibold text-charcoal-900 text-sm">{invoice.client_name}</p>
              {invoice.client_company && (
                <p className="text-charcoal-700 font-medium">{invoice.client_company}</p>
              )}
              {invoice.client_email && <p className="text-charcoal-500">{invoice.client_email}</p>}
              {invoice.client_address && (
                <p className="text-charcoal-500 mt-1">{invoice.client_address}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-charcoal-400 uppercase text-[10px] tracking-wider block mb-2">
                Payment Details
              </span>
              <p className="text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Payment Term:</span> Net 14 Days
              </p>
              <p className="text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Method:</span> Direct Wire / Stripe
              </p>
              <p className="text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Currency:</span> INR (₹)
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-bold text-charcoal-400 uppercase text-[10px] tracking-wider block mb-2">
                Timeline
              </span>
              <p className="text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Issue Date:</span> {invoice.issue_date}
              </p>
              <p className="text-charcoal-600">
                <span className="font-semibold text-charcoal-900">Due Date:</span> {invoice.due_date}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-charcoal-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-left text-xs">
              <thead className="bg-charcoal-900 text-ivory-100 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Item / Service Description</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Hours</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100 text-charcoal-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-charcoal-400">
                      No line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-ivory-50/50' : 'bg-white'}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-charcoal-900">
                          {item.project_name || 'Project Service'}
                        </div>
                        <div className="text-charcoal-500 text-[11px]">
                          {item.task_title || item.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-charcoal-500">{item.date || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-charcoal-800">
                        {Number(item.hours || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-charcoal-500">
                        {formatINR(item.rate || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-charcoal-900">
                        {formatINR(item.amount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="p-4 bg-ivory-50 rounded-xl border border-charcoal-200">
              <span className="font-bold text-charcoal-800 uppercase text-[10px] tracking-wider block mb-1">
                Notes & Terms
              </span>
              <p className="text-charcoal-600 leading-relaxed">
                {invoice.notes ||
                  'Thank you for your business. Please remit payment via bank transfer or credit card on or before the due date.'}
              </p>
            </div>

            <div className="space-y-2 text-right">
              <div className="flex justify-between py-1 text-charcoal-600 border-b border-charcoal-100">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">{formatINR(invoice.subtotal || 0)}</span>
              </div>
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between py-1 text-charcoal-600 border-b border-charcoal-100">
                  <span>Tax ({invoice.tax_rate}%):</span>
                  <span className="font-mono font-semibold">
                    {formatINR(invoice.tax_amount || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 text-base font-bold text-charcoal-900 border-t-2 border-charcoal-900">
                <span>Total Due:</span>
                <span className="font-mono font-extrabold text-charcoal-900 text-lg">
                  {formatINR(invoice.total_amount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-charcoal-200 text-center text-[11px] text-charcoal-400">
            FreelanceFlow &bull; Professional Freelancer Workspace
          </div>
        </div>
      </div>
    </div>
  );
}
