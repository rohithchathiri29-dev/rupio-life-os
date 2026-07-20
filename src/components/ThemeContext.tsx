import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Notification } from '../types.js';
import { authApi, notificationsApi, getToken, clearToken, saveToken, transactionsApi, aiApi, healthApi } from '../lib/api.js';
import { localDb } from '../lib/localDb.ts';

const playHydrationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12); // D6
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 1.0);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 1.3);
  } catch (err) {
    console.warn('Procedural hydration chime failed:', err);
  }
};

interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  notifications: Notification[];
  unreadNotifCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  currencySymbol: string;
  formatAmount: (amount: number) => string;
  themePreset: 'frosted' | 'emerald' | 'obsidian' | 'cyberpunk';
  setThemePreset: (preset: 'frosted' | 'emerald' | 'obsidian' | 'cyberpunk') => void;
  score: number | null;
  transactionsCount: number;
  refreshSharedData: () => Promise<void>;
  
  // Water Tracker Globals
  todayWaterIntake: number;
  waterGoal: number;
  waterReminderInterval: number;
  waterReminderActive: boolean;
  waterTimeLeft: number;
  isWaterAlarmActive: boolean;
  logWater: (amount: number) => Promise<void>;
  updateWaterGoal: (goal: number) => Promise<void>;
  updateWaterReminderInterval: (minutes: number) => Promise<void>;
  updateWaterReminderActive: (active: boolean) => Promise<void>;
  resetWaterTimer: () => void;
  dismissWaterAlarm: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [themePreset, setThemePresetState] = useState<'frosted' | 'emerald' | 'obsidian' | 'cyberpunk'>(() => {
    const saved = localStorage.getItem('rupio_theme_preset');
    return (saved as any) || 'frosted';
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [transactionsCount, setTransactionsCount] = useState<number>(0);

  // Water Hydration States
  const [todayWaterIntake, setTodayWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoalValue] = useState<number>(2500);
  const [waterReminderInterval, setWaterReminderIntervalValue] = useState<number>(60);
  const [waterReminderActive, setWaterReminderActiveValue] = useState<boolean>(true);
  const [waterTimeLeft, setWaterTimeLeft] = useState<number>(60 * 60);
  const [isWaterAlarmActive, setIsWaterAlarmActive] = useState<boolean>(false);

  const userId = user?.id || 'demo';

  // Load and initialize water settings when user profile is ready/restored
  useEffect(() => {
    const ldb = localDb.get(userId);
    const todayStr = new Date().toISOString().substring(0, 10);
    setTodayWaterIntake(ldb.waterIntake?.[todayStr] || 0);
    
    // Server user profile could contain custom goal settings, we merge them
    const goalVal = (user as any)?.waterGoal || ldb.waterGoal || 2500;
    const intervalVal = (user as any)?.waterReminderInterval || ldb.waterReminderInterval || 60;
    const activeVal = (user as any)?.waterReminderActive !== undefined 
      ? (user as any).waterReminderActive 
      : (ldb.waterReminderActive !== false);

    setWaterGoalValue(goalVal);
    setWaterReminderIntervalValue(intervalVal);
    setWaterReminderActiveValue(activeVal);
    setWaterTimeLeft(intervalVal * 60);
    setIsWaterAlarmActive(false);
  }, [user, userId]);

  // Alarm Ticker Effect
  useEffect(() => {
    if (!waterReminderActive || isWaterAlarmActive || !user) return;

    const interval = setInterval(() => {
      setWaterTimeLeft(prev => {
        if (prev <= 1) {
          setIsWaterAlarmActive(true);
          playHydrationChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [waterReminderActive, isWaterAlarmActive, waterReminderInterval, user]);

  const logWater = async (amount: number) => {
    const ldb = localDb.get(userId);
    const todayStr = new Date().toISOString().substring(0, 10);
    const current = ldb.waterIntake[todayStr] || 0;
    const newVal = current + amount;
    
    ldb.waterIntake[todayStr] = newVal;
    localDb.save(userId, ldb);
    setTodayWaterIntake(newVal);
    
    // Add XP! +10 XP per hydration log
    localDb.addXp(userId, 10);

    // Reset countdown timer!
    setWaterTimeLeft(waterReminderInterval * 60);
    setIsWaterAlarmActive(false);

    // Background sync with server
    if (user) {
      try {
        await healthApi.sync({
          waterIntake: ldb.waterIntake,
          waterGoal: waterGoal,
          waterReminderInterval: waterReminderInterval,
          waterReminderActive: waterReminderActive,
          sleepLogs: ldb.sleepLogs || [],
          workouts: ldb.workouts || [],
          weightLogs: ldb.weightLogs || [],
          medications: ldb.medications || []
        } as any);
      } catch (err) {
        console.error('Background water sync failed', err);
      }
    }
  };

  const updateWaterGoal = async (goal: number) => {
    const ldb = localDb.get(userId);
    ldb.waterGoal = goal;
    localDb.save(userId, ldb);
    setWaterGoalValue(goal);

    if (user) {
      try {
        await healthApi.sync({
          waterIntake: ldb.waterIntake,
          waterGoal: goal,
          waterReminderInterval: waterReminderInterval,
          waterReminderActive: waterReminderActive,
          sleepLogs: ldb.sleepLogs || [],
          workouts: ldb.workouts || [],
          weightLogs: ldb.weightLogs || [],
          medications: ldb.medications || []
        } as any);
      } catch (err) {
        console.error('Background water goal sync failed', err);
      }
    }
  };

  const updateWaterReminderInterval = async (minutes: number) => {
    const ldb = localDb.get(userId);
    ldb.waterReminderInterval = minutes;
    localDb.save(userId, ldb);
    setWaterReminderIntervalValue(minutes);
    setWaterTimeLeft(minutes * 60);
    setIsWaterAlarmActive(false);

    if (user) {
      try {
        await healthApi.sync({
          waterIntake: ldb.waterIntake,
          waterGoal: waterGoal,
          waterReminderInterval: minutes,
          waterReminderActive: waterReminderActive,
          sleepLogs: ldb.sleepLogs || [],
          workouts: ldb.workouts || [],
          weightLogs: ldb.weightLogs || [],
          medications: ldb.medications || []
        } as any);
      } catch (err) {
        console.error('Background water interval sync failed', err);
      }
    }
  };

  const updateWaterReminderActive = async (active: boolean) => {
    const ldb = localDb.get(userId);
    ldb.waterReminderActive = active;
    localDb.save(userId, ldb);
    setWaterReminderActiveValue(active);
    if (active) {
      setWaterTimeLeft(waterReminderInterval * 60);
    }
    setIsWaterAlarmActive(false);

    if (user) {
      try {
        await healthApi.sync({
          waterIntake: ldb.waterIntake,
          waterGoal: waterGoal,
          waterReminderInterval: waterReminderInterval,
          waterReminderActive: active,
          sleepLogs: ldb.sleepLogs || [],
          workouts: ldb.workouts || [],
          weightLogs: ldb.weightLogs || [],
          medications: ldb.medications || []
        } as any);
      } catch (err) {
        console.error('Background water active sync failed', err);
      }
    }
  };

  const resetWaterTimer = () => {
    setWaterTimeLeft(waterReminderInterval * 60);
    setIsWaterAlarmActive(false);
  };

  const dismissWaterAlarm = () => {
    setIsWaterAlarmActive(false);
    // Snooze for another 10 minutes
    setWaterTimeLeft(10 * 60);
  };

  const refreshSharedData = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [txs, insights] = await Promise.all([
        transactionsApi.list(),
        aiApi.getInsights()
      ]);
      setTransactionsCount(txs.length);
      setScore(insights.score);
    } catch (err) {
      console.error('Failed to fetch shared data', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshSharedData();
    } else {
      setScore(null);
      setTransactionsCount(0);
    }
  }, [user]);

  const setThemePreset = (preset: 'frosted' | 'emerald' | 'obsidian' | 'cyberpunk') => {
    setThemePresetState(preset);
    localStorage.setItem('rupio_theme_preset', preset);
  };

  // Sync token and load user profile on startup
  useEffect(() => {
    const initApp = async () => {
      const token = getToken();
      if (token) {
        try {
          const profile = await authApi.me();
          setUser(profile);
          setTheme(profile.theme || 'dark');
        } catch (error) {
          console.error('Session restore failed, logging out', error);
          clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initApp();
  }, []);

  // Poll for notifications if logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        const list = await notificationsApi.list();
        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [user]);

  // Apply theme class to HTML node
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (user) {
      try {
        const updated = await authApi.updateProfile({ theme: nextTheme });
        setUser(updated);
      } catch (err) {
        console.error('Failed to persist theme settings on server', err);
      }
    }
  };

  const login = (userData: User, token: string) => {
    saveToken(token);
    setUser(userData);
    setTheme(userData.theme || 'dark');
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      const updated = await authApi.updateProfile(updates);
      setUser(updated);
      if (updates.theme) {
        setTheme(updates.theme);
      }
    } catch (err) {
      console.error('Failed to update user profile', err);
      throw err;
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const list = await notificationsApi.list();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to manual refresh notifications', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  const currencySymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : '$';

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      user,
      loading,
      login,
      logout,
      updateUser,
      notifications,
      unreadNotifCount,
      refreshNotifications,
      markNotificationRead,
      currencySymbol,
      formatAmount,
      themePreset,
      setThemePreset,
      score,
      transactionsCount,
      refreshSharedData,
      todayWaterIntake,
      waterGoal,
      waterReminderInterval,
      waterReminderActive,
      waterTimeLeft,
      isWaterAlarmActive,
      logWater,
      updateWaterGoal,
      updateWaterReminderInterval,
      updateWaterReminderActive,
      resetWaterTimer,
      dismissWaterAlarm
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useApp must be used within a ThemeProvider');
  }
  return context;
};
