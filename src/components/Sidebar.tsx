import React, { useState } from 'react';
import { useApp } from './ThemeContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, CreditCard, Sliders, Target, Sparkles, Settings, LogOut, Sun, Moon, Bell, Check, X, Wallet,
  Activity, CheckSquare, Flame, Briefcase, BookOpen, Award, Search
} from 'lucide-react';

interface SidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeScreen, setActiveScreen }) => {
  const { 
    user, logout, theme, toggleTheme, notifications, unreadNotifCount, markNotificationRead, formatAmount,
    score, transactionsCount
  } = useApp();
  
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Wallet },
    { id: 'budgets', label: 'Budgets', icon: Sliders },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'health', label: 'Health Hub', icon: Activity },
    { id: 'habits', label: 'Habit Builder', icon: CheckSquare },
    { id: 'recovery', label: 'Recovery Track', icon: Flame },
    { id: 'productivity', label: 'Productivity', icon: Briefcase },
    { id: 'journal', label: 'Daily Journal', icon: BookOpen },
    { id: 'growth', label: 'Life Score & XP', icon: Award },
    { id: 'search', label: 'Global Search', icon: Search },
    { id: 'ai', label: 'Rupio AI Advisor', icon: Sparkles },
    { id: 'profile', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Dynamic Header on mobile / Desktop sidebar layout rail */}
      <aside className="w-full lg:w-64 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200/40 dark:border-white/10 flex lg:flex-col justify-between p-4 lg:p-6 lg:h-screen sticky top-0 z-40 transition-colors duration-300 shadow-2xl shadow-slate-100/10 dark:shadow-black/20 overflow-y-auto">
        
        {/* Top Branding Section */}
        <div className="flex lg:flex-col gap-8 w-full lg:w-auto items-center lg:items-stretch justify-between lg:justify-start">
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 border border-blue-400/20">
              <Wallet className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:text-white">Rupio</span>
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest leading-none mt-0.5">Asset manager</p>
            </div>
          </div>

          {/* Nav list on desktop - hidden on mobile */}
          <nav className="hidden lg:flex flex-col gap-1 w-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer border ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/10 border-blue-500/10 dark:border-blue-500/10 shadow-sm shadow-blue-500/5' 
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent border-transparent hover:bg-slate-50/30 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  {item.label}
                  {item.id === 'ai' && (
                    <span className="ml-auto bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      Live
                    </span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator" 
                      className="absolute left-0 w-1 top-2.5 bottom-2.5 bg-blue-600 dark:bg-blue-500 rounded-r-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* AI Financial Score Card on desktop - hidden on mobile */}
          <div className="hidden lg:block mt-6 p-4 bg-white/30 dark:bg-white/5 rounded-2xl backdrop-blur-md border border-slate-200/40 dark:border-white/10 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">AI Financial Score</div>
            {transactionsCount < 3 ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-400">N/A</span>
                  <span className="text-[9px] font-bold text-slate-400 pb-1 leading-none">Need 3+ txn</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-slate-300 dark:bg-slate-700 w-0 h-full"></div>
                </div>
                <p className="text-[9px] text-slate-400 font-medium mt-1.5 leading-tight">Add 3 transactions to generate score</p>
              </>
            ) : (
              (() => {
                const s = score ?? 72;
                let ratingLabel = 'Excellent';
                let ratingColor = 'text-emerald-500 dark:text-emerald-400';
                let barColor = 'bg-emerald-500 dark:bg-emerald-400';
                let barWidth = `${s}%`;
                
                if (s < 40) {
                  ratingLabel = 'Poor';
                  ratingColor = 'text-rose-500 dark:text-rose-400';
                  barColor = 'bg-rose-500 dark:bg-rose-400';
                } else if (s < 60) {
                  ratingLabel = 'Fair';
                  ratingColor = 'text-amber-500 dark:text-amber-400';
                  barColor = 'bg-amber-500 dark:bg-amber-400';
                } else if (s < 80) {
                  ratingLabel = 'Strong';
                  ratingColor = 'text-indigo-500 dark:text-indigo-400';
                  barColor = 'bg-indigo-500 dark:bg-indigo-400';
                }
                
                return (
                  <>
                    <div className="flex items-end gap-2">
                      <span className={`text-2xl font-black ${ratingColor}`}>{s}</span>
                      <span className={`text-[10px] font-extrabold ${ratingColor} pb-1`}>{ratingLabel}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className={`${barColor} h-full`} style={{ width: barWidth }}></div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>

        {/* Desktop Profile card, theme switch & sign out action */}
        <div className="flex items-center lg:flex-col gap-4">
          
          {/* Notifications Alert Bell & Theme toggler */}
          <div className="flex items-center gap-2 lg:w-full lg:justify-between lg:border-t lg:border-slate-200/30 lg:dark:border-white/10 lg:pt-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100/50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200/40 dark:border-white/10 transition-all cursor-pointer shadow-sm"
              title="Toggle layout theme"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Notification bell and badge indicator */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-xl bg-slate-100/50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200/40 dark:border-white/10 transition-all cursor-pointer relative shadow-sm"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {/* Notification Overlay Popup Dropdown */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="absolute bottom-12 right-0 lg:left-0 lg:bottom-12 w-64 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden z-50 text-xs"
                  >
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200/30 dark:border-white/10 flex justify-between items-center font-bold">
                      <span className="text-slate-700 dark:text-slate-200">Alerts Logs</span>
                      <button onClick={() => setIsNotifOpen(false)}>
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/20">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 font-semibold">No alerts active.</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 transition-colors ${n.isRead ? 'opacity-60' : 'bg-blue-500/5 dark:bg-blue-500/10'}`}>
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-semibold text-slate-700 dark:text-slate-200 leading-normal">{n.message}</p>
                              {!n.isRead && (
                                <button 
                                  onClick={() => markNotificationRead(n.id)}
                                  className="text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 p-1 rounded transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-[8px] font-mono font-medium text-slate-400 mt-1 block">System Alert</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Logout Trigger button */}
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl bg-slate-100/50 hover:bg-rose-500/10 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-slate-200/40 dark:border-white/10 lg:border-none transition-all cursor-pointer lg:w-full lg:flex lg:items-center lg:gap-3 lg:px-4"
            title="Secure Sign Out"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            <span className="hidden lg:inline text-xs font-bold text-slate-400 hover:text-rose-500">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Horizontal Nav Bar specifically on mobile screens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border-t border-slate-200/40 dark:border-white/10 flex justify-around p-2.5 z-40 transition-colors duration-300">
        {menuItems.filter(item => ['dashboard', 'transactions', 'health', 'habits', 'productivity'].includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-bold ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
};
