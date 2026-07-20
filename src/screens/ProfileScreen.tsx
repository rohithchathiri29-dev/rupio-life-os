import React, { useState, useEffect } from 'react';
import { useApp } from '../components/ThemeContext.tsx';
import { GlassCard } from '../components/GlassCard.tsx';
import { authApi, transactionsApi } from '../lib/api.ts';
import { 
  User, CreditCard, Shield, Globe, Bell, RefreshCw, AlertCircle, CheckCircle, Trash2, Camera, Sparkles 
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { user, updateUser, logout, formatAmount, themePreset, setThemePreset } = useApp();
  
  // Profile info states
  const [fullName, setFullName] = useState<string>(user?.fullName || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'INR'>(user?.currency || 'USD');
  const [language, setLanguage] = useState<'EN' | 'ES' | 'HI'>(user?.language || 'EN');
  
  // Notification toggle states (simulated offline/local state since they persist instantly)
  const [notifTx, setNotifTx] = useState<boolean>(true);
  const [notifBudget, setNotifBudget] = useState<boolean>(true);
  const [notifGoal, setNotifGoal] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wantsDeleteAccount, setWantsDeleteAccount] = useState<boolean>(false);
  const [txCount, setTxCount] = useState<number>(0);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const txs = await transactionsApi.list();
        setTxCount(txs.length);
      } catch {
        // ignore
      }
    };
    fetchMetadata();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await updateUser({
        fullName,
        email,
        currency,
        language
      });
      setSuccess('Profile settings successfully updated and synced.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await authApi.deleteAccount();
      logout();
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12 select-none">
      {/* Header */}
      <div className="border-b border-slate-200/40 dark:border-slate-800/40 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Settings & Profile</h1>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">Configure account options & alerts</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Avatar Display card */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20">
                {user?.fullName.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute inset-0 bg-slate-950/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">{user?.fullName}</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{user?.email}</p>

            {/* Micro stats summary */}
            <div className="w-full border-t border-slate-200/30 dark:border-slate-800/30 pt-4 mt-5 flex justify-around text-center">
              <div>
                <p className="text-sm font-bold font-mono text-slate-800 dark:text-white">{txCount}</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
              </div>
              <div>
                <p className="text-sm font-bold font-mono text-slate-800 dark:text-white">Active</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              </div>
            </div>
          </GlassCard>

          {/* Security Action block */}
          <GlassCard className="p-5 border-rose-500/20">
            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Security Safeguard
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-normal mb-4">
              Erase account logs and lock credit data permanently.
            </p>
            {wantsDeleteAccount ? (
              <div className="flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 border border-rose-500/30 p-3 rounded-2xl bg-rose-500/5">
                <p className="text-[10px] text-rose-500 font-extrabold text-center leading-normal">
                  CRITICAL: This permanently erases all cash flows, budgets, and savings goals. Are you 100% sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer transition-all shadow-sm"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setWantsDeleteAccount(false)}
                    className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-[10px] cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setWantsDeleteAccount(true)}
                className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Erase Entire Profile
              </button>
            )}
          </GlassCard>
        </div>

        {/* Right Side: Settings inputs form */}
        <div className="md:col-span-2">
          <GlassCard className="p-8">
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
              {/* Profile Fields Group */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/30 dark:border-slate-800/30 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-blue-500" /> Identity Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none opacity-60"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Premium Interface Styles Selector */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/30 dark:border-slate-800/30 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-blue-500" /> Premium Interface Styles
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'frosted', name: 'Frosted Glass', desc: 'Glowing indigo blurs & frosted cards', colors: ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500'] },
                    { id: 'emerald', name: 'Mint Emerald', desc: 'Fresh green outlines & minty glows', colors: ['bg-emerald-500', 'bg-teal-500', 'bg-lime-500'] },
                    { id: 'obsidian', name: 'Royal Obsidian', desc: 'Luxury black with gold/amber highlights', colors: ['bg-amber-500', 'bg-yellow-600', 'bg-slate-800'] },
                    { id: 'cyberpunk', name: 'Cyberpunk Synth', desc: 'Electric hot pink & electric cyan lines', colors: ['bg-pink-500', 'bg-purple-600', 'bg-cyan-400'] },
                  ].map((p) => {
                    const isActive = themePreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setThemePreset(p.id as any)}
                        className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                          isActive 
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-400/5 shadow-md' 
                            : 'border-slate-200/40 dark:border-slate-800/60 bg-slate-100/10 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-[11px] font-black text-slate-800 dark:text-white leading-tight">{p.name}</p>
                          <span className="text-[9px] text-slate-400 font-semibold leading-tight block mt-0.5">{p.desc}</span>
                        </div>
                        
                        {/* Dot indicator bars to preview theme colors */}
                        <div className="flex gap-1 mt-2">
                          {p.colors.map((c, idx) => (
                            <span key={idx} className={`w-3.5 h-1.5 rounded-full ${c}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Preferences Group */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/30 dark:border-slate-800/30 mb-4 flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-blue-500" /> Preferences & Region
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Base Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    >
                      <option value="USD">USD ($) US Dollar</option>
                      <option value="INR">INR (₹) Indian Rupee</option>
                      <option value="EUR">EUR (€) Euro Currency</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">System Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none"
                    >
                      <option value="EN">English (EN)</option>
                      <option value="ES">Spanish (ES)</option>
                      <option value="HI">Hindi (HI)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Alert Preferences Group */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200/30 dark:border-slate-800/30 mb-4 flex items-center gap-2">
                  <Bell className="w-4.5 h-4.5 text-blue-500" /> Security Push Notifications
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="text-slate-700 dark:text-slate-200">Transaction Notifications</p>
                      <span className="text-[10px] text-slate-400 font-medium">Alert upon every single incoming / outgoing log entry</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifTx} 
                      onChange={(e) => setNotifTx(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="text-slate-700 dark:text-slate-200">Budget Overdraft Safeguard</p>
                      <span className="text-[10px] text-slate-400 font-medium">Alert when category spending triggers 80% quota cap</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifBudget} 
                      onChange={(e) => setNotifBudget(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="text-slate-700 dark:text-slate-200">Savings Target Milestones</p>
                      <span className="text-[10px] text-slate-400 font-medium">Congratulate upon full target achievements of goals</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifGoal} 
                      onChange={(e) => setNotifGoal(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" 
                    />
                  </div>
                </div>
              </div>

              {/* Update profile button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Synchronize Settings'}
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
