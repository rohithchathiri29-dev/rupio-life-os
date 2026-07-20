import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, Habit } from '../lib/localDb.ts';
import { habitsApi } from '../lib/api.ts';
import { motion } from 'motion/react';
import { 
  CheckSquare, Calendar, Flame, Award, Plus, Trash2, 
  RotateCw, PlusCircle, CheckCircle, Smile, BookOpen, Clock, Activity, Zap
} from 'lucide-react';

export const HabitsScreen: React.FC = () => {
  const { user } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  const [newHabitName, setNewHabitName] = useState<string>('');
  const [newHabitCategory, setNewHabitCategory] = useState<Habit['category']>('Custom');
  const [newHabitFreq, setNewHabitFreq] = useState<Habit['frequency']>('daily');
  const [syncing, setSyncing] = useState<boolean>(false);

  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

  // Sync with server on mount
  useEffect(() => {
    if (!user) return;

    const syncWithServer = async () => {
      setSyncing(true);
      try {
        const localData = localDb.get(userId);
        const serverMerged = await habitsApi.sync(localData.habits, localData.habitCompletions);
        
        const updatedDb = {
          ...localData,
          habits: serverMerged.habits,
          habitCompletions: serverMerged.completions
        };
        setDb(updatedDb);
        localDb.save(userId, updatedDb);
      } catch (err) {
        console.error('Failed to sync habits with server', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithServer();
  }, [user, userId]);

  // Challenges (Static rule-based challenges)
  const dailyChallenges = [
    { id: 'c1', title: 'Power Hour', description: 'Complete a habit before 10 AM today.', xp: 30, done: false },
    { id: 'c2', title: 'Zen Mind', description: 'Do the Morning Meditation today.', xp: 25, done: false },
  ];

  // Sync to database
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);
    
    // Asynchronous background sync
    if (user) {
      setSyncing(true);
      habitsApi.sync(newDb.habits, newDb.habitCompletions)
        .catch(err => console.error('Background habits sync failed:', err))
        .finally(() => setSyncing(false));
    }
  };

  // Add Habit
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName) return;

    const newHabit: Habit = {
      id: `h_${Math.random().toString(36).substring(2, 9)}`,
      name: newHabitName,
      category: newHabitCategory,
      frequency: newHabitFreq,
      streak: 0,
      createdAt: today
    };

    const newHabitCompletions = {
      ...db.habitCompletions,
      [newHabit.id]: {}
    };

    updateDb({
      ...db,
      habits: [...db.habits, newHabit],
      habitCompletions: newHabitCompletions
    });

    setNewHabitName('');
    localDb.addXp(userId, 20); // +20 XP for initiating a habit
  };

  // Delete Habit
  const handleDeleteHabit = (id: string) => {
    updateDb({
      ...db,
      habits: db.habits.filter(h => h.id !== id)
    });
  };

  // Toggle habit check status
  const toggleHabitCompletion = (habitId: string) => {
    const completions = db.habitCompletions[habitId] || {};
    const isCompleted = completions[today] || false;
    const newStatus = !isCompleted;

    const updatedCompletions = {
      ...db.habitCompletions,
      [habitId]: {
        ...completions,
        [today]: newStatus
      }
    };

    // Calculate streak adjustment
    const updatedHabits = db.habits.map(h => {
      if (h.id === habitId) {
        let currentStreak = h.streak;
        if (newStatus) {
          // Check if yesterday was completed to keep streak alive
          const completedYesterday = completions[yesterday] || false;
          currentStreak = completedYesterday ? currentStreak + 1 : 1;
        } else {
          currentStreak = Math.max(0, currentStreak - 1);
        }
        return {
          ...h,
          streak: currentStreak,
          lastCompleted: newStatus ? today : h.lastCompleted
        };
      }
      return h;
    });

    updateDb({
      ...db,
      habits: updatedHabits,
      habitCompletions: updatedCompletions
    });

    if (newStatus) {
      localDb.addXp(userId, 15); // +15 XP rewarded
    }
  };

  // Habit Score Calculation (Formula from localDb.ts)
  const scores = localDb.calculateLifeScores(userId, 0);

  // Calendar Helper Grid: Last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - i * 86400000);
    return d.toISOString().substring(0, 10);
  }).reverse();

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Habit Builder & Routines
            {user && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors ${
                syncing 
                  ? 'bg-blue-500/10 text-blue-500 animate-pulse' 
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                <RotateCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Cloud Backup Active'}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
            Lock in morning routines, study slots & reading streaks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Habit Rating Summary */}
        <GlassCard className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-2">XP Progress</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500 animate-pulse" /> Discipline Index
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
              Based on active daily consistency and streak thresholds. Log daily habits to earn +15 XP each. Keep your streaks blazing!
            </p>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <span className="text-4xl font-black font-mono text-indigo-500 dark:text-indigo-400">{scores.habitScore}/100</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                {scores.habitScore >= 80 ? 'Zen Master status' : scores.habitScore >= 50 ? 'Developing Consistency' : 'Inconsistent routine'}
              </p>
            </div>
            <Award className="w-8 h-8 text-indigo-500/40" />
          </div>
        </GlassCard>

        {/* Add Habit Card */}
        <GlassCard className="p-6 col-span-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <PlusCircle className="w-5 h-5 text-blue-500" /> Create Custom Routine
          </h3>
          <form onSubmit={handleAddHabit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Habit Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Meditate 15 min"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
              <select
                value={newHabitCategory}
                onChange={(e: any) => setNewHabitCategory(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="Morning Routine">Morning Routine</option>
                <option value="Night Routine">Night Routine</option>
                <option value="Reading">Reading</option>
                <option value="Meditation">Meditation</option>
                <option value="Exercise">Exercise</option>
                <option value="Study">Study</option>
                <option value="Coding">Coding</option>
                <option value="Custom">Custom Routine</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Routine
            </button>
          </form>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Checklist */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" /> Today's Routine Checklist
          </h3>

          <div className="flex flex-col gap-3">
            {db.habits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                No active routines. Create one above to start building daily consistency!
              </div>
            ) : (
              db.habits.map(h => {
                const completions = db.habitCompletions[h.id] || {};
                const isCompleted = completions[today] || false;
                
                return (
                  <div
                    key={h.id}
                    className={`p-4 rounded-3xl transition-all duration-300 border ${
                      isCompleted 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/40 dark:border-white/5'
                    } flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleHabitCompletion(h.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <CheckCircle className="w-4.5 h-4.5" />
                      </button>
                      <div>
                        <h4 className={`text-xs font-extrabold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                          {h.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-semibold text-slate-400 uppercase">
                          <span>{h.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-orange-500">
                            <Flame className="w-3 h-3 fill-orange-500" /> {h.streak} day streak
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Past 7 days check grids */}
                      <div className="hidden sm:flex gap-1.5">
                        {last7Days.map(date => {
                          const completed = completions[date] || false;
                          const label = new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' });
                          return (
                            <div key={date} className="flex flex-col items-center">
                              <span className="text-[7px] text-slate-400 font-bold mb-0.5">{label}</span>
                              <div
                                className={`w-3.5 h-3.5 rounded-sm ${
                                  completed 
                                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
                                    : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                                title={`${h.name} on ${date}: ${completed ? 'Completed' : 'Missed'}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleDeleteHabit(h.id)}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition"
                        title="Remove Habit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Challenges & Tips */}
        <div className="flex flex-col gap-6">
          <GlassCard className="p-6 border-indigo-500/10">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-500" /> Daily Routine Challenges
            </h3>
            <div className="flex flex-col gap-3">
              {dailyChallenges.map(c => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">{c.title}</h4>
                    <span className="text-[9px] font-extrabold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md">
                      + {c.xp} XP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-[#FAF7F2] dark:bg-slate-950/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
              <Smile className="w-4 h-4" /> Micro Habits Rules
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              "The secret to building permanent habits is starting so small that it is impossible to fail."
            </p>
            <ul className="text-[10px] text-slate-400 font-medium list-disc ml-4 mt-3 flex flex-col gap-1.5">
              <li>Morning Meditation: Sit for just 1 minute after waking up.</li>
              <li>Reading: Read exactly 1 page before sleeping.</li>
              <li>Coding: Write 3 lines of clean code every morning.</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
