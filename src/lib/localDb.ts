/**
 * Rupio Life OS Offline Database
 * Client-Side Persistence with Per-User Namespacing
 */

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface WorkoutLog {
  id: string;
  date: string;
  type: string; // "Running", "Gym", "Yoga", "Walking"
  duration: number; // minutes
  calories: number;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number; // kg
  height: number; // cm
  bmi: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reminderTime: string;
  active: boolean;
}

export interface Habit {
  id: string;
  name: string;
  category: 'Morning Routine' | 'Night Routine' | 'Reading' | 'Meditation' | 'Exercise' | 'Study' | 'Coding' | 'Custom';
  frequency: 'daily' | 'weekly';
  streak: number;
  lastCompleted?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface RecoveryTracker {
  id: string;
  name: string; // "Alcohol", "Smoking", "Social Media", "Gaming", "Adult Content"
  startDate: string; // YYYY-MM-DD
  dailyCost: number; // money saved calculation
  cravingCount: number;
}

export interface CravingLog {
  id: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  trigger: string;
  note: string;
}

export interface RecoveryCheckin {
  id: string;
  date: string;
  mood: 'Excellent' | 'Good' | 'Neutral' | 'Struggling';
  note: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  pomodorosExpected: number;
  pomodorosCompleted: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  date: string;
  duration: number; // minutes
  taskTitle: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'Happy' | 'Calm' | 'Productive' | 'Anxious' | 'Tired' | 'Sad';
  gratitude: string[];
  reflection: string;
  type: 'daily' | 'gratitude' | 'reflection';
}

export interface LifeGoal {
  id: string;
  name: string;
  category: 'savings' | 'health' | 'habit' | 'study' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  completed: boolean;
}

export interface GamificationState {
  xp: number;
  level: number;
  unlockedAchievements: string[]; // ids of achievements
}

export interface LifeDbSchema {
  waterIntake: Record<string, number>; // YYYY-MM-DD -> ml
  waterGoal?: number;
  waterReminderInterval?: number;
  waterReminderActive?: boolean;
  sleepLogs: SleepLog[];
  workouts: WorkoutLog[];
  weightLogs: WeightLog[];
  medications: Medication[];
  habits: Habit[];
  habitCompletions: Record<string, Record<string, boolean>>; // habitId -> date -> completed
  recoveryTrackers: RecoveryTracker[];
  cravings: CravingLog[];
  recoveryCheckins: RecoveryCheckin[];
  tasks: Task[];
  notes: Note[];
  focusSessions: FocusSession[];
  journals: JournalEntry[];
  lifeGoals: LifeGoal[];
  gamification: GamificationState;
}

const defaultLifeDb = (userId: string): LifeDbSchema => {
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().substring(0, 10);

  return {
    waterIntake: {
      [today]: 1200,
      [yesterday]: 2500,
      [twoDaysAgo]: 2800,
    },
    sleepLogs: [
      { id: 's1', date: today, hours: 7.5, quality: 'Good' },
      { id: 's2', date: yesterday, hours: 8, quality: 'Excellent' },
      { id: 's3', date: twoDaysAgo, hours: 6.2, quality: 'Fair' },
    ],
    workouts: [
      { id: 'w1', date: yesterday, type: 'Running', duration: 30, calories: 350 },
      { id: 'w2', date: twoDaysAgo, type: 'Yoga', duration: 45, calories: 180 },
    ],
    weightLogs: [
      { id: 'wt1', date: twoDaysAgo, weight: 72.5, height: 178, bmi: 22.9 },
    ],
    medications: [
      { id: 'm1', name: 'Multivitamins', dosage: '1 tablet', frequency: 'daily', reminderTime: '08:30', active: true },
      { id: 'm2', name: 'Omega-3 Fish Oil', dosage: '1 capsule', frequency: 'daily', reminderTime: '13:00', active: true },
    ],
    habits: [
      { id: 'h1', name: 'Morning Meditation', category: 'Meditation', frequency: 'daily', streak: 4, createdAt: twoDaysAgo },
      { id: 'h2', name: 'Read 10 Pages', category: 'Reading', frequency: 'daily', streak: 12, createdAt: twoDaysAgo },
      { id: 'h3', name: 'Code 1 Hour', category: 'Coding', frequency: 'daily', streak: 6, createdAt: twoDaysAgo },
    ],
    habitCompletions: {
      'h1': { [today]: false, [yesterday]: true, [twoDaysAgo]: true },
      'h2': { [today]: true, [yesterday]: true, [twoDaysAgo]: true },
      'h3': { [today]: true, [yesterday]: true, [twoDaysAgo]: true },
    },
    recoveryTrackers: [
      { id: 'rec1', name: 'Alcohol', startDate: new Date(Date.now() - 15 * 86400000).toISOString().substring(0, 10), dailyCost: 450, cravingCount: 2 },
      { id: 'rec2', name: 'Smoking', startDate: new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10), dailyCost: 200, cravingCount: 1 },
      { id: 'rec3', name: 'Social Media Block', startDate: new Date(Date.now() - 5 * 86400000).toISOString().substring(0, 10), dailyCost: 0, cravingCount: 8 },
    ],
    cravings: [
      { id: 'cr1', date: yesterday, severity: 'medium', trigger: 'Stressful meeting', note: 'Resisted by drinking a glass of cold water' },
    ],
    recoveryCheckins: [
      { id: 'ch1', date: today, mood: 'Good', note: 'Feeling strong and clear-headed.' },
      { id: 'ch2', date: yesterday, mood: 'Excellent', note: 'Productive day, no urges.' },
    ],
    tasks: [
      { id: 't1', title: 'Complete Weekly Budget Review', description: 'Check statement outliers and categorize expenses.', dueDate: today, completed: false, priority: 'high', pomodorosExpected: 2, pomodorosCompleted: 1 },
      { id: 't2', title: 'Read Chapter 4 of Atomic Habits', description: 'Note down system improvement concepts.', dueDate: today, completed: true, priority: 'medium', pomodorosExpected: 1, pomodorosCompleted: 1 },
      { id: 't3', title: 'Plan Gym Routine for Week', description: 'Schedule push/pull split days.', dueDate: today, completed: false, priority: 'low', pomodorosExpected: 1, pomodorosCompleted: 0 },
    ],
    notes: [
      { id: 'n1', title: 'Lifestyle Optimization Rules', content: '1. No screens after 10 PM\n2. Log every single spending immediately\n3. Drink 1 cup of water every hour\n4. Write down 3 highlights daily', updatedAt: today },
    ],
    focusSessions: [
      { id: 'f1', date: yesterday, duration: 25, taskTitle: 'Read Chapter 4 of Atomic Habits' },
    ],
    journals: [
      { 
        id: 'j1', 
        date: today, 
        title: 'Sunday Clarity', 
        content: 'Woke up early, meditated for 15 minutes. Ready to tackle the new week with focus. Budgeting is solid, habits are sticking!', 
        mood: 'Calm', 
        gratitude: ['Deep restful sleep', 'Fresh morning air', 'Healthy homemade lunch'], 
        reflection: 'I need to make sure I do not spend too much time on social media during late afternoons.', 
        type: 'daily' 
      },
    ],
    lifeGoals: [
      { id: 'lg1', name: 'Achieve Perfect Weight', category: 'health', targetValue: 70, currentValue: 72.5, unit: 'kg', targetDate: '2026-09-01', completed: false },
      { id: 'lg2', name: 'Finish 12 Books this Year', category: 'study', targetValue: 12, currentValue: 4, unit: 'books', targetDate: '2026-12-31', completed: false },
      { id: 'lg3', name: 'Maintain 30-Day MedStreak', category: 'habit', targetValue: 30, currentValue: 18, unit: 'days', targetDate: '2026-08-15', completed: false },
    ],
    gamification: {
      xp: 280,
      level: 3,
      unlockedAchievements: ['discipline_initiate', 'water_apprentice', 'sobriety_beacon']
    }
  };
};

