import React, { useState } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, LifeGoal, ACHIEVEMENTS_LIST } from '../lib/localDb.ts';
import { motion } from 'motion/react';
import { 
  Trophy, Award, Target, Plus, Trash2, CheckCircle, 
  TrendingUp, Sparkles, Sliders, Shield, Star, Zap, ZapOff, CheckCircle2, Heart, RefreshCw
} from 'lucide-react';

export const GrowthScreen: React.FC = () => {
  const { user } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  
  // New Goal States
  const [goalName, setGoalName] = useState<string>('');
  const [goalCategory, setGoalCategory] = useState<LifeGoal['category']>('health');
  const [targetValue, setTargetValue] = useState<string>('10');
  const [unit, setUnit] = useState<string>('days');
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Sync to local database
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);
  };

  // Add life goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName) return;

    const newGoal: LifeGoal = {
      id: `gl_${Math.random().toString(36).substring(2, 9)}`,
      name: goalName,
      category: goalCategory,
      targetValue: Number(targetValue) || 10,
      currentValue: 0,
      unit,
      targetDate,
      completed: false
    };

    updateDb({
      ...db,
      lifeGoals: [...db.lifeGoals, newGoal]
    });

    setGoalName('');
    setTargetValue('10');
    setUnit('days');
    localDb.addXp(userId, 20); // commitment XP
  };

  // Delete goal
  const handleDeleteGoal = (id: string) => {
    updateDb({
      ...db,
      lifeGoals: db.lifeGoals.filter(g => g.id !== id)
    });
  };

  // Update progress slider
  const handleUpdateProgress = (id: string, value: number) => {
    const updatedGoals = db.lifeGoals.map(g => {
      if (g.id === id) {
        const nextValue = Math.min(value, g.targetValue);
        const isCompleted = nextValue >= g.targetValue;
        if (isCompleted && !g.completed) {
          localDb.addXp(userId, 50); // +50 XP for goal completion!
          alert(`🏆 Goal achieved: "${g.name}"! +50 XP!`);
        }
        return {
          ...g,
          currentValue: nextValue,
          completed: isCompleted
        };
      }
      return g;
    });

    updateDb({
      ...db,
      lifeGoals: updatedGoals
    });
  };

  // Calculations
  const scores = localDb.calculateLifeScores(userId, 0);

  // Experience level stats
  const level = db.gamification.level;
  const currentXp = db.gamification.xp;
  const neededXp = level * 100;
  const xpPercentage = Math.min(Math.round((currentXp / neededXp) * 100), 100);

  // Active Missions
  const missions = [
    { id: 'm1', title: 'Hydration Challenge', description: 'Log at least 1500ml of water today.', progress: 'Done', done: true },
    { id: 'm2', title: 'Routine Builder', description: 'Complete 1 morning habit session.', progress: 'Pending', done: false },
    { id: 'm3', title: 'Deep Focus Slot', description: 'Run a 25-minute focus session.', progress: 'Pending', done: false },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gamification & Life Scores</h1>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
          Monitor your holistic Life Score, unlock level badges, and track custom life goals
        </p>
      </div>

      {/* Gamification Level Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Level and XP */}
        <GlassCard className="p-6 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border-amber-500/20 md:col-span-1 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest block mb-1">Your Rank</span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 animate-bounce" /> Level {level} Ranger
              </h3>
            </div>
            <div className="p-2 bg-amber-500 text-white rounded-xl text-xs font-black">
              LVL {level}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-xs font-extrabold text-slate-600 dark:text-slate-200 mb-1.5 font-mono">
              <span>Experience Points</span>
              <span>{currentXp} / {neededXp} XP</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500" style={{ width: `${xpPercentage}%` }}></div>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold mt-1.5">
              Complete tasks, log hydration, stay sober, and check-in habits to gain XP!
            </p>
          </div>
        </GlassCard>

        {/* Life Scores Matrix Breakdown */}
        <GlassCard className="p-6 md:col-span-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-indigo-500" /> Life Scores Matrix
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Overall Score */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center col-span-2 sm:col-span-1 flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Overall Life Score</span>
              <span className="text-3xl font-black font-mono text-indigo-500 mt-2 block">{scores.overallScore}/100</span>
              <p className="text-[9px] text-slate-400 font-semibold mt-1.5">Holistic wellness average</p>
            </div>

            {/* Individual category scores */}
            <div className="flex flex-col gap-3.5 col-span-2">
              {/* Finance Score */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  <span>💰 Financial Discipline</span>
                  <span className="font-mono">{scores.financeScore}/100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${scores.financeScore}%` }}></div>
                </div>
              </div>

              {/* Health Score */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  <span>❤️ Vital Health Rating</span>
                  <span className="font-mono">{scores.healthScore}/100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full" style={{ width: `${scores.healthScore}%` }}></div>
                </div>
              </div>

              {/* Habit consistency */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  <span>⚡ Habit Consistency</span>
                  <span className="font-mono">{scores.habitScore}/100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${scores.habitScore}%` }}></div>
                </div>
              </div>

              {/* Recovery */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  <span>🛡️ Sobriety & Recovery</span>
                  <span className="font-mono">{scores.recoveryScore}/100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${scores.recoveryScore}%` }}></div>
                </div>
              </div>

              {/* Productivity */}
              <div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  <span>⏱️ Focus & Productivity</span>
                  <span className="font-mono">{scores.productivityScore}/100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-pink-500 h-full" style={{ width: `${scores.productivityScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Unlocked Badges & Missions */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Badges */}
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" /> Earned Badges
            </h3>

            <div className="grid grid-cols-4 gap-3">
              {ACHIEVEMENTS_LIST.map(badge => {
                const isUnlocked = db.gamification.unlockedAchievements.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center p-2 rounded-xl text-center border cursor-pointer select-none relative group ${
                      isUnlocked
                        ? 'bg-amber-500/5 border-amber-500/20 text-slate-800 dark:text-white'
                        : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-300 opacity-40'
                    }`}
                    title={`${badge.name}: ${badge.description}`}
                  >
                    <span className="text-2xl mb-1.5">{badge.badge}</span>
                    <span className="text-[7px] font-bold uppercase leading-none truncate w-full">{badge.name}</span>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white text-[8px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none w-32">
                      {badge.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Daily Missions */}
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Daily Missions
            </h3>
            <div className="flex flex-col gap-3">
              {missions.map(m => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    m.done 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-400' 
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-white/5 text-slate-800 dark:text-white'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-black">{m.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal font-semibold">
                      {m.description}
                    </p>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                    m.done ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {m.progress}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Life Goals section */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-500" /> Create Lifegoal Milestone
            </h3>
            <form onSubmit={handleAddGoal} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 12 Books"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Target Value</label>
                <input
                  type="number"
                  required
                  placeholder="12"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Metric Unit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. books"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category</label>
                <select
                  value={goalCategory}
                  onChange={(e: any) => setGoalCategory(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="health">❤️ Vital Health Goal</option>
                  <option value="study">🎓 Knowledge & Study</option>
                  <option value="habit">⚡ Habit Consistency</option>
                  <option value="custom">🏆 Custom Achievement</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono"
                />
              </div>
              <button
                type="submit"
                className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Life Goal
              </button>
            </form>
          </GlassCard>

          {/* Goals lists */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500 animate-pulse" /> Active Life Goal Milestones
            </h3>

            <div className="flex flex-col gap-3">
              {db.lifeGoals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                  No active life goals logged.
                </div>
              ) : (
                db.lifeGoals.map(g => (
                  <div
                    key={g.id}
                    className={`p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5 flex flex-col gap-3`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`text-xs font-extrabold ${g.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                          {g.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[8px] font-bold uppercase text-slate-400">
                          <span className="bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">{g.category}</span>
                          <span>•</span>
                          <span>target: {g.targetValue} {g.unit}</span>
                          <span>•</span>
                          <span>by: {g.targetDate}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max={g.targetValue}
                        value={g.currentValue}
                        onChange={(e) => handleUpdateProgress(g.id, Number(e.target.value))}
                        className="flex-1 accent-indigo-600 h-1 rounded-full cursor-pointer"
                      />
                      <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {g.currentValue} / {g.targetValue} {g.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
