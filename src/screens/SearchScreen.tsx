import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb } from '../lib/localDb.ts';
import { transactionsApi } from '../lib/api.ts';
import { Transaction } from '../types.js';
import { motion } from 'motion/react';
import { 
  Search, CreditCard, Activity, CheckSquare, 
  BookOpen, Target, FileText, Flame, Calendar, ArrowRight, Wallet
} from 'lucide-react';

interface SearchResult {
  id: string;
  module: 'Finance' | 'Health' | 'Habits' | 'Recovery' | 'Productivity' | 'Journaling' | 'Goals';
  title: string;
  description: string;
  date: string;
  icon: any;
}

export const SearchScreen: React.FC = () => {
  const { user, formatAmount } = useApp();
  const userId = user?.id || 'demo';

  // Search input state
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [financeTxs, setFinanceTxs] = useState<Transaction[]>([]);

  // Load finance transactions
  useEffect(() => {
    transactionsApi.list().then(setFinanceTxs).catch(console.error);
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const db = localDb.get(userId);
    const searchMatches: SearchResult[] = [];

    // 1. Finance Matches
    financeTxs.forEach(t => {
      if (
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) || 
        (t.notes && t.notes.toLowerCase().includes(q))
      ) {
        searchMatches.push({
          id: t.id,
          module: 'Finance',
          title: `${t.type === 'expense' ? 'Expense' : 'Income'} - ${t.category}`,
          description: `${t.description} • ${formatAmount(t.amount)} via ${t.paymentMethod.toUpperCase()}`,
          date: t.date,
          icon: CreditCard
        });
      }
    });

    // 2. Health Matches
    db.medications.forEach(m => {
      if (m.name.toLowerCase().includes(q) || m.dosage.toLowerCase().includes(q)) {
        searchMatches.push({
          id: m.id,
          module: 'Health',
          title: `Medication Reminder: ${m.name}`,
          description: `Dosage: ${m.dosage} • Reminder: ${m.reminderTime}`,
          date: 'Daily',
          icon: Activity
        });
      }
    });

    db.workouts.forEach(w => {
      if (w.type.toLowerCase().includes(q)) {
        searchMatches.push({
          id: w.id,
          module: 'Health',
          title: `Workout Session: ${w.type}`,
          description: `Duration: ${w.duration} mins • Calories Burned: ${w.calories} kcal`,
          date: w.date,
          icon: Activity
        });
      }
    });

    // 3. Habits Matches
    db.habits.forEach(h => {
      if (h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q)) {
        searchMatches.push({
          id: h.id,
          module: 'Habits',
          title: `Habit: ${h.name}`,
          description: `Routine Category: ${h.category} • Streak: ${h.streak} days`,
          date: 'Routine',
          icon: CheckSquare
        });
      }
    });

    // 4. Recovery Matches
    db.recoveryTrackers.forEach(r => {
      if (r.name.toLowerCase().includes(q)) {
        searchMatches.push({
          id: r.id,
          module: 'Recovery',
          title: `Sobriety Track: ${r.name}`,
          description: `Daily habit spend saved: ₹${r.dailyCost}`,
          date: r.startDate,
          icon: Flame
        });
      }
    });

    // 5. Productivity Matches
    db.tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
        searchMatches.push({
          id: t.id,
          module: 'Productivity',
          title: `Task: ${t.title}`,
          description: `${t.description || 'No description'} • Priority: ${t.priority.toUpperCase()} • Completed: ${t.completed ? 'YES' : 'NO'}`,
          date: t.dueDate,
          icon: FileText
        });
      }
    });

    db.notes.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        searchMatches.push({
          id: n.id,
          module: 'Productivity',
          title: `Note: ${n.title}`,
          description: n.content.substring(0, 140) + (n.content.length > 140 ? '...' : ''),
          date: n.updatedAt,
          icon: FileText
        });
      }
    });

    // 6. Journaling Matches
    db.journals.forEach(j => {
      if (
        j.title.toLowerCase().includes(q) || 
        j.content.toLowerCase().includes(q) || 
        j.reflection.toLowerCase().includes(q)
      ) {
        searchMatches.push({
          id: j.id,
          module: 'Journaling',
          title: `Journal Entry: ${j.title}`,
          description: j.content.substring(0, 140) + (j.content.length > 140 ? '...' : ''),
          date: j.date,
          icon: BookOpen
        });
      }
    });

    // 7. Goals Matches
    db.lifeGoals.forEach(g => {
      if (g.name.toLowerCase().includes(q)) {
        searchMatches.push({
          id: g.id,
          module: 'Goals',
          title: `Life Goal: ${g.name}`,
          description: `Progress: ${g.currentValue}/${g.targetValue} ${g.unit} • Category: ${g.category}`,
          date: g.targetDate,
          icon: Target
        });
      }
    });

    setResults(searchMatches);
  };

  // Run search automatically when query or finance transaction lists change
  useEffect(() => {
    handleSearch();
  }, [query, financeTxs]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Global Lifestyle Search</h1>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
          Instantly search across finances, journal archives, routines, medical, and tasks
        </p>
      </div>

      {/* Modern High-Contrast search box */}
      <div className="relative">
        <Search className="absolute left-4 top-4.5 w-6 h-6 text-slate-400" />
        <input
          type="text"
          autoFocus
          placeholder="Type any keyword to search entire Life OS database..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl pl-13 pr-4 py-4 text-sm font-semibold shadow-xl focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
        />
      </div>

      {/* Results grid */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {query ? `Found ${results.length} results` : 'Type to search records'}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {query ? 'No Matches Found' : 'Search Dashboard'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              {query 
                ? 'Try searching other terms like "Food", "Meditation", "Multivitamins", "Books", or "Atomic Habits".'
                : 'Instantly find historical financial logs, journal entries, active notes, daily challenges, and exercise durations.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map(res => {
              const Icon = res.icon;
              return (
                <div
                  key={res.id}
                  className="p-5 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5 flex gap-4 items-start hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 group"
                >
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    res.module === 'Finance' ? 'bg-emerald-500/10 text-emerald-500' :
                    res.module === 'Health' ? 'bg-rose-500/10 text-rose-500' :
                    res.module === 'Habits' ? 'bg-indigo-500/10 text-indigo-500' :
                    res.module === 'Recovery' ? 'bg-orange-500/10 text-orange-500' :
                    res.module === 'Productivity' ? 'bg-blue-500/10 text-blue-500' :
                    res.module === 'Journaling' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-pink-500/10 text-pink-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        {res.module}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {res.date}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white mt-1 group-hover:text-blue-500 transition-colors">
                      {res.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5 whitespace-pre-line truncate">
                      {res.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
