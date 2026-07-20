import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, Task, Note, FocusSession } from '../lib/localDb.ts';
import { productivityApi } from '../lib/api.ts';
import { motion } from 'motion/react';
import { 
  CheckCircle, Play, Pause, RotateCw, Plus, Trash2, 
  Briefcase, Clock, FileText, PlusCircle, CheckCircle2, 
  Settings, Award, Smile, ShieldCheck, Zap, Save, Sparkles
} from 'lucide-react';

export const ProductivityScreen: React.FC = () => {
  const { user } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Notes state
  const [newNoteTitle, setNewNoteTitle] = useState<string>('');
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Pomodoro Timer States
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60); // 25 mins
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date().toISOString().substring(0, 10);

  // Sync with server on mount
  useEffect(() => {
    if (!user) return;

    const syncWithServer = async () => {
      setSyncing(true);
      try {
        const localData = localDb.get(userId);
        const serverMerged = await productivityApi.sync({
          tasks: localData.tasks,
          notes: localData.notes,
          focusSessions: localData.focusSessions
        });
        
        const updatedDb = {
          ...localData,
          tasks: serverMerged.tasks,
          notes: serverMerged.notes,
          focusSessions: serverMerged.focusSessions
        };
        setDb(updatedDb);
        localDb.save(userId, updatedDb);
      } catch (err) {
        console.error('Failed to sync productivity with server', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithServer();
  }, [user, userId]);

  // Sync to local database
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);

    if (user) {
      setSyncing(true);
      productivityApi.sync({
        tasks: newDb.tasks,
        notes: newDb.notes,
        focusSessions: newDb.focusSessions
      })
      .catch(err => console.error('Background productivity sync failed:', err))
      .finally(() => setSyncing(false));
    }
  };

  // 1. Task Operations
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const newTask: Task = {
      id: `t_${Math.random().toString(36).substring(2, 9)}`,
      title: newTaskTitle,
      description: newTaskDesc,
      dueDate: today,
      completed: false,
      priority: newTaskPriority,
      pomodorosExpected: 2,
      pomodorosCompleted: 0
    };

    updateDb({
      ...db,
      tasks: [...db.tasks, newTask]
    });

    setNewTaskTitle('');
    setNewTaskDesc('');
    localDb.addXp(userId, 10); // Task created XP
  };

  const toggleTaskCompleted = (id: string) => {
    const updatedTasks = db.tasks.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          localDb.addXp(userId, 20); // Task completed XP
        }
        return { ...t, completed: nextCompleted };
      }
      return t;
    });

    updateDb({
      ...db,
      tasks: updatedTasks
    });
  };

  const deleteTask = (id: string) => {
    updateDb({
      ...db,
      tasks: db.tasks.filter(t => t.id !== id)
    });
    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }
  };

  // 2. Note Operations
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle) return;

    const newNote: Note = {
      id: `n_${Math.random().toString(36).substring(2, 9)}`,
      title: newNoteTitle,
      content: newNoteContent,
      updatedAt: today
    };

    updateDb({
      ...db,
      notes: [newNote, ...db.notes]
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setActiveNote(newNote);
    localDb.addXp(userId, 10); // Note created XP
  };

  const handleUpdateNoteContent = (content: string) => {
    if (!activeNote) return;
    const updatedNotes = db.notes.map(n => {
      if (n.id === activeNote.id) {
        return { ...n, content, updatedAt: today };
      }
      return n;
    });

    updateDb({
      ...db,
      notes: updatedNotes
    });
    setActiveNote({ ...activeNote, content, updatedAt: today });
  };

  const deleteNote = (id: string) => {
    updateDb({
      ...db,
      notes: db.notes.filter(n => n.id !== id)
    });
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  // 3. Pomodoro Timer logic
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerActive, timerMode]);

  const handleTimerComplete = () => {
    setTimerActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timerMode === 'work') {
      // Reward +25 XP
      localDb.addXp(userId, 25);
      
      // Update task pomodoro counts if one was selected
      if (selectedTask) {
        const updatedTasks = db.tasks.map(t => {
          if (t.id === selectedTask.id) {
            return { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 };
          }
          return t;
        });
        
        const newSession: FocusSession = {
          id: `fs_${Math.random().toString(36).substring(2, 9)}`,
          date: today,
          duration: 25,
          taskTitle: selectedTask.title
        };

        updateDb({
          ...db,
          tasks: updatedTasks,
          focusSessions: [newSession, ...db.focusSessions]
        });
      } else {
        const newSession: FocusSession = {
          id: `fs_${Math.random().toString(36).substring(2, 9)}`,
          date: today,
          duration: 25,
          taskTitle: 'General Focus Slot'
        };

        updateDb({
          ...db,
          focusSessions: [newSession, ...db.focusSessions]
        });
      }

      alert('Great job! You have completed a 25-minute Pomodoro session. Take a 5-minute break now!');
      setTimerMode('break');
      setTimerSeconds(5 * 60);
    } else {
      alert('Break is over! Time to get back to focused deep work!');
      setTimerMode('work');
      setTimerSeconds(25 * 60);
    }
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerMode('work');
    setTimerSeconds(25 * 60);
  };

  const formatTimerTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scores = localDb.calculateLifeScores(userId, 0);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Productivity Center
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
            Pomodoro Timers, High-Priority Tasks & Collaborative Scratchpads
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pomodoro Timer and Score Rating */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Productivity score */}
          <GlassCard className="p-6 bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border-indigo-500/20 flex flex-col justify-between h-40">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-1">Focus level</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-indigo-500 animate-pulse" /> Focus Index
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Calculated from task completion ratios and active Pomodoro focus sessions.
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-black font-mono text-indigo-500">{scores.productivityScore}/100</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  {scores.productivityScore >= 80 ? 'Deep Focus King' : scores.productivityScore >= 50 ? 'Steady Progress' : 'Scattered Focus'}
                </p>
              </div>
              <Award className="w-7 h-7 text-indigo-500/40" />
            </div>
          </GlassCard>

          {/* Pomodoro Focus Timer */}
          <GlassCard className="p-6 border-indigo-500/30 flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full mb-4">
              {timerMode === 'work' ? '🔥 Focus Mode Work' : '🍀 Relaxing Break'}
            </span>

            {/* Timer digits */}
            <div className="text-5xl font-extrabold tracking-tight font-mono text-slate-800 dark:text-white my-2 select-none">
              {formatTimerTime(timerSeconds)}
            </div>

            {selectedTask && (
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 mb-4 flex items-center gap-1">
                🎯 focusing on: <span className="text-indigo-500">{selectedTask.title}</span>
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={toggleTimer}
                className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  timerActive 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {timerActive ? (
                  <><Pause className="w-4 h-4" /> Pause session</>
                ) : (
                  <><Play className="w-4 h-4" /> Start focus</>
                )}
              </button>

              <button
                onClick={resetTimer}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 cursor-pointer"
                title="Reset timer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Micro instructions */}
            <p className="text-[9px] text-slate-400 font-semibold mt-4 leading-normal">
              Focus entirely on a single task without distractions. Completing a 25-minute Pomodoro gains +25 XP.
            </p>
          </GlassCard>
        </div>

        {/* Task Manager list */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
              <PlusCircle className="w-5 h-5 text-indigo-500" /> Quick Add Task
            </h3>
            <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solve 3 Leetcode questions"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e: any) => setNewTaskPriority(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
              <button
                type="submit"
                className="sm:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </form>
          </GlassCard>

          {/* Active tasks lists */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" /> Active Tasks Due Today
            </h3>

            <div className="flex flex-col gap-2.5">
              {db.tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                  No active tasks. Create your first task to unlock performance score gains!
                </div>
              ) : (
                db.tasks.map(t => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl transition-all border flex items-center justify-between ${
                      t.completed 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : selectedTask?.id === t.id
                        ? 'bg-indigo-500/5 border-indigo-500/30'
                        : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/40 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskCompleted(t.id)}
                        className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition cursor-pointer ${
                          t.completed 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <h4 className={`text-xs font-extrabold ${t.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[8px] font-bold uppercase text-slate-400">
                          <span className={`px-1.5 py-0.5 rounded ${
                            t.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                            t.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {t.priority}
                          </span>
                          <span>•</span>
                          <span>🍅 {t.pomodorosCompleted} completed</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!t.completed && (
                        <button
                          onClick={() => setSelectedTask(t)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-bold flex items-center gap-1 transition ${
                            selectedTask?.id === t.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5" /> Select for Pomodoro
                        </button>
                      )}
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5"
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

      {/* Notes Scratchpad Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Notes list */}
        <GlassCard className="p-6 md:col-span-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-500" /> Active Notes
          </h3>
          <form onSubmit={handleAddNote} className="flex flex-col gap-2 mb-4">
            <input
              type="text"
              required
              placeholder="New Note Title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
            >
              Add Clean Note
            </button>
          </form>

          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {db.notes.map(n => (
              <div
                key={n.id}
                onClick={() => setActiveNote(n)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  activeNote?.id === n.id
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-slate-50/50 dark:bg-white/5 border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[140px]">{n.title}</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(n.id);
                    }}
                    className="text-slate-400 hover:text-rose-500 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[8px] font-mono font-medium text-slate-400">{n.updatedAt}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Note Editor Scratchpad */}
        <GlassCard className="p-6 md:col-span-2">
          {activeNote ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-slate-200/20 pb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{activeNote.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono">Auto-saving locally</span>
              </div>
              <textarea
                value={activeNote.content}
                onChange={(e) => handleUpdateNoteContent(e.target.value)}
                placeholder="Start jotting down thoughts or project details here..."
                rows={10}
                className="w-full bg-transparent border-none text-xs leading-relaxed resize-none text-slate-700 dark:text-slate-200 focus:ring-0 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">Collaborative Scratchpad</h4>
              <p className="text-[10px] text-slate-400 max-w-[280px] mt-1.5 leading-relaxed">
                Select an active note from the left bar or create a new one to begin editing.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
