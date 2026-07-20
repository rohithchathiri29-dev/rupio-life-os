import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { localDb, JournalEntry } from '../lib/localDb.ts';
import { journalApi } from '../lib/api.ts';
import { motion } from 'motion/react';
import { 
  BookOpen, Calendar, Smile, Plus, Trash2, Search, 
  Download, FileText, Sparkles, Check, Heart, HelpCircle, RotateCw
} from 'lucide-react';

export const JournalScreen: React.FC = () => {
  const { user } = useApp();
  const userId = user?.id || 'demo';

  // State
  const [db, setDb] = useState(() => localDb.get(userId));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [journalType, setJournalType] = useState<'daily' | 'gratitude' | 'reflection'>('daily');
  const [syncing, setSyncing] = useState<boolean>(false);

  // New Journal form states
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<JournalEntry['mood']>('Calm');
  const [g1, setG1] = useState<string>('');
  const [g2, setG2] = useState<string>('');
  const [g3, setG3] = useState<string>('');
  const [reflection, setReflection] = useState<string>('');

  const today = new Date().toISOString().substring(0, 10);

  // Sync with server on mount
  useEffect(() => {
    if (!user) return;

    const syncWithServer = async () => {
      setSyncing(true);
      try {
        const localData = localDb.get(userId);
        const serverMerged = await journalApi.sync({
          journals: localData.journals
        });
        
        const updatedDb = {
          ...localData,
          journals: serverMerged.journals
        };
        setDb(updatedDb);
        localDb.save(userId, updatedDb);
      } catch (err) {
        console.error('Failed to sync journals with server', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithServer();
  }, [user, userId]);

  // Sync to database
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    localDb.save(userId, newDb);

    if (user) {
      setSyncing(true);
      journalApi.sync({
        journals: newDb.journals
      })
      .catch(err => console.error('Background journal sync failed:', err))
      .finally(() => setSyncing(false));
    }
  };

  // Add Journal Entry
  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const gratList = [g1, g2, g3].filter(Boolean);

    const newEntry: JournalEntry = {
      id: `jr_${Math.random().toString(36).substring(2, 9)}`,
      date: today,
      title,
      content,
      mood,
      gratitude: gratList,
      reflection,
      type: journalType
    };

    updateDb({
      ...db,
      journals: [newEntry, ...db.journals]
    });

    // Reset Form
    setTitle('');
    setContent('');
    setG1('');
    setG2('');
    setG3('');
    setReflection('');
    localDb.addXp(userId, 25); // +25 XP for writing a journal
  };

  // Delete Journal Entry
  const handleDeleteJournal = (id: string) => {
    updateDb({
      ...db,
      journals: db.journals.filter(j => j.id !== id)
    });
  };

  // Filtered journals
  const filteredJournals = db.journals.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          j.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          j.reflection.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Export journal logs to a simple client side text file
  const handleExport = () => {
    const textContent = db.journals.map(j => {
      return `DATE: ${j.date}\nTITLE: ${j.title}\nTYPE: ${j.type.toUpperCase()}\nMOOD: ${j.mood}\nCONTENT:\n${j.content}\n${
        j.gratitude.length > 0 ? `GRATITUDE:\n- ${j.gratitude.join('\n- ')}\n` : ''
      }${j.reflection ? `REFLECTION:\n${j.reflection}\n` : ''}\n-----------------------------\n`;
    }).join('\n');

    const element = document.createElement("a");
    const file = new Blob([textContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "rupio_life_journals.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Daily Journals & Reflection
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
            Lock in Mental Health Mood logs, Gratitude lists, and Deep reflections
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Journal entry form card */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <GlassCard className="p-6">
            <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-slate-200/20">
              {(['daily', 'gratitude', 'reflection'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setJournalType(type)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                    journalType === type
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {type} Entry
                </button>
              ))}
            </div>

            <form onSubmit={handleAddJournal} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Journal Entry Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunday Morning Mindset"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">How do you feel?</label>
                  <select
                    value={mood}
                    onChange={(e: any) => setMood(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="Calm">🧘 Calm</option>
                    <option value="Happy">☀️ Happy</option>
                    <option value="Productive">🎯 Productive</option>
                    <option value="Anxious">🌪️ Anxious</option>
                    <option value="Tired">💤 Tired</option>
                    <option value="Sad">🌧️ Sad</option>
                  </select>
                </div>
              </div>

              {journalType === 'daily' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Daily Log Content</label>
                  <textarea
                    required
                    placeholder="Write anything on your mind. Winnings, blocks, or general feelings..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed"
                  />
                </div>
              )}

              {journalType === 'gratitude' && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">List 3 Small Things You are Grateful for Today</span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="1. e.g. A hot cup of filter coffee"
                      value={g1}
                      onChange={(e) => setG1(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="2. e.g. Productive study slot"
                      value={g2}
                      onChange={(e) => setG2(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="3. e.g. Laughing with parents"
                      value={g3}
                      onChange={(e) => setG3(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {journalType === 'reflection' && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-start gap-2.5">
                    <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-indigo-500">Reflection Question</p>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-0.5">
                        What was the absolute biggest distraction in your life yesterday, and how will you prevent it today?
                      </p>
                    </div>
                  </div>
                  <textarea
                    required
                    placeholder="Reflect thoroughly on your focus blocks, social media consumption, and lifestyle goals..."
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Save Journal Entry (+25 XP)
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Saved journals list and filters */}
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Past Journals</h3>
              <button
                onClick={handleExport}
                className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-indigo-500 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-[10px] font-bold"
                title="Export Journal"
              >
                <Download className="w-4 h-4" /> Export All
              </button>
            </div>

            {/* Search filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold"
              />
            </div>

            {/* Journal log timeline list */}
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
              {filteredJournals.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold italic text-center py-8">No matching entries found.</p>
              ) : (
                filteredJournals.map(j => (
                  <div
                    key={j.id}
                    className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[8px] font-bold font-mono text-slate-400 uppercase tracking-widest">{j.date}</span>
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-white mt-0.5">{j.title}</h4>
                        <span className="text-[9px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md inline-block mt-1.5 uppercase">
                          {j.type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteJournal(j.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content snippet */}
                    {j.content && <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2.5 whitespace-pre-wrap">{j.content}</p>}

                    {/* Gratitude checks */}
                    {j.gratitude && j.gratitude.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[8px] font-bold uppercase text-emerald-500 block mb-1">Grateful for</span>
                        <ul className="text-[10px] text-slate-400 font-semibold flex flex-col gap-1 list-disc ml-4">
                          {j.gratitude.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Reflection */}
                    {j.reflection && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[8px] font-bold uppercase text-indigo-500 block mb-1">Deeper Reflection</span>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">"{j.reflection}"</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};
