import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { transactionsApi } from '../lib/api.ts';
import { Transaction } from '../types.js';
import { 
  Search, ArrowUpDown, Trash2, Download, Filter, FileText, Calendar, AlertCircle, RefreshCw 
} from 'lucide-react';

export const TransactionsScreen: React.FC = () => {
  const { formatAmount, refreshSharedData } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const categories = [
    'All',
    // Expense Categories
    'Food', 'Shopping', 'Bills', 'Transport', 'Fuel', 'Medical', 'Education', 
    'Entertainment', 'Travel', 'Investment', 'Insurance', 'Rent', 'EMI', 'Business',
    // Income Categories
    'Salary', 'Pocket Money', 'Investment Returns', 'Business Income', 'Freelance/Side Hustle', 'Gifts/Grants', 'Refund/Reimbursement',
    'Others'
  ];

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await transactionsApi.list();
      setTransactions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeleteId(null);
      await refreshSharedData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction.');
    }
  };

  // ==========================================================================
  // EXPORT UTILITIES (CSV & EXCEL COMMA COMPATIBLE)
  // ==========================================================================
  const exportToCSV = () => {
    if (transactions.length === 0) return;

    // Set CSV columns
    const headers = ['Transaction ID', 'Type', 'Amount', 'Category', 'Description', 'Date', 'Payment Method', 'Recurring'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount.toString(),
      t.category,
      `"${t.description.replace(/"/g, '""')}"`, // escape quotes
      t.date,
      t.paymentMethod,
      t.isRecurring ? 'Yes' : 'No'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rupio_Statement_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcelText = () => {
    if (transactions.length === 0) return;

    // Excel friendly tab-separated values download
    const headers = ['ID', 'Type', 'Amount', 'Category', 'Description', 'Date', 'Payment', 'Is Recurring'];
    const rows = transactions.map(t => [
      t.id,
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      t.category,
      t.description,
      t.date,
      t.paymentMethod.toUpperCase(),
      t.isRecurring ? 'YES' : 'NO'
    ]);

    const content = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rupio_Transactions_${new Date().toISOString().substring(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerNativePrint = () => {
    window.print();
  };

  // ==========================================================================
  // FILTERING & SORTING LOGIC
  // ==========================================================================
  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span className="font-semibold text-sm">Reviewing transaction logbooks...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Transaction History</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Audit trail & transaction history</p>
        </div>

        {/* Exporter actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToCSV}
            className="bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export CSV
          </button>
          <button 
            onClick={exportToExcelText}
            className="bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export Excel
          </button>
          <button 
            onClick={triggerNativePrint}
            className="bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-slate-400" /> Print Statement
          </button>
        </div>
      </div>

      {/* Interactive search and filter panel */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search details, labels..."
            className="w-full bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/50 rounded-xl py-2 pl-11 pr-4 text-xs focus:outline-none focus:border-blue-500 font-medium transition-all"
          />
        </div>

        {/* Filters Select row */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filters:</span>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/60 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none"
          >
            <option value="All">All Cash Flows</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Incomes Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/60 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none max-w-[150px]"
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Transactions database list table */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <GlassCard className="p-0 overflow-hidden border-slate-200/30 dark:border-slate-800/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/30 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-900/10 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Payment</th>
                <th className="py-4 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/20 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 font-semibold text-xs">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all duration-150">
                    <td className="py-4.5 px-6 font-bold text-slate-800 dark:text-slate-200">
                      <div>
                        <p>{t.description}</p>
                        {t.notes && <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">{t.notes}</p>}
                      </div>
                    </td>
                    <td className="py-4.5 px-4 font-mono font-medium text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {t.date}
                      </div>
                    </td>
                    <td className="py-4.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4.5 px-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
                      {t.paymentMethod}
                    </td>
                    <td className="py-4.5 px-4 font-extrabold font-mono text-sm">
                      <span className={t.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-100'}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      {deleteId === t.id ? (
                        <div className="flex items-center justify-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 text-[9px] font-black cursor-pointer transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-[9px] font-bold cursor-pointer transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteId(t.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
