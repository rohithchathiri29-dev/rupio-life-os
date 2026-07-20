import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { budgetsApi, transactionsApi } from '../lib/api.ts';
import { Budget, Transaction } from '../types.js';
import { 
  Plus, Trash2, Sliders, ShieldAlert, CheckCircle, Flame, DollarSign, Tag, RefreshCw, AlertCircle 
} from 'lucide-react';

export const BudgetsScreen: React.FC = () => {
  const { formatAmount, currencySymbol } = useApp();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<string>('All');
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const categories = [
    'All', 'Food', 'Shopping', 'Bills', 'Transport', 'Fuel', 'Medical', 'Education', 
    'Entertainment', 'Travel', 'Investment', 'Insurance', 'Rent', 'EMI', 'Business', 'Others'
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, tList] = await Promise.all([
        budgetsApi.list(),
        transactionsApi.list()
      ]);
      setBudgets(bList);
      setTransactions(tList);
    } catch (err: any) {
      setError(err.message || 'Failed to sync budget databases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limitAmount) return;

    try {
      const updated = await budgetsApi.save(category, Number(limitAmount), period);
      
      // Update local state
      setBudgets(prev => {
        const idx = prev.findIndex(b => b.category === category && b.period === period);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });

      // Reset Form fields
      setLimitAmount('');
      setCategory('All');
    } catch (err: any) {
      setError(err.message || 'Failed to save budget limit.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await budgetsApi.delete(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove budget.');
    }
  };

  // ==========================================================================
  // SPENDING MATCHING LOGIC (MONTHLY BOUNDED)
  // ==========================================================================
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  const budgetProgressList = budgets.map(b => {
    // Sum matching expenses
    const spent = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth) && (b.category === 'All' ? true : t.category === b.category))
      .reduce((sum, t) => sum + t.amount, 0);

    const ratio = b.limitAmount > 0 ? spent / b.limitAmount : 0;
    const percentage = Math.min(ratio * 100, 100);

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (ratio >= 1.0) status = 'danger';
    else if (ratio >= 0.75) status = 'warning';

    return {
      ...b,
      spent,
      percentage,
      status
    };
  });

  if (loading && budgets.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span className="font-semibold text-sm">Validating budget quotas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Budget Allocation</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Configure spending limits & safeguards</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Add/Update Form */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-400">
              <Sliders className="w-4 h-4 text-blue-500" /> Save Budget Limit
            </h2>

            <form onSubmit={handleSaveBudget} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Category scope</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-xs font-semibold focus:outline-none"
                  >
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat === 'All' ? 'All Expenditures' : cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Limit (Monthly)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-mono font-bold text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Budget cycle</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                >
                  <option value="monthly">Monthly Cycle</option>
                  <option value="weekly">Weekly Cycle</option>
                  <option value="daily">Daily Cycle</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Secure Quota Cap
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Right column: Budget status records */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {budgetProgressList.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-400 font-semibold text-xs">
              No budgeting limits configured. Use the form to restrict category overspending!
            </GlassCard>
          ) : (
            budgetProgressList.map((b, idx) => (
              <GlassCard key={idx} className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        b.status === 'danger' ? 'bg-rose-500 animate-ping' : b.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {b.category === 'All' ? 'Global Expenditures Limit' : `${b.category} Cap`}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Cycle: {b.period} • Active Month spending
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                        {formatAmount(b.spent)} Spent
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Limit: {formatAmount(b.limitAmount)}
                      </span>
                    </div>

                    {deleteId === b.id ? (
                      <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
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
                        onClick={() => setDeleteId(b.id)}
                        className="p-2 rounded-xl bg-slate-100/50 hover:bg-rose-500/10 hover:text-rose-500 dark:bg-slate-900/30 text-slate-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800/40 overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.status === 'danger' ? 'bg-rose-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${b.percentage}%` }}
                  />
                </div>

                {/* Status messages depending on thresholds */}
                <div className="flex justify-between items-center text-[10px] font-bold">
                  {b.status === 'danger' ? (
                    <span className="text-rose-500 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 shrink-0" /> Over budget! Reduce spending immediately.
                    </span>
                  ) : b.status === 'warning' ? (
                    <span className="text-amber-500 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Approaching quota limit constraint. Take care.
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Spending is fully safe and healthy.
                    </span>
                  )}

                  <span className="font-mono text-slate-400">{b.percentage.toFixed(0)}% Utilized</span>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
