import React, { useState } from 'react';
import { Receipt, Plus, Search, DollarSign, Download, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { Invoice } from '../../types/crm';
import { updateInvoice } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';
import { TaxInvoiceModal } from './TaxInvoiceModal';

interface BillingViewProps {
  invoices: Invoice[];
  onOpenQuickCreate: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  invoices,
  onOpenQuickCreate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeInvoiceForView, setActiveInvoiceForView] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.companyName.toLowerCase().includes(q) ||
      inv.service.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

  const outstandingRevenue = invoices
    .filter((inv) => inv.status === 'Sent' || inv.status === 'Generated')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

  const handleMarkPaid = async (inv: Invoice) => {
    const utr = prompt('Enter Bank Payment UTR / Transaction Reference:', `UTR-${Date.now()}`);
    if (utr) {
      await updateInvoice(inv.id, {
        status: 'Paid',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentReference: utr,
      });
    }
  };

  const getStatusVariant = (st: Invoice['status']) => {
    switch (st) {
      case 'Paid':
        return 'emerald';
      case 'Sent':
        return 'blue';
      case 'Overdue':
        return 'red';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Collected Revenue</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">₹{totalRevenue.toLocaleString()}</span>
          <span className="text-xs text-emerald-600 font-medium">Cleared in bank account</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Outstanding Due</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">₹{outstandingRevenue.toLocaleString()}</span>
          <span className="text-xs text-amber-600 font-medium">Awaiting remittance</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">GST Filed (Current Q)</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">18% Compliant</span>
          <span className="text-xs text-zinc-500">CGST + SGST registered</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Invoices Issued</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">{invoices.length}</span>
          <span className="text-xs text-zinc-500">All fiscal periods</span>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoices by number, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <button
          onClick={onOpenQuickCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Tax Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Billed Company</th>
              <th className="py-3 px-4">Service Description</th>
              <th className="py-3 px-4">Taxable Value</th>
              <th className="py-3 px-4">Total (w/ 18% GST)</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-zinc-50/80 transition">
                <td className="py-3 px-4 font-mono font-semibold text-zinc-900">{inv.invoiceNumber}</td>
                <td className="py-3 px-4 font-medium text-zinc-900">{inv.companyName}</td>
                <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{inv.service}</td>
                <td className="py-3 px-4 text-zinc-600 font-mono">₹{inv.taxableValue.toLocaleString()}</td>
                <td className="py-3 px-4 font-semibold text-zinc-900 font-mono">
                  ₹{inv.total.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-zinc-500">{inv.dueDate}</td>
                <td className="py-3 px-4">
                  <Badge variant={getStatusVariant(inv.status)}>{inv.status}</Badge>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  {inv.status !== 'Paid' && (
                    <button
                      onClick={() => handleMarkPaid(inv)}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-medium transition cursor-pointer"
                    >
                      Record Payment
                    </button>
                  )}
                  <button
                    onClick={() => setActiveInvoiceForView(inv)}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[11px] font-medium transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                    title="View, customize, print and download official GST tax / proforma invoice PDF"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>View Bill</span>
                  </button>
                  <a
                    href={`/api/invoices/download-pdf?${new URLSearchParams({
                      invoiceNumber: inv.invoiceNumber,
                      companyName: inv.companyName,
                      service: inv.service,
                      taxableValue: String(inv.taxableValue),
                      total: String(inv.total),
                      cgst: String(inv.cgst || 0),
                      sgst: String(inv.sgst || 0),
                      igst: String(inv.igst || 0),
                      invoiceDate: inv.invoiceDate,
                      dueDate: inv.dueDate,
                    }).toString()}`}
                    download={`${inv.invoiceNumber}.pdf`}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium transition cursor-pointer inline-flex items-center gap-1"
                    title="Instantly download PDF without opening preview"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Download PDF</span>
                  </a>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs">
                  No invoices created. Click "Create Tax Invoice" or "Load Demo" to populate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Official Force Power Infotech Tax / Proforma Invoice Modal */}
      <TaxInvoiceModal
        invoice={activeInvoiceForView}
        isOpen={Boolean(activeInvoiceForView)}
        onClose={() => setActiveInvoiceForView(null)}
      />
    </div>
  );
};
