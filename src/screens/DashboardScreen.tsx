import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { transactionsApi, budgetsApi, goalsApi, aiApi } from '../lib/api.ts';
import { Transaction, Budget, SavingsGoal } from '../types.js';
import { PremiumBarChart, PremiumHeatmap, PremiumLineChart } from '../components/PremiumCharts.tsx';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Plus, RefreshCw, 
  Sparkles, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck, Tag, CreditCard, Layers,
  Activity, CheckSquare, Flame, Briefcase, BookOpen, Award, Search,
  Droplet, Bell, Play, Pause, Clock, Volume2, Settings, Hourglass, Check
} from 'lucide-react';

export const DashboardScreen: React.FC<{ setActiveScreen?: (screen: string) => void }> = ({ setActiveScreen }) => {
  const { 
    formatAmount, currencySymbol, themePreset, score, transactionsCount, refreshSharedData,
    todayWaterIntake, waterGoal, waterReminderInterval, waterReminderActive, waterTimeLeft,
    isWaterAlarmActive, logWater, updateWaterGoal, updateWaterReminderInterval, updateWaterReminderActive,
    resetWaterTimer, dismissWaterAlarm
  } = useApp();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  
  // Water settings modal states
  const [isWaterSettingsOpen, setIsWaterSettingsOpen] = useState<boolean>(false);
  const [tempGoal, setTempGoal] = useState<number>(waterGoal);
  const [tempInterval, setTempInterval] = useState<number>(waterReminderInterval);
  const [tempActive, setTempActive] = useState<boolean>(waterReminderActive);

  // Sync temp options on opening modal
  useEffect(() => {
    setTempGoal(waterGoal);
    setTempInterval(waterReminderInterval);
    setTempActive(waterReminderActive);
  }, [waterGoal, waterReminderInterval, waterReminderActive, isWaterSettingsOpen]);

  const handleSaveWaterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateWaterGoal(tempGoal);
    await updateWaterReminderInterval(tempInterval);
    await updateWaterReminderActive(tempActive);
    setIsWaterSettingsOpen(false);
  };

  // Quick Add Modal States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'upi'>('card');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiTip, setAiTip] = useState<string>('Analyzing your monthly spends...');
  const [aiScore, setAiScore] = useState<number>(75);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [txList, budgetList, goalList] = await Promise.all([
        transactionsApi.list(),
        budgetsApi.list(),
        goalsApi.list()
      ]);
      setTransactions(txList);
      setBudgets(budgetList);
      setGoals(goalList);

      // Lazy load a fast AI summary
      try {
        const insights = await aiApi.getInsights();
        setAiScore(insights.score);
        if (insights.suggestions && insights.suggestions.length > 0) {
          setAiTip(insights.suggestions[0]);
        }
      } catch {
        // Fallback tip if API fails
        setAiTip('Reviewing cash flows. Your spending is looking stable this week!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return;

    try {
      await transactionsApi.create({
        type,
        amount: Number(amount),
        category,
        description,
        date,
        paymentMethod,
        isRecurring,
        notes: notes || undefined
      });

      // Reset Form & Clear Cache
      setAmount('');
      setDescription('');
      setNotes('');
      setIsRecurring(false);
      setIsQuickAddOpen(false);
      
      // Clear AI cache for refreshed insights on next load
      try {
        await aiApi.refreshInsights();
      } catch {
        // ignore
      }

      // Reload Data
      await loadData();
      await refreshSharedData();
    } catch (err: any) {
      setError(err.message || 'Failed to register expense.');
    }
  };

  // ==========================================================================
  // MATHEMATICAL AGGREGATION & DERIVATIONS
  // ==========================================================================
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const currentMonthStr = now.toISOString().substring(0, 7); // YYYY-MM
  const currentYearStr = now.getFullYear().toString(); // YYYY

  // Income & Expenses sums
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  const todayExpense = transactions.filter(t => t.type === 'expense' && t.date === todayStr).reduce((sum, t) => sum + t.amount, 0);
  const weeklyExpense = transactions.filter(t => t.type === 'expense' && t.date >= startOfWeekStr).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr)).reduce((sum, t) => sum + t.amount, 0);
  const yearlyExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentYearStr)).reduce((sum, t) => sum + t.amount, 0);

  const totalSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Budgets evaluation
  const categoryBudgets = budgets.map(b => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr) && (b.category === 'All' ? true : t.category === b.category))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      category: b.category,
      limit: b.limitAmount,
      spent,
      percentage: Math.min((spent / b.limitAmount) * 100, 100)
    };
  });

  // Cash flow charts mapping
  const cashFlowHistory = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthKey = d.toISOString().substring(0, 7);
    const label = d.toLocaleString('default', { month: 'short' });

    const inc = transactions.filter(t => t.type === 'income' && t.date.startsWith(monthKey)).reduce((sum, t) => sum + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense' && t.date.startsWith(monthKey)).reduce((sum, t) => sum + t.amount, 0);

    return { label, income: inc, expense: exp };
  });

  // Recent 5 transactions
  const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Heatmap mapping (last 28 days)
  const heatmapHistory = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const dateStr = d.toISOString().split('T')[0];

    const value = transactions.filter(t => t.type === 'expense' && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
    return { date: dateStr, value };
  });

  const expenseCategories = [
    'Food', 'Shopping', 'Bills', 'Transport', 'Fuel', 'Medical', 'Education', 
    'Entertainment', 'Travel', 'Investment', 'Insurance', 'Rent', 'EMI', 'Business', 'Others'
  ];

  const incomeCategories = [
    'Salary', 'Pocket Money', 'Investment Returns', 'Business Income', 'Freelance/Side Hustle', 'Gifts/Grants', 'Refund/Reimbursement', 'Others'
  ];

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-3" />
        <span className="font-semibold text-sm">Synchronizing Cloud Bank...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none">
      {/* Top Banner Greetings & AI Health Indicator */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Financial Dashboard</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Real-time assets & liability logs</p>
        </div>

        {/* AI Health Capsule */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 border border-blue-500/20 dark:border-blue-500/10 px-4 py-2.5 rounded-2xl max-w-sm">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
          <div className="text-xs">
            {transactionsCount < 3 ? (
              <span className="font-black text-slate-400 font-mono">Score: N/A</span>
            ) : (
              <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono">Score {score ?? 72}/100</span>
            )}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal truncate max-w-[200px]">
              {transactionsCount < 3 ? "Need 3+ transactions to run diagnostics" : aiTip}
            </p>
          </div>
        </div>
      </div>

      {/* Main Wealth Metric Stats (Bento Row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Spends */}
        <GlassCard className="p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Spends</span>
            <div className={`p-2 rounded-xl ${
              todayExpense > 0 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {todayExpense > 0 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white">
              {formatAmount(todayExpense)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Recorded since midnight
            </p>
          </div>
        </GlassCard>

        {/* 2. Monthly Spends */}
        <GlassCard className="p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Spends</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white">
              {formatAmount(monthlyExpense)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Active month total
            </p>
          </div>
        </GlassCard>

        {/* 3. Current Savings */}
        <GlassCard className="p-5 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Savings</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-mono tracking-tight text-slate-950 dark:text-white">
              {formatAmount(totalSavings)}
            </h3>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Allocated in Goals
            </p>
          </div>
        </GlassCard>

        {/* 4. Total Assets */}
        {(() => {
          let totalAssetsBg = "from-blue-600 to-indigo-700 border-blue-400/20 text-white shadow-blue-950/10 dark:shadow-blue-950/30";
          let totalAssetsTextColor = "text-blue-100";
          
          if (themePreset === 'emerald') {
            totalAssetsBg = "from-emerald-600 to-teal-700 border-emerald-400/20 text-white shadow-emerald-950/10 dark:shadow-emerald-950/30";
            totalAssetsTextColor = "text-emerald-100";
          } else if (themePreset === 'obsidian') {
            totalAssetsBg = "from-amber-500 to-amber-700 border-amber-400/20 text-white shadow-amber-950/10 dark:shadow-amber-950/30";
            totalAssetsTextColor = "text-amber-100";
          } else if (themePreset === 'cyberpunk') {
            totalAssetsBg = "from-pink-600 to-purple-700 border-pink-400/20 text-white shadow-pink-950/10 dark:shadow-pink-950/30";
            totalAssetsTextColor = "text-pink-100";
          }
          
          return (
            <div className={`bg-gradient-to-br ${totalAssetsBg} p-5 rounded-[2rem] shadow-xl border flex flex-col justify-between h-36 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}>
              <div className="absolute right-[-10%] top-[-20%] w-28 h-28 rounded-full bg-white/5 blur-md pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <span className={`text-[10px] font-bold ${totalAssetsTextColor} uppercase tracking-widest`}>Total Assets</span>
                <div className="p-2 rounded-xl bg-white/10 text-white border border-white/10 shadow-inner">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black font-mono tracking-tight text-white">
                  {formatAmount(currentBalance)}
                </h3>
                <p className={`text-[10px] ${totalAssetsTextColor} font-semibold mt-1 flex items-center gap-0.5`}>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> Liquid Capital
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Life OS Launchers Carousel Grid */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">Life OS Modules Quick Launch</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { id: 'health', label: 'Health Hub', desc: 'Water, meds & sleep', color: 'from-rose-500/10 to-pink-500/10 hover:border-rose-500/30', text: 'text-rose-500', icon: Activity },
            { id: 'habits', label: 'Habit Builder', desc: 'Lock in routines', color: 'from-indigo-500/10 to-blue-500/10 hover:border-indigo-500/30', text: 'text-indigo-500', icon: CheckSquare },
            { id: 'recovery', label: 'Recovery Track', desc: 'Sobriety timers', color: 'from-orange-500/10 to-amber-500/10 hover:border-orange-500/30', text: 'text-orange-500', icon: Flame },
            { id: 'productivity', label: 'Focus & Tasks', desc: 'Pomodoro work', color: 'from-blue-500/10 to-cyan-500/10 hover:border-blue-500/30', text: 'text-blue-500', icon: Briefcase },
            { id: 'journal', label: 'Daily Journal', desc: 'Reflections & gratitude', color: 'from-purple-500/10 to-pink-500/10 hover:border-purple-500/30', text: 'text-purple-500', icon: BookOpen },
            { id: 'growth', label: 'Life Score & XP', desc: 'Badges & Level progress', color: 'from-amber-500/10 to-orange-500/10 hover:border-amber-500/30', text: 'text-amber-500', icon: Award },
            { id: 'search', label: 'Global Search', desc: 'Query entire Life OS logs', color: 'from-slate-500/10 to-slate-600/10 hover:border-slate-400/30 border-dashed', text: 'text-slate-600 dark:text-slate-300', icon: Search }
          ].map(launch => {
            const LaunchIcon = launch.icon;
            return (
              <div
                key={launch.id}
                onClick={() => setActiveScreen?.(launch.id)}
                className={`p-4 rounded-[2rem] bg-gradient-to-br ${launch.color} border border-transparent transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-pointer flex flex-col justify-between h-28 group`}
              >
                <div className="p-2 bg-white dark:bg-slate-900 w-8 h-8 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition">
                  <LaunchIcon className={`w-4.5 h-4.5 ${launch.text}`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{launch.label}</h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 leading-none truncate">{launch.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid containing core graphs & transaction details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Cash flow comparison & Heatmap timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/30 dark:border-slate-800/30">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Flow (6 Months)</span>
              <div className="flex gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Income</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Expense</div>
              </div>
            </div>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 mb-4 animate-bounce">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">No Cash Flow History Yet</h4>
                <p className="text-[10px] text-slate-400 max-w-[280px] mt-1.5 leading-relaxed">
                  Log your first income, pocket money, or expense to unlock analytics.
                </p>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-[10px] font-bold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5 animate-pulse"
                >
                  <Plus className="w-3.5 h-3.5" /> Record First Transaction
                </button>
              </div>
            ) : (
              <PremiumBarChart data={cashFlowHistory} />
            )}
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200/30 dark:border-slate-800/30">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Spending Frequency (Last 4 Weeks)</span>
            </div>
            <PremiumHeatmap data={heatmapHistory} />
          </GlassCard>
        </div>

        {/* Right column: Hydration & Reminder Hub + Financial summary */}
        <div className="flex flex-col gap-6">
          
          {/* 1. WATER INTAKE WIDGET */}
          <GlassCard className="p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/20 dark:border-slate-800/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-blue-500" /> Water Intake
              </span>
              <span className="text-[10px] font-bold font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                {Math.min(Math.round((todayWaterIntake / waterGoal) * 100), 100)}%
              </span>
            </div>

            <div className="flex gap-4 items-center justify-between">
              {/* Bottle level indicator */}
              {(() => {
                const percent = Math.min(Math.round((todayWaterIntake / waterGoal) * 100), 100);
                return (
                  <div className="relative w-24 h-44 bg-slate-100/10 dark:bg-slate-900/60 border border-slate-300/30 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-inner flex items-end shrink-0">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-sky-400 transition-all duration-1000 ease-out relative"
                      style={{ height: `${percent}%` }}
                    >
                      {percent > 0 && percent < 100 && (
                        <div className="absolute top-0 left-0 right-0 h-2.5 bg-sky-300/50 animate-pulse" />
                      )}
                    </div>
                    {/* Bottle cap */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-1.5 bg-slate-400 dark:bg-slate-700 rounded-t-sm" />
                    {/* Measurement marks */}
                    <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-3 text-[7px] font-bold text-slate-400 font-mono pointer-events-none select-none opacity-80">
                      <span>— 5L</span>
                      <span>— 4L</span>
                      <span>— 3L</span>
                      <span>— 2L</span>
                      <span>— 1L</span>
                    </div>
                    {/* Value indicator overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-black text-xs text-slate-800 dark:text-white pointer-events-none drop-shadow">
                      <span className="text-[10px] font-bold opacity-65">Done</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Status and Increment buttons */}
              <div className="flex-1 flex flex-col gap-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-mono">
                    {(todayWaterIntake / 1000).toFixed(1)} / {(waterGoal / 1000).toFixed(1)} L
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5 uppercase">Hydration target</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {[
                    { label: '+250ml', value: 250 },
                    { label: '+500ml', value: 500 },
                    { label: '+1 Liter', value: 1000 }
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => logWater(btn.value)}
                      className="w-full text-left py-1.5 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/40 hover:bg-blue-500/10 hover:border-blue-500/20 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-between group cursor-pointer"
                    >
                      <span className="group-hover:text-blue-500 transition-colors flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {btn.label}
                      </span>
                      <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Config & quick action */}
            <div className="mt-1 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1.5 bg-slate-100/40 dark:bg-slate-900/30 py-2 rounded-xl border border-slate-200/20 dark:border-slate-800/20">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> 
                  Reminder {waterReminderActive ? `every ${waterReminderInterval >= 60 ? `${waterReminderInterval / 60} Hour` : `${waterReminderInterval} mins`}` : 'disabled'}
                </span>
                <button 
                  onClick={() => setIsWaterSettingsOpen(true)}
                  className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <button
                onClick={() => logWater(250)}
                className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-black py-2.5 rounded-xl shadow-md shadow-blue-600/10 text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Droplet className="w-4 h-4 animate-bounce" /> Log 250 ml
              </button>
            </div>
          </GlassCard>

          {/* 2. WATER COUNTDOWN TIMER REMINDER */}
          <GlassCard className="p-5 bg-gradient-to-br from-blue-600/10 via-sky-600/5 to-indigo-600/10 border-blue-500/20 dark:border-blue-500/10 flex flex-col gap-3.5 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-500 animate-bounce" /> Water Reminder
              </span>
              <button
                onClick={() => updateWaterReminderActive(!waterReminderActive)}
                className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {waterReminderActive ? '× Disable' : '✓ Enable'}
              </button>
            </div>

            <div className="flex justify-between items-center gap-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Next reminder in</p>
                <div className="text-3xl font-black font-mono tracking-wider text-slate-900 dark:text-white mt-1">
                  {String(Math.floor(waterTimeLeft / 60)).padStart(2, '0')} <span className="text-sm text-slate-400 font-bold">:</span> {String(waterTimeLeft % 60).padStart(2, '0')}
                </div>
                <div className="flex gap-7 text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  <span>mins</span>
                  <span>secs</span>
                </div>
              </div>

              {/* Glowing Cup container */}
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
                <Droplet className={`w-6 h-6 text-blue-400 ${waterReminderActive ? 'animate-pulse' : 'opacity-40'}`} />
              </div>
            </div>

            <button
              onClick={() => updateWaterReminderActive(!waterReminderActive)}
              className="w-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[10px] font-black text-slate-300 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {waterReminderActive ? (
                <>
                  <Pause className="w-3 h-3 text-amber-500" /> Pause Reminder
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-500 animate-pulse" /> Resume Reminder
                </>
              )}
            </button>
          </GlassCard>

          {/* 3. TODAY'S REMINDERS LIST */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <div className="pb-1 border-b border-slate-200/20 dark:border-slate-800/20 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Today's Reminders
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Reminder 1: Water */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
                    <Droplet className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Drink Water</h4>
                    <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">
                      Every {waterReminderInterval >= 60 ? `${waterReminderInterval / 60} Hour` : `${waterReminderInterval} mins`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/20 dark:border-slate-800/40 px-2 py-0.5 rounded-md shrink-0">
                  {(() => {
                    const nextTime = new Date();
                    nextTime.setSeconds(nextTime.getSeconds() + waterTimeLeft);
                    return nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  })()}
                </span>
              </div>

              {/* Reminder 2: Vitamin D */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Take Vitamin D</h4>
                    <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Every 1 Day</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono text-slate-400 shrink-0">09:00 AM</span>
              </div>

              {/* Reminder 3: Workout */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Workout</h4>
                    <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Every 1 Day</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold font-mono text-slate-400 shrink-0">06:30 PM</span>
              </div>
            </div>

            <button
              onClick={() => setActiveScreen?.('health')}
              className="text-center text-[10px] font-bold text-blue-500 hover:text-blue-400 transition cursor-pointer flex items-center justify-center gap-1 mt-1 hover:underline"
            >
              View All Reminders →
            </button>
          </GlassCard>

          {/* Quick Add Floating Button & Card toggler */}
          <GlassCard className="relative overflow-visible flex flex-col justify-center items-center py-6 h-36 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 hover:from-blue-600/10 hover:to-indigo-600/10 cursor-pointer" onClick={() => setIsQuickAddOpen(true)}>
            <div className="p-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-3">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">Quick Add Transaction</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Log spends in 2 seconds</span>
          </GlassCard>

          {/* Active monthly budgets limits */}
          <GlassCard className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200/30 dark:border-slate-800/30">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Budget Progress</span>
            </div>
            {categoryBudgets.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold">No active budget limits set.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {categoryBudgets.map((b, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">{b.category} Budget</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {formatAmount(b.spent)} / <span className="opacity-60">{formatAmount(b.limit)}</span>
                      </span>
                    </div>
                    {/* Linear dynamic progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800/50 overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.percentage >= 90 ? 'bg-rose-500' : b.percentage >= 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Ledger Entries list */}
          <GlassCard className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-200/30 dark:border-slate-800/30">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Transactions</span>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold">No recent transactions recorded.</div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {recentTransactions.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 truncate">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{t.category}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-mono text-right shrink-0 ${
                      t.type === 'income' ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* QUICK ADD MODAL SCREEN */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex justify-center items-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full"
          >
            <GlassCard className="p-8 shadow-2xl relative border-blue-500/30 dark:border-blue-500/20">
              <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-4 mb-6">
                <span className="text-sm font-black text-slate-800 dark:text-white">Register Transaction</span>
                <button 
                  onClick={() => setIsQuickAddOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
                {/* Transaction type toggler */}
                <div className="flex bg-slate-100/50 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/30 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => { setType('expense'); setCategory('Food'); }}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      type === 'expense' ? 'bg-white dark:bg-slate-800 shadow text-rose-500 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('income'); setCategory('Salary'); }}
                    className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      type === 'income' ? 'bg-white dark:bg-slate-800 shadow text-emerald-500 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                </div>

                {/* Amount input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Amount ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 font-mono font-bold text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 font-mono font-bold text-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Category selectors */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Description</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Uber, Netflix..."
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500 font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Payment option */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Payment Method</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI / Instant Pay</option>
                      <option value="cash">Cash / Physical</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox Recurring flag */}
                <div className="flex items-center gap-2 px-1 mt-1">
                  <input
                    type="checkbox"
                    id="isRecurringCheck"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="isRecurringCheck" className="text-xs text-slate-500 dark:text-slate-400 font-semibold cursor-pointer select-none">
                    Flag as automated / recurring payment
                  </label>
                </div>

                {/* Action trigger button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 mt-4 text-sm cursor-pointer"
                >
                  Secure Log Entry
                </button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* WATER SETTINGS CUSTOMIZATION MODAL */}
      {isWaterSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex justify-center items-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full"
          >
            <GlassCard className="p-6 shadow-2xl relative border-blue-500/30">
              <div className="flex justify-between items-center border-b border-slate-200/20 dark:border-slate-800/20 pb-4 mb-4">
                <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-500" /> Hydration Preferences
                </span>
                <button 
                  onClick={() => setIsWaterSettingsOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveWaterSettings} className="flex flex-col gap-4">
                {/* 5 Liters Goal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Daily Intake Goal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000].map((goalOption) => (
                      <button
                        type="button"
                        key={goalOption}
                        onClick={() => setTempGoal(goalOption)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                          tempGoal === goalOption
                            ? 'bg-blue-600 text-white border-blue-600 font-extrabold'
                            : 'bg-slate-100/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-500/10'
                        }`}
                      >
                        {(goalOption / 1000).toFixed(1)} Liters
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reminder Frequency Interval */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Drinking Reminder Intervals</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Every 15 Mins', value: 15 },
                      { label: 'Every 30 Mins', value: 30 },
                      { label: 'Every 45 Mins', value: 45 },
                      { label: 'Every 1 Hour', value: 60 },
                      { label: 'Every 2 Hours', value: 120 },
                      { label: 'Every 3 Hours', value: 180 },
                    ].map((intervalOption) => (
                      <button
                        type="button"
                        key={intervalOption.value}
                        onClick={() => setTempInterval(intervalOption.value)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-between ${
                          tempInterval === intervalOption.value
                            ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold'
                            : 'bg-slate-100/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-500/10'
                        }`}
                      >
                        <span>{intervalOption.label}</span>
                        {tempInterval === intervalOption.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reminders On/Off Toggle */}
                <div className="flex items-center justify-between bg-slate-100/30 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/20 dark:border-slate-800/20 mt-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Hydration Alarm Alerts</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Trigger full screen popups & chimes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTempActive(!tempActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      tempActive
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tempActive ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsWaterSettingsOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition text-xs cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    Apply Settings
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* WATER HYDRATION ALARM INTERRUPT SCREEN */}
      {isWaterAlarmActive && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-sm w-full"
          >
            <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />
              
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-full animate-bounce mt-2">
                <Droplet className="w-12 h-12" />
              </div>
              
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400 animate-pulse" /> Hydration Alert! 💧
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2 px-1">
                  Time to drink some fresh water! Logging water restores focus, adds XP (+10), and resets your daily alarm tracker.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => logWater(250)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-blue-600/10 cursor-pointer"
                >
                  Log 250 ml Water
                </button>
                <button
                  onClick={() => logWater(500)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition text-xs shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Log 500 ml Water
                </button>
                <button
                  onClick={dismissWaterAlarm}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition text-xs cursor-pointer"
                >
                  Snooze 10 Mins
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
