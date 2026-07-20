import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, SleepLog, WorkoutLog, Medication } from '../lib/localDb.ts';
import { healthApi } from '../lib/api.ts';
import { motion } from 'motion/react';
import { 
  Heart, Droplet, Moon, Dumbbell, Calendar, Plus, Trash2, 
  Check, Info, Sparkles, Scale, Activity, PlusCircle, RotateCw
} from 'lucide-react';

export const HealthScreen: React.FC = () => {
  const { user, todayWaterIntake, waterGoal, logWater } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Weight State
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('178'); // default cm

  // Sleep State
  const [sleepHours, setSleepHours] = useState<string>('');
  const [sleepQuality, setSleepQuality] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Good');

  // Workout State
  const [workoutType, setWorkoutType] = useState<string>('Gym');
  const [workoutDuration, setWorkoutDuration] = useState<string>('');
  const [workoutCalories, setWorkoutCalories] = useState<string>('');

  // Meds State
  const [medName, setMedName] = useState<string>('');
  const [medDosage, setMedDosage] = useState<string>('1 tablet');
  const [medTime, setMedTime] = useState<string>('08:00');

  const today = new Date().toISOString().substring(0, 10);

  // Sync with server on mount
  useEffect(() => {
    if (!user) return;

    const syncWithServer = async () => {
      setSyncing(true);
      try {
        const localData = localDb.get(userId);
        const serverMerged = await healthApi.sync({
          waterIntake: localData.waterIntake,
          sleepLogs: localData.sleepLogs,
          workouts: localData.workouts,
          weightLogs: localData.weightLogs,
          medications: localData.medications
        });
        
        const updatedDb = {
          ...localData,
          waterIntake: serverMerged.waterIntake,
          sleepLogs: serverMerged.sleepLogs,
          workouts: serverMerged.workouts,
          weightLogs: serverMerged.weightLogs,
          medications: serverMerged.medications
        };
        setDb(updatedDb);
        localDb.save(userId, updatedDb);
      } catch (err) {
        console.error('Failed to sync health with server', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithServer();
  }, [user, userId]);

  // Sync back to db
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);

    if (user) {
      setSyncing(true);
      healthApi.sync({
        waterIntake: newDb.waterIntake,
        sleepLogs: newDb.sleepLogs,
        workouts: newDb.workouts,
        weightLogs: newDb.weightLogs,
        medications: newDb.medications
      })
      .catch(err => console.error('Background health sync failed:', err))
      .finally(() => setSyncing(false));
    }
  };

  // Water Loggers
  const addWater = (amount: number) => {
    logWater(amount);
  };

  const resetWater = () => {
    logWater(-todayWaterIntake);
  };

  // Weight Loggers
  const addWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !height) return;

    const wNum = Number(weight);
    const hNum = Number(height);
    const hMeters = hNum / 100;
    const bmiVal = Number((wNum / (hMeters * hMeters)).toFixed(1));

    const newWeightLog = {
      id: `wt_${Math.random().toString(36).substring(2, 9)}`,
      date: today,
      weight: wNum,
      height: hNum,
      bmi: bmiVal
    };

    updateDb({
      ...db,
      weightLogs: [newWeightLog, ...db.weightLogs]
    });
    setWeight('');
    localDb.addXp(userId, 20); // Weight logged XP
  };

  // Sleep Loggers
  const addSleep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sleepHours) return;

    const newSleep = {
      id: `sl_${Math.random().toString(36).substring(2, 9)}`,
      date: today,
      hours: Number(sleepHours),
      quality: sleepQuality
    };

    updateDb({
      ...db,
      sleepLogs: [newSleep, ...db.sleepLogs]
    });
    setSleepHours('');
    localDb.addXp(userId, 15); // +15 XP sleep tracked
  };

  // Workout Loggers
  const addWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutDuration) return;

    const dur = Number(workoutDuration);
    const cal = Number(workoutCalories) || Math.round(dur * 8); // fallback: ~8 cal/min

    const newWorkout: WorkoutLog = {
      id: `wk_${Math.random().toString(36).substring(2, 9)}`,
      date: today,
      type: workoutType,
      duration: dur,
      calories: cal
    };

    updateDb({
      ...db,
      workouts: [newWorkout, ...db.workouts]
    });
    setWorkoutDuration('');
    setWorkoutCalories('');
    localDb.addXp(userId, 30); // Gym/Workout XP
  };

  // Meds Loggers
  const addMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) return;

    const newMed: Medication = {
      id: `m_${Math.random().toString(36).substring(2, 9)}`,
      name: medName,
      dosage: medDosage,
      frequency: 'daily',
      reminderTime: medTime,
      active: true
    };

    updateDb({
      ...db,
      medications: [...db.medications, newMed]
    });
    setMedName('');
  };

  const deleteMed = (id: string) => {
    updateDb({
      ...db,
      medications: db.medications.filter(m => m.id !== id)
    });
  };

  const deleteWorkout = (id: string) => {
    updateDb({
      ...db,
      workouts: db.workouts.filter(w => w.id !== id)
    });
  };

  // Water calculations
  const todayWater = todayWaterIntake;
  const waterPercentage = Math.min(Math.round((todayWater / waterGoal) * 100), 100);

  // Health Score Calculations (Formula from localDb.ts)
  const scores = localDb.calculateLifeScores(userId, 0);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Health Operating System
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
            Smart Water, BMI, Workouts & Medications Reminders
          </p>
        </div>
      </div>

      {/* Grid of trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dynamic Health Score card */}
        <GlassCard className="flex flex-col justify-between p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest block mb-2">Rule-Based Metrics</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Health Rating
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
              Calculated from daily hydration ratios, ideal sleep patterns (7-8 hours), active calories burned, and balanced BMI limits.
            </p>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <span className="text-4xl font-black font-mono text-emerald-500 dark:text-emerald-400">{scores.healthScore}/100</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                {scores.healthScore >= 80 ? 'Optimal Lifestyle' : scores.healthScore >= 60 ? 'Moderately Active' : 'Attention Required'}
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-emerald-500/40 animate-pulse" />
          </div>
        </GlassCard>

        {/* Water Hydration Card */}
        <GlassCard className="p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-500 animate-bounce" /> Hydration Companion
            </h3>
            <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
              {todayWater} / {waterGoal} ml
            </span>
          </div>

          {/* Water progress radial simulation or simple gauge bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${waterPercentage}%` }}></div>
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400 uppercase">
            <span>{waterPercentage}% Achieved</span>
            <button onClick={resetWater} className="hover:text-rose-500 transition-colors">Reset</button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => addWater(250)}
              className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
            >
              + 250 ml
            </button>
            <button
              onClick={() => addWater(500)}
              className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
            >
              + 500 ml
            </button>
            <button
              onClick={() => addWater(1000)}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
            >
              + 1.0 L
            </button>
          </div>
        </GlassCard>

        {/* BMI & Weight Card */}
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-indigo-500" /> BMI & Weight Tracker
          </h3>
          <form onSubmit={addWeight} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  placeholder="e.g. 178"
                  required
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Log Weight Details
            </button>
          </form>

          {/* Current BMI display */}
          {db.weightLogs.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Current BMI Status</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">
                  {db.weightLogs[0].weight} kg <span className="text-slate-400 font-normal">({db.weightLogs[0].height}cm)</span>
                </p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                  db.weightLogs[0].bmi < 18.5 ? 'bg-amber-500/10 text-amber-600' :
                  db.weightLogs[0].bmi < 25 ? 'bg-emerald-500/10 text-emerald-600' :
                  'bg-rose-500/10 text-rose-600'
                }`}>
                  BMI: {db.weightLogs[0].bmi}
                </span>
                <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">
                  {db.weightLogs[0].bmi < 18.5 ? 'Underweight' :
                   db.weightLogs[0].bmi < 25 ? 'Normal Weight' : 'Overweight'}
                </p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sleep tracker logs */}
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-purple-500" /> Sleep Log & Quality
          </h3>
          <form onSubmit={addSleep} className="grid grid-cols-3 gap-2 items-end mb-4 bg-slate-50 dark:bg-slate-900/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Hours</label>
              <input
                type="number"
                placeholder="7.5"
                step="0.5"
                required
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold"
              />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Quality</label>
              <select
                value={sleepQuality}
                onChange={(e: any) => setSleepQuality(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <button
              type="submit"
              className="col-span-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Log
            </button>
          </form>

          {/* Sleep history */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/30 dark:border-slate-800/30 text-slate-400 font-bold uppercase">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Hours Slept</th>
                  <th className="pb-2">Quality</th>
                </tr>
              </thead>
              <tbody>
                {db.sleepLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-slate-400 font-semibold">No sleep entries yet.</td>
                  </tr>
                ) : (
                  db.sleepLogs.map(s => (
                    <tr key={s.id} className="border-b border-slate-100/10 dark:border-slate-800/20">
                      <td className="py-2.5 font-medium text-slate-500">{s.date}</td>
                      <td className="py-2.5 font-bold text-slate-800 dark:text-white font-mono">{s.hours} hrs</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          s.quality === 'Excellent' ? 'bg-emerald-500/10 text-emerald-600' :
                          s.quality === 'Good' ? 'bg-blue-500/10 text-blue-600' :
                          s.quality === 'Fair' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-rose-500/10 text-rose-600'
                        }`}>
                          {s.quality}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Workout / Exercise history */}
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-rose-500" /> Workout History & Activity
          </h3>
          <form onSubmit={addWorkout} className="grid grid-cols-4 gap-2 items-end mb-4 bg-slate-50 dark:bg-slate-900/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Type</label>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-1.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="Gym">Gym</option>
                <option value="Running">Running</option>
                <option value="Yoga">Yoga</option>
                <option value="Walking">Walking</option>
                <option value="Cycling">Cycling</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Min</label>
              <input
                type="number"
                placeholder="45"
                required
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono font-semibold"
              />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Calories</label>
              <input
                type="number"
                placeholder="300"
                value={workoutCalories}
                onChange={(e) => setWorkoutCalories(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-mono font-semibold"
              />
            </div>
            <button
              type="submit"
              className="col-span-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Log
            </button>
          </form>

          {/* Workout list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/30 dark:border-slate-800/30 text-slate-400 font-bold uppercase">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Exercise</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Burn</th>
                  <th className="pb-2 text-right">Delete</th>
                </tr>
              </thead>
              <tbody>
                {db.workouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-semibold">No workouts logged yet.</td>
                  </tr>
                ) : (
                  db.workouts.map(w => (
                    <tr key={w.id} className="border-b border-slate-100/10 dark:border-slate-800/20">
                      <td className="py-2 text-slate-500 font-medium">{w.date}</td>
                      <td className="py-2 text-slate-800 dark:text-white font-bold">{w.type}</td>
                      <td className="py-2 font-mono text-slate-600 dark:text-slate-300">{w.duration} min</td>
                      <td className="py-2 font-bold font-mono text-emerald-500">-{w.calories} kCal</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteWorkout(w.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Medication section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 md:col-span-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <PlusCircle className="w-5 h-5 text-emerald-500" /> New Medication
          </h3>
          <form onSubmit={addMed} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Medication Name</label>
              <input
                type="text"
                placeholder="e.g. Omega-3 Fish Oil"
                required
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Dosage</label>
                <input
                  type="text"
                  placeholder="e.g. 1 capsule"
                  required
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Reminder</label>
                <input
                  type="time"
                  required
                  value={medTime}
                  onChange={(e) => setMedTime(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-semibold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
            >
              Add Active Reminder
            </button>
          </form>
        </GlassCard>

        {/* List of Medications */}
        <GlassCard className="p-6 md:col-span-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-500" /> Active Medications & Daily Prescriptions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {db.medications.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-slate-400 font-semibold text-xs">
                No active daily medications configured.
              </div>
            ) : (
              db.medications.map(m => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">{m.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{m.dosage} • Daily</p>
                      <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-md inline-block mt-2">
                        ⏰ {m.reminderTime}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMed(m.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                    title="Remove Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