export const localDb = {
  get(userId: string): LifeDbSchema {
    const key = `rupio_life_db_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) {
      const defaultData = defaultLifeDb(userId);
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    try {
      return JSON.parse(data) as LifeDbSchema;
    } catch {
      const defaultData = defaultLifeDb(userId);
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
  },

  save(userId: string, data: LifeDbSchema): void {
    const key = `rupio_life_db_${userId}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  addXp(userId: string, amount: number): { xp: number; level: number; leveledUp: boolean } {
    const data = this.get(userId);
    let currentXp = data.gamification.xp + amount;
    let currentLevel = data.gamification.level;
    let leveledUp = false;

    // Define Level progression formula: 100 XP per level
    const requiredXp = currentLevel * 100;
    if (currentXp >= requiredXp) {
      currentXp = currentXp - requiredXp;
      currentLevel += 1;
      leveledUp = true;
    }

    data.gamification.xp = currentXp;
    data.gamification.level = currentLevel;

    // Track standard badges dynamically
    const achievements = data.gamification.unlockedAchievements;
    if (amount > 0) {
      if (amount >= 50 && !achievements.includes('major_completion')) {
        achievements.push('major_completion');
      }
    }

    this.save(userId, data);
    return { xp: currentXp, level: currentLevel, leveledUp };
  },

  calculateLifeScores(userId: string, financeTransactionsLength: number): {
    financeScore: number;
    healthScore: number;
    habitScore: number;
    recoveryScore: number;
    productivityScore: number;
    overallScore: number;
  } {
    const data = this.get(userId);
    const today = new Date().toISOString().substring(0, 10);

    // 1. Finance Score (0 - 100)
    // Formula: Based on transactions counted. Let's make it healthy base 70 + based on balance or transactions logged
    let financeScore = 75;
    if (financeTransactionsLength > 10) financeScore += 10;
    else if (financeTransactionsLength > 3) financeScore += 5;
    if (financeScore > 100) financeScore = 100;

    // 2. Health Score (0 - 100)
    // Formula: Water intake today (40%), Sleep logged (30%), Workouts logged (30%)
    const waterToday = data.waterIntake[today] || 0;
    const waterRatio = Math.min(waterToday / 2500, 1); // target 2.5L
    
    const recentSleep = data.sleepLogs[0]?.hours || 7;
    const sleepDiff = Math.abs(recentSleep - 7.5);
    const sleepScore = Math.max(100 - (sleepDiff * 15), 0); // ideal 7.5 hours

    const workoutCount = data.workouts.length;
    const workoutScore = Math.min(workoutCount * 25, 100);

    const healthScore = Math.round((waterRatio * 40) + (sleepScore * 0.3) + (workoutScore * 0.3));

    // 3. Habit Score (0 - 100)
    // Formula: Habits completed today vs total habits
    const totalHabits = data.habits.length;
    let completedHabits = 0;
    data.habits.forEach(h => {
      if (data.habitCompletions[h.id]?.[today]) {
        completedHabits += 1;
      }
    });
    const habitCompletionRatio = totalHabits > 0 ? (completedHabits / totalHabits) : 0.5;
    
    // Streaks bonus
    const maxStreak = data.habits.reduce((max, h) => h.streak > max ? h.streak : max, 0);
    const streakBonus = Math.min(maxStreak * 2, 20);
    const habitScore = Math.round(Math.min((habitCompletionRatio * 80) + streakBonus, 100));

    // 4. Recovery Score (0 - 100)
    // Formula: Average clean days across trackers, minus cravings severity
    let recoveryScore = 100;
    if (data.recoveryTrackers.length > 0) {
      let totalCleanDays = 0;
      data.recoveryTrackers.forEach(r => {
        const start = new Date(r.startDate).getTime();
        const diffDays = Math.max(0, Math.floor((Date.now() - start) / 86400000));
        totalCleanDays += diffDays;
      });
      const avgCleanDays = totalCleanDays / data.recoveryTrackers.length;
      recoveryScore = Math.min(60 + Math.round(avgCleanDays), 100);
      
      // Deduct for cravings today or yesterday
      const currentCravings = data.cravings.length;
      recoveryScore = Math.max(recoveryScore - (currentCravings * 5), 30);
    }

    // 5. Productivity Score (0 - 100)
    // Formula: Task completion rate today (60%), focus session hours (40%)
    const tasksToday = data.tasks.filter(t => t.dueDate === today);
    const completedTasksToday = tasksToday.filter(t => t.completed).length;
    const taskRatio = tasksToday.length > 0 ? (completedTasksToday / tasksToday.length) : 0.8;

    const focusCount = data.focusSessions.length;
    const focusScore = Math.min(focusCount * 30, 100);

    const productivityScore = Math.round((taskRatio * 60) + (focusScore * 0.4));

    // Overall Life Score
    const overallScore = Math.round((financeScore + healthScore + habitScore + recoveryScore + productivityScore) / 5);

    return {
      financeScore,
      healthScore,
      habitScore,
      recoveryScore,
      productivityScore,
      overallScore
    };
  }
};

export const ACHIEVEMENTS_LIST = [
  { id: 'discipline_initiate', name: 'Discipline Initiate', description: 'Log in and configure your habits profile.', badge: '🛡️' },
  { id: 'water_apprentice', name: 'Water Apprentice', description: 'Achieve daily 2.5L water target.', badge: '💧' },
  { id: 'sobriety_beacon', name: 'Sobriety Beacon', description: 'Stay alcohol/substance clean for over 10 days.', badge: '🌟' },
  { id: 'productivity_machine', name: 'Deep Focus Master', description: 'Complete a continuous 25-min Pomodoro focus session.', badge: '⏱️' },
  { id: 'financial_expert', name: 'Financial Expert', description: 'Maintained total spends below monthly limits.', badge: '💰' },
  { id: 'streak_king', name: 'Streak King', description: 'Maintain a 7+ day continuous streak in any routine.', badge: '👑' },
  { id: 'major_completion', name: 'Life Mastery', description: 'Earn over 500 total XP inside Rupio.', badge: '🏆' }
];
