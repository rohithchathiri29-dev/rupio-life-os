import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, RecoveryTracker, CravingLog, RecoveryCheckin } from '../lib/localDb.ts';
import { recoveryApi } from '../lib/api.ts';
import { motion } from 'motion/react';
import { 
  Flame, Calendar, ShieldCheck, DollarSign, Plus, Trash2, 
  Activity, Smile, PlusCircle, RefreshCw, Star, Info, ListFilter, AlertTriangle, RotateCw
} from 'lucide-react';

export const RecoveryScreen: React.FC = () => {
  const { user, formatAmount, currencySymbol } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // New Tracker States
  const [newTrackerName, setNewTrackerName] = useState<string>('Alcohol');
  const [customTrackerName, setCustomTrackerName] = useState<string>('');
  const [dailyCost, setDailyCost] = useState<string>('300');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // New Craving States
  const [cravingSeverity, setCravingSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [cravingTrigger, setCravingTrigger] = useState<string>('');
  const [cravingNote, setCravingNote] = useState<string>('');

  // Sync with server on mount
  useEffect(() => {
    if (!user) return;

    const syncWithServer = async () => {
      setSyncing(true);
      try {
        const localData = localDb.get(userId);
        const serverMerged = await recoveryApi.sync({
          recoveryTrackers: localData.recoveryTrackers,
          cravings: localData.cravings,
          recoveryCheckins: localData.recoveryCheckins
        });
        
        const updatedDb = {
          ...localData,
          recoveryTrackers: serverMerged.recoveryTrackers,
          cravings: serverMerged.cravings,
          recoveryCheckins: serverMerged.recoveryCheckins
        };
        setDb(updatedDb);
        localDb.save(userId, updatedDb);
      } catch (err) {
        console.error('Failed to sync recovery with server', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithServer();
  }, [user, userId]);

  // Sync back
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);

    if (user) {
      setSyncing(true);
      recoveryApi.sync({
        recoveryTrackers: newDb.recoveryTrackers,
        cravings: newDb.cravings,
        recoveryCheckins: newDb.recoveryCheckins
      })
      .catch(err => console.error('Background recovery sync failed:', err))
      .finally(() => setSyncing(false));
    }
  };

  // Add sobriety tracker
  const handleAddTracker = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalName = newTrackerName === 'Custom' ? customTrackerName : newTrackerName;
    if (!finalName) return;

    const newTracker: RecoveryTracker = {
      id: `rec_${Math.random().toString(36).substring(2, 9)}`,
      name: finalName,
      startDate: startDate,
      dailyCost: Number(dailyCost) || 0,
      cravingCount: 0
    };

    updateDb({
      ...db,
      recoveryTrackers: [...db.recoveryTrackers, newTracker]
    });

    setCustomTrackerName('');
    setDailyCost('300');
    localDb.addXp(userId, 30); // Sobriety commitment XP
  };

  // Delete sobriety tracker
  const handleDeleteTracker = (id: string) => {
    updateDb({
      ...db,
      recoveryTrackers: db.recoveryTrackers.filter(r => r.id !== id)
    });
  };

  // Log craving incident
  const handleLogCraving = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cravingTrigger) return;

    const newCraving: CravingLog = {
      id: `cr_${Math.random().toString(36).substring(2, 9)}`,
      date: new Date().toISOString().substring(0, 10),
      severity: cravingSeverity,
      trigger: cravingTrigger,
      note: cravingNote
    };

    updateDb({
      ...db,
      cravings: [newCraving, ...db.cravings]
    });

    setCravingTrigger('');
    setCravingNote('');
    localDb.addXp(userId, 15); // Logged and resisted cravings gives XP!
  };

  const deleteCraving = (id: string) => {
    updateDb({
      ...db,
      cravings: db.cravings.filter(c => c.id !== id)
    });
  };

  // Calculations
  const scores = localDb.calculateLifeScores(userId, 0);

  // Sobriety timelines & total savings calculator
  let totalSavedMoney = 0;
  const trackersWithStats = db.recoveryTrackers.map(r => {
    const start = new Date(r.startDate).getTime();
    const diffMs = Date.now() - start;
    const diffDays = Math.max(0, Math.floor(diffMs / 86400000));
    
    // exact hours / mins
    const diffHours = Math.max(0, Math.floor((diffMs % 86400000) / 3600000));
    const saved = diffDays * r.dailyCost;
    totalSavedMoney += saved;

    return {
      ...r,
      daysClean: diffDays,
      hoursClean: diffHours,
      savedAmount: saved
    };
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Addiction Recovery & Sobriety
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
            Stay Clean. Track Financial and Physical Sobriety Metrics
          </p>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recovery Rating */}
        <GlassCard className="p-6 bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest block mb-2">Sobriety rating</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-500 animate-pulse" /> Recovery Index
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
              Based on clean days and active cravings resisted. You earn +30 XP for starting sobriety and +15 XP for logging resolved cravings.
            </p>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <span className="text-4xl font-black font-mono text-rose-500 dark:text-rose-400">{scores.recoveryScore}/100</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                {scores.recoveryScore >= 90 ? 'Absolute Sobriety' : scores.recoveryScore >= 60 ? 'Strong Sobriety' : 'Reclaiming Control'}
              </p>
            </div>
            <Star className="w-8 h-8 text-rose-500/40" />
          </div>
        </GlassCard>

        {/* Sobriety Financial Reward */}
        <GlassCard className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest block mb-2">Passive Wealth</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Wealth Reclaimed
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
              Calculated automatically based on your customized previous spending habits per clean day.
            </p>
          </div>
          <div className="mt-6">
            <span className="text-4xl font-black font-mono text-emerald-500">{formatAmount(totalSavedMoney)}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
              Reallocated to Savings Goals
            </p>
          </div>
        </GlassCard>

        {/* Add tracker card */}
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <PlusCircle className="w-5 h-5 text-rose-500" /> Start Clean Streak
          </h3>
          <form onSubmit={handleAddTracker} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Addiction Category</label>
                <select
                  value={newTrackerName}
                  onChange={(e) => setNewTrackerName(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="Alcohol">Alcohol</option>
                  <option value="Smoking">Smoking</option>
                  <option value="Tobacco">Tobacco</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Adult Content">Adult Content</option>
                  <option value="Custom">Custom Addiction</option>
                </select>
              </div>
              {newTrackerName === 'Custom' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Custom Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sugar"
                    value={customTrackerName}
                    onChange={(e) => setCustomTrackerName(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Daily Spend (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 450"
                  required
                  value={dailyCost}
                  onChange={(e) => setDailyCost(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sobriety Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer self-end"
              >
                Launch Sobriety Timer
              </button>
            </div>
          </form>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Sobriety Timers */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Active Sobriety Counters
          </h3>

          <div className="flex flex-col gap-4">
            {trackersWithStats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/20 dark:bg-slate-900/10">
                No active sobriety tracks. Use the panel on the right to commit to custom habits or sobriety targets.
              </div>
            ) : (
              trackersWithStats.map(r => (
                <div
                  key={r.id}
                  className="p-5 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500 shadow-sm">
                      <Flame className="w-6 h-6 fill-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 dark:text-white">{r.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                        So far: {r.daysClean} days, {r.hoursClean} hours clean
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left md:text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Reallocated Spend</p>
                      <p className="text-sm font-black text-emerald-500 mt-0.5">+{formatAmount(r.savedAmount)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTracker(r.id)}
                      className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition cursor-pointer"
                      title="Delete Sobriety Track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Health Improvements Section */}
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-500 animate-pulse" /> Dynamic Health Recoveries & Benefits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5">
                <span className="text-[9px] font-bold uppercase text-emerald-500 tracking-widest block mb-1">After 24 Hours</span>
                <p className="text-xs font-black text-slate-800 dark:text-white">Lungs & Circulation Clear</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-1">
                  Carbon monoxide levels return to normal. Blood pressure and breathing capacity begin balancing.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5">
                <span className="text-[9px] font-bold uppercase text-emerald-500 tracking-widest block mb-1">After 7 Days</span>
                <p className="text-xs font-black text-slate-800 dark:text-white">Dopamine Levels Rebalancing</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-1">
                  Brain chemistry aligns. Sleep is deeper, cravings decrease in intensity, and mental focus returns.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Craving Logger journal */}
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Log Resisted Craving
            </h3>
            <form onSubmit={handleLogCraving} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Severity</label>
                <div className="grid grid-cols-3 gap-1">
                  {['low', 'medium', 'high'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setCravingSeverity(sev as any)}
                      className={`py-1.5 rounded-xl text-[10px] font-bold uppercase border cursor-pointer capitalize transition-all ${
                        cravingSeverity === sev
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/40'
                          : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Craving Trigger / Occasion</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. peer pressure, stress"
                  value={cravingTrigger}
                  onChange={(e) => setCravingTrigger(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Notes / Action Taken</label>
                <textarea
                  placeholder="e.g. Drank a warm cup of herbal tea, walked for 10 min."
                  value={cravingNote}
                  onChange={(e) => setCravingNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
              >
                Log Safe Craving Avoidance
              </button>
            </form>
          </GlassCard>

          {/* Craving history log */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Avoidance History</h4>
            {db.cravings.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-semibold italic text-center py-4">No craving log recorded.</p>
            ) : (
              db.cravings.map(c => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md inline-block mb-1.5 ${
                        c.severity === 'high' ? 'bg-rose-500/10 text-rose-500' :
                        c.severity === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {c.severity} Severity
                      </span>
                      <h5 className="text-xs font-extrabold text-slate-800 dark:text-white">Trigger: {c.trigger}</h5>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">{c.note}</p>
                    </div>
                    <button
                      onClick={() => deleteCraving(c.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
