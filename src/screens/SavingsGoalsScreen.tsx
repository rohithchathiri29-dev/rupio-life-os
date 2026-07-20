import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { goalsApi } from '../lib/api.ts';
import { SavingsGoal } from '../types.js';
import { motion } from 'motion/react';
import { 
  Plus, DollarSign, Target, Calendar, Trash2, Award, Sparkles, RefreshCw, AlertCircle 
} from 'lucide-react';

export const SavingsGoalsScreen: React.FC = () => {
  const { formatAmount, currencySymbol } = useApp();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [category, setCategory] = useState<'Emergency' | 'Vacation' | 'Tech' | 'Vehicle' | 'Property' | 'Custom'>('Emergency');

  // Contribution state
  const [contributeAmount, setContributeAmount] = useState<string>('');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await goalsApi.list();
      setGoals(list);
    } catch (err: any) {
      setError(err.message || 'Failed to list savings goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !targetDate) return;

    try {
      const newGoal = await goalsApi.create({
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate,
        category
      });

      setGoals(prev => [...prev, newGoal]);

      // Reset Fields
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setTargetDate('');
    } catch (err: any) {
      setError(err.message || 'Failed to build savings target.');
    }
  };

  const handleContribution = async (e: React.FormEvent, goal: SavingsGoal) => {
    e.preventDefault();
    if (!contributeAmount) return;

    const added = Number(contributeAmount);
    const nextAmount = goal.currentAmount + added;

    try {
      const updated = await goalsApi.updateGoal(goal.id, { currentAmount: nextAmount });
      
      setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
      setContributeAmount('');
      setActiveGoalId(null);
    } catch (err: any) {
      setError(err.message || 'Contribution registration failed.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await goalsApi.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      setDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete goal.');
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span className="font-semibold text-sm">Auditing wealth objectives...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Savings Goals</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Accumulate capital & lock targets</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Add Goals Form */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-400">
              <Target className="w-4 h-4 text-blue-500" /> Save Target Goal
            </h2>

            <form onSubmit={handleCreateGoal} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Goal Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vacation to Hawaii"
                  className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Target ({currencySymbol})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Start Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Category type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                >
                  <option value="Emergency">Emergency Reserves</option>
                  <option value="Vacation">Vacation Travel</option>
                  <option value="Tech">Tech Upgrade</option>
                  <option value="Vehicle">Vehicle Acquisition</option>
                  <option value="Property">Property & House</option>
                  <option value="Custom">Custom Target</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Target Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-mono font-medium focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Launch Goal
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Right column: Goals cards lists */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {goals.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-400 font-semibold text-xs">
              No wealth objectives active. Launch one now to set milestones!
            </GlassCard>
          ) : (
            goals.map((g, idx) => {
              const ratio = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
              const percentage = Math.min(ratio * 100, 100);
              const isAchieved = g.currentAmount >= g.targetAmount;

              return (
                <GlassCard key={idx} className="p-5 flex flex-col gap-4 relative overflow-hidden">
                  {/* Achieved banner overlay design */}
                  {isAchieved && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[9px] px-3.5 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1 shadow">
                      <Award className="w-3 h-3" /> Target Achieved!
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {g.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Target Deadline: {g.targetDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveGoalId(activeGoalId === g.id ? null : g.id)}
                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Fund
                      </button>

                      {deleteId === g.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
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
                          onClick={() => setDeleteId(g.id)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/30 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progressive linear bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800/40 overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAchieved ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Saved {formatAmount(g.currentAmount)}</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{percentage.toFixed(0)}% Completed</span>
                      <span>Target {formatAmount(g.targetAmount)}</span>
                    </div>
                  </div>

                  {/* Fund input dropdown slide */}
                  {activeGoalId === g.id && (
                    <motion.form 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      onSubmit={(e) => handleContribution(e, g)}
                      className="flex gap-2 items-center border-t border-slate-200/30 dark:border-slate-800/30 pt-3 mt-1"
                    >
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-mono font-bold text-[10px] text-slate-400">{currencySymbol}</span>
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="any"
                          value={contributeAmount}
                          onChange={(e) => setContributeAmount(e.target.value)}
                          placeholder="Fund amount..."
                          className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-2 pl-7 pr-4 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        Add Capital
                      </button>
                    </motion.form>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
