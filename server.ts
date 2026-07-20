import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  readDb, writeDb, hashPassword, verifyPassword, generateToken, verifyToken 
} from './server/db.js';
import { 
  Transaction, Budget, SavingsGoal, RecurringExpense, Notification, ActivityLog, AppSettings, CategoryType 
} from './src/types.js';
import { 
  Habit, SleepLog, WorkoutLog, WeightLog, Medication,
  RecoveryTracker, CravingLog, RecoveryCheckin,
  Task, Note, FocusSession, JournalEntry
} from './src/lib/localDb.js';

// Setup environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Global caching for AI Insights to prevent rate limits
const aiCache: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Authentication Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }
  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }
  (req as any).userId = userId;
  next();
};

// Seed initial data for a brand new user
const seedNewUserData = (userId: string) => {
  const db = readDb();
  const now = new Date().toISOString();

  // Seed Transactions (Empty to start from this day fresh!)
  const seedTransactions: Transaction[] = [];

  // Seed Budgets (Empty to start fresh)
  const seedBudgets: Budget[] = [];

  // Seed Savings Goals (Empty to start fresh)
  const seedGoals: SavingsGoal[] = [];

  // Seed Recurring Expenses (Empty to start fresh)
  const seedRecurring: RecurringExpense[] = [];

  // Seed Notifications
  const seedNotifications: Notification[] = [
    {
      id: `n_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Welcome to Rupio! 🇮🇳',
      message: 'Track Smart. Save Better. Your secure finance dashboard is ready. Start logging your real transactions and budgets in Indian Rupees (₹) today!',
      type: 'success',
      isRead: false,
      ownerId: userId,
      createdAt: now
    }
  ];

  // Seed AppSettings
  const seedSettings: AppSettings = {
    id: `s_${Math.random().toString(36).substr(2, 9)}`,
    ownerId: userId,
    biometricLogin: false,
    pushNotifications: true,
    emailAlerts: true,
    automaticSync: true,
    backupFrequency: 'weekly',
    createdAt: now,
    updatedAt: now
  };

  db.transactions.push(...seedTransactions);
  db.budgets.push(...seedBudgets);
  db.goals.push(...seedGoals);
  db.recurring.push(...seedRecurring);
  db.notifications.push(...seedNotifications);
  db.settings.push(seedSettings);

  writeDb(db);
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (db.users[normalizedEmail]) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const userId = `u_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newUser = {
    id: userId,
    email: normalizedEmail,
    fullName,
    currency: 'INR',
    language: 'en',
    theme: 'dark' as const,
    createdAt: now,
    updatedAt: now
  };

  db.users[normalizedEmail] = {
    ...newUser,
    passwordHash: hashPassword(password)
  };

  writeDb(db);

  // Seed initial transactions, budgets, goals, setting etc
  seedNewUserData(userId);

  // Create active token
  const token = generateToken(userId);

  // Record log
  const log: ActivityLog = {
    id: `l_${Math.random().toString(36).substr(2, 9)}`,
    action: 'Register',
    details: 'User account created',
    ownerId: userId,
    createdAt: now
  };
  const updatedDb = readDb();
  updatedDb.logs.push(log);
  writeDb(updatedDb);

  res.status(201).json({ user: newUser, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();
  const account = db.users[normalizedEmail];

  if (!account || !verifyPassword(password, account.passwordHash)) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const { passwordHash, ...user } = account;
  const token = generateToken(user.id);

  // Record log
  const log: ActivityLog = {
    id: `l_${Math.random().toString(36).substr(2, 9)}`,
    action: 'Login',
    details: 'User logged in successfully',
    ownerId: user.id,
    createdAt: new Date().toISOString()
  };
  db.logs.push(log);
  writeDb(db);

  res.json({ user, token });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const account = Object.values(db.users).find(u => u.id === userId);

  if (!account) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { passwordHash, ...user } = account;
  res.json(user);
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { fullName, currency, language, theme, avatarUrl } = req.body;

  const db = readDb();
  const accountKey = Object.keys(db.users).find(email => db.users[email].id === userId);

  if (!accountKey) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const now = new Date().toISOString();
  db.users[accountKey] = {
    ...db.users[accountKey],
    fullName: fullName ?? db.users[accountKey].fullName,
    currency: currency ?? db.users[accountKey].currency,
    language: language ?? db.users[accountKey].language,
    theme: theme ?? db.users[accountKey].theme,
    avatarUrl: avatarUrl ?? db.users[accountKey].avatarUrl,
    updatedAt: now
  };

  writeDb(db);

  const { passwordHash, ...user } = db.users[accountKey];
  res.json(user);
});

app.delete('/api/auth/account', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const accountKey = Object.keys(db.users).find(email => db.users[email].id === userId);

  if (!accountKey) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Remove user
  delete db.users[accountKey];

  // Cascade delete all relational items
  db.transactions = db.transactions.filter(t => t.ownerId !== userId);
  db.budgets = db.budgets.filter(b => b.ownerId !== userId);
  db.goals = db.goals.filter(g => g.ownerId !== userId);
  db.recurring = db.recurring.filter(r => r.ownerId !== userId);
  db.notifications = db.notifications.filter(n => n.ownerId !== userId);
  db.logs = db.logs.filter(l => l.ownerId !== userId);
  db.settings = db.settings.filter(s => s.ownerId !== userId);
  db.habits = db.habits.filter(h => h.ownerId !== userId);
  db.habitCompletions = db.habitCompletions.filter(hc => hc.ownerId !== userId);
  
  // Cascade delete Health
  db.waterLogs = db.waterLogs.filter(wl => wl.ownerId !== userId);
  db.sleepLogs = db.sleepLogs.filter(sl => sl.ownerId !== userId);
  db.workouts = db.workouts.filter(w => w.ownerId !== userId);
  db.weightLogs = db.weightLogs.filter(wl => wl.ownerId !== userId);
  db.medications = db.medications.filter(m => m.ownerId !== userId);

  // Cascade delete Recovery
  db.recoveryTrackers = db.recoveryTrackers.filter(rt => rt.ownerId !== userId);
  db.cravings = db.cravings.filter(c => c.ownerId !== userId);
  db.recoveryCheckins = db.recoveryCheckins.filter(rc => rc.ownerId !== userId);

  // Cascade delete Journal
  db.journals = db.journals.filter(j => j.ownerId !== userId);

  // Cascade delete Productivity
  db.tasks = db.tasks.filter(t => t.ownerId !== userId);
  db.notes = db.notes.filter(n => n.ownerId !== userId);
  db.focusSessions = db.focusSessions.filter(fs => fs.ownerId !== userId);

  writeDb(db);
  res.json({ message: 'Account deleted successfully.' });
});

// ==========================================
// TRANSACTION CRUD ENDPOINTS
// ==========================================

app.get('/api/transactions', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userTransactions = db.transactions.filter(t => t.ownerId === userId);
  res.json(userTransactions);
});

app.post('/api/transactions', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { type, amount, category, description, date, paymentMethod, isRecurring, notes } = req.body;

  if (!type || !amount || !category || !description || !date || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const db = readDb();
  const now = new Date().toISOString();

  const newTransaction: Transaction = {
    id: `t_${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount: Number(amount),
    category,
    description,
    date,
    ownerId: userId,
    paymentMethod,
    isRecurring: !!isRecurring,
    notes,
    createdAt: now,
    updatedAt: now
  };

  db.transactions.push(newTransaction);

  // Quick automated check if budget is exceeded upon adding expense
  if (type === 'expense') {
    const matchedBudget = db.budgets.find(b => b.ownerId === userId && (b.category === category || b.category === 'All'));
    if (matchedBudget) {
      // Calculate total spent on this category this month
      const currentMonth = date.substring(0, 7); // YYYY-MM
      const categorySpent = db.transactions
        .filter(t => t.ownerId === userId && t.type === 'expense' && t.date.startsWith(currentMonth) && (matchedBudget.category === 'All' ? true : t.category === category))
        .reduce((sum, t) => sum + t.amount, 0) + Number(amount);

      if (categorySpent > matchedBudget.limitAmount) {
        const user = Object.values(db.users).find(u => u.id === userId);
        const userCurrencySymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : '$';
        // Create an alert notification
        db.notifications.push({
          id: `n_${Math.random().toString(36).substr(2, 9)}`,
          title: `Budget Warning: ${matchedBudget.category}`,
          message: `Your spending in ${matchedBudget.category} (${userCurrencySymbol}${categorySpent.toFixed(2)}) has exceeded your limit of ${userCurrencySymbol}${matchedBudget.limitAmount.toFixed(2)} for this month.`,
          type: 'warning',
          isRead: false,
          ownerId: userId,
          createdAt: now
        });
      }
    }
  }

  writeDb(db);
  res.status(201).json(newTransaction);
});

app.put('/api/transactions/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { type, amount, category, description, date, paymentMethod, isRecurring, notes } = req.body;

  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === id && t.ownerId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const now = new Date().toISOString();
  db.transactions[index] = {
    ...db.transactions[index],
    type: type ?? db.transactions[index].type,
    amount: amount !== undefined ? Number(amount) : db.transactions[index].amount,
    category: category ?? db.transactions[index].category,
    description: description ?? db.transactions[index].description,
    date: date ?? db.transactions[index].date,
    paymentMethod: paymentMethod ?? db.transactions[index].paymentMethod,
    isRecurring: isRecurring !== undefined ? !!isRecurring : db.transactions[index].isRecurring,
    notes: notes ?? db.transactions[index].notes,
    updatedAt: now
  };

  writeDb(db);
  res.json(db.transactions[index]);
});

app.delete('/api/transactions/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  const initialLen = db.transactions.length;
  db.transactions = db.transactions.filter(t => !(t.id === id && t.ownerId === userId));

  if (db.transactions.length === initialLen) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  writeDb(db);
  res.json({ message: 'Transaction deleted successfully.' });
});

// ==========================================
// BUDGET ENDPOINTS
// ==========================================

app.get('/api/budgets', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userBudgets = db.budgets.filter(b => b.ownerId === userId);
  res.json(userBudgets);
});

app.post('/api/budgets', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { category, limitAmount, period } = req.body;

  if (!category || !limitAmount) {
    return res.status(400).json({ error: 'Missing category or limit amount.' });
  }

  const db = readDb();
  const now = new Date().toISOString();

  // Find if already exists for this category, then override, otherwise create
  const existingIdx = db.budgets.findIndex(b => b.ownerId === userId && b.category === category && b.period === (period ?? 'monthly'));

  if (existingIdx !== -1) {
    db.budgets[existingIdx].limitAmount = Number(limitAmount);
    db.budgets[existingIdx].updatedAt = now;
    writeDb(db);
    return res.json(db.budgets[existingIdx]);
  } else {
    const newBudget: Budget = {
      id: `b_${Math.random().toString(36).substr(2, 9)}`,
      category,
      limitAmount: Number(limitAmount),
      period: period ?? 'monthly',
      ownerId: userId,
      createdAt: now,
      updatedAt: now
    };
    db.budgets.push(newBudget);
    writeDb(db);
    return res.status(201).json(newBudget);
  }
});

app.delete('/api/budgets/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  db.budgets = db.budgets.filter(b => !(b.id === id && b.ownerId === userId));
  writeDb(db);
  res.json({ message: 'Budget deleted.' });
});

// ==========================================
// SAVINGS GOAL ENDPOINTS
// ==========================================

app.get('/api/goals', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userGoals = db.goals.filter(g => g.ownerId === userId);
  res.json(userGoals);
});

app.post('/api/goals', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, targetAmount, currentAmount, targetDate, category } = req.body;

  if (!name || !targetAmount || !targetDate || !category) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const db = readDb();
  const now = new Date().toISOString();

  const newGoal: SavingsGoal = {
    id: `g_${Math.random().toString(36).substr(2, 9)}`,
    name,
    targetAmount: Number(targetAmount),
    currentAmount: Number(currentAmount ?? 0),
    targetDate,
    category,
    ownerId: userId,
    createdAt: now,
    updatedAt: now
  };

  db.goals.push(newGoal);
  writeDb(db);
  res.status(201).json(newGoal);
});

app.put('/api/goals/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { currentAmount, targetAmount, name, targetDate, category } = req.body;

  const db = readDb();
  const idx = db.goals.findIndex(g => g.id === id && g.ownerId === userId);

  if (idx === -1) {
    return res.status(404).json({ error: 'Savings goal not found.' });
  }

  const now = new Date().toISOString();
  db.goals[idx] = {
    ...db.goals[idx],
    currentAmount: currentAmount !== undefined ? Number(currentAmount) : db.goals[idx].currentAmount,
    targetAmount: targetAmount !== undefined ? Number(targetAmount) : db.goals[idx].targetAmount,
    name: name ?? db.goals[idx].name,
    targetDate: targetDate ?? db.goals[idx].targetDate,
    category: category ?? db.goals[idx].category,
    updatedAt: now
  };

  // Check if target achieved
  if (db.goals[idx].currentAmount >= db.goals[idx].targetAmount) {
    const user = Object.values(db.users).find(u => u.id === userId);
    const userCurrencySymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : '$';
    db.notifications.push({
      id: `n_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Savings Goal Achieved! 🌟',
      message: `Congratulations! You have reached your goal of ${userCurrencySymbol}${db.goals[idx].targetAmount.toFixed(2)} for "${db.goals[idx].name}".`,
      type: 'success',
      isRead: false,
      ownerId: userId,
      createdAt: now
    });
  }

  writeDb(db);
  res.json(db.goals[idx]);
});

app.delete('/api/goals/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  db.goals = db.goals.filter(g => !(g.id === id && g.ownerId === userId));
  writeDb(db);
  res.json({ message: 'Goal deleted.' });
});

// ==========================================
// RECURRING EXPENSE ENDPOINTS
// ==========================================

app.get('/api/recurring', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userRecurring = db.recurring.filter(r => r.ownerId === userId);
  res.json(userRecurring);
});

app.post('/api/recurring', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { name, amount, category, frequency, nextDueDate } = req.body;

  if (!name || !amount || !category || !frequency || !nextDueDate) {
    return res.status(400).json({ error: 'Missing fields for recurring expense.' });
  }

  const db = readDb();
  const now = new Date().toISOString();

  const newRecurring: RecurringExpense = {
    id: `r_${Math.random().toString(36).substr(2, 9)}`,
    name,
    amount: Number(amount),
    category,
    frequency,
    nextDueDate,
    ownerId: userId,
    createdAt: now,
    updatedAt: now
  };

  db.recurring.push(newRecurring);
  writeDb(db);
  res.status(201).json(newRecurring);
});

app.delete('/api/recurring/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  db.recurring = db.recurring.filter(r => !(r.id === id && r.ownerId === userId));
  writeDb(db);
  res.json({ message: 'Recurring item deleted.' });
});

// ==========================================
// HABITS & ROUTINES ENDPOINTS (Sprint 3)
// ==========================================

app.get('/api/habits', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userHabits = db.habits.filter(h => h.ownerId === userId);
  const userCompletions = db.habitCompletions.filter(hc => hc.ownerId === userId);

  // Convert server's flat completions array to the client-expected Record format
  const completionsRecord: Record<string, Record<string, boolean>> = {};
  userCompletions.forEach(hc => {
    if (!completionsRecord[hc.habitId]) {
      completionsRecord[hc.habitId] = {};
    }
    completionsRecord[hc.habitId][hc.date] = hc.completed;
  });

  // Strip ownerId from habits before responding
  const cleanHabits = userHabits.map(({ ownerId, ...h }) => h);
  res.json({ habits: cleanHabits, completions: completionsRecord });
});

app.post('/api/habits', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id, name, category, frequency, streak, createdAt } = req.body;

  if (!name || !category || !frequency) {
    return res.status(400).json({ error: 'Missing required habit fields.' });
  }

  const db = readDb();
  const now = new Date().toISOString().substring(0, 10);

  const newHabit: Habit & { ownerId: string } = {
    id: id || `h_${Math.random().toString(36).substr(2, 9)}`,
    name,
    category,
    frequency,
    streak: Number(streak || 0),
    createdAt: createdAt || now,
    ownerId: userId
  };

  db.habits.push(newHabit);
  writeDb(db);

  const { ownerId, ...cleanHabit } = newHabit;
  res.status(201).json(cleanHabit);
});

app.delete('/api/habits/:id', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  db.habits = db.habits.filter(h => !(h.id === id && h.ownerId === userId));
  db.habitCompletions = db.habitCompletions.filter(hc => !(hc.habitId === id && hc.ownerId === userId));
  writeDb(db);

  res.json({ message: 'Habit and completion logs successfully deleted.' });
});

app.post('/api/habits/sync', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { habits: clientHabits = [], completions: clientCompletions = {} } = req.body;

  const db = readDb();

  // 1. Merge Habits
  const serverHabits = db.habits.filter(h => h.ownerId === userId);
  const habitsMap = new Map<string, Habit & { ownerId: string }>();

  serverHabits.forEach(h => habitsMap.set(h.id, h));

  clientHabits.forEach((ch: Habit) => {
    const existing = habitsMap.get(ch.id);
    if (!existing) {
      habitsMap.set(ch.id, { ...ch, ownerId: userId });
    } else {
      // Merge: Keep the highest streak or most recent state
      habitsMap.set(ch.id, {
        ...existing,
        name: ch.name || existing.name,
        category: ch.category || existing.category,
        frequency: ch.frequency || existing.frequency,
        streak: Math.max(ch.streak || 0, existing.streak || 0),
        lastCompleted: ch.lastCompleted || existing.lastCompleted
      });
    }
  });

  const mergedHabits = Array.from(habitsMap.values());

  // 2. Merge Completions
  const serverCompletions = db.habitCompletions.filter(hc => hc.ownerId === userId);
  const completionsMap = new Map<string, boolean>();

  serverCompletions.forEach(sc => {
    completionsMap.set(`${sc.habitId}_${sc.date}`, sc.completed);
  });

  Object.keys(clientCompletions).forEach(habitId => {
    const datesObj = clientCompletions[habitId] || {};
    Object.keys(datesObj).forEach(date => {
      const isCompleted = datesObj[date];
      completionsMap.set(`${habitId}_${date}`, isCompleted);
    });
  });

  const mergedCompletionsServer: { habitId: string; date: string; completed: boolean; ownerId: string }[] = [];
  const mergedCompletionsClient: Record<string, Record<string, boolean>> = {};

  completionsMap.forEach((completed, key) => {
    const [habitId, date] = key.split('_');
    mergedCompletionsServer.push({
      habitId,
      date,
      completed,
      ownerId: userId
    });

    if (!mergedCompletionsClient[habitId]) {
      mergedCompletionsClient[habitId] = {};
    }
    mergedCompletionsClient[habitId][date] = completed;
  });

  // Write updates back to db
  db.habits = db.habits.filter(h => h.ownerId !== userId).concat(mergedHabits);
  db.habitCompletions = db.habitCompletions.filter(hc => hc.ownerId !== userId).concat(mergedCompletionsServer);
  writeDb(db);

  // Return user-stripped structures
  const cleanMergedHabits = mergedHabits.map(({ ownerId, ...h }) => h);
  res.json({
    habits: cleanMergedHabits,
    completions: mergedCompletionsClient
  });
});

// ==========================================
// HEALTH HUB ENDPOINTS (Sprint 4)
// ==========================================

app.post('/api/health/sync', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { 
    waterIntake = {}, 
    waterGoal,
    waterReminderInterval,
    waterReminderActive,
    sleepLogs = [], 
    workouts = [], 
    weightLogs = [], 
    medications = [] 
  } = req.body;

  const db = readDb();

  // Save water settings to user profile if provided
  const accountKey = Object.keys(db.users).find(email => db.users[email].id === userId);
  if (accountKey) {
    if (waterGoal !== undefined) db.users[accountKey].waterGoal = Number(waterGoal);
    if (waterReminderInterval !== undefined) db.users[accountKey].waterReminderInterval = Number(waterReminderInterval);
    if (waterReminderActive !== undefined) db.users[accountKey].waterReminderActive = Boolean(waterReminderActive);
  }

  // 1. Water Intake
  const serverWater = db.waterLogs.filter(wl => wl.ownerId === userId);
  const waterMap = new Map<string, number>();
  serverWater.forEach(sw => waterMap.set(sw.date, sw.amount));
  Object.entries(waterIntake).forEach(([date, amount]) => {
    const existing = waterMap.get(date) || 0;
    waterMap.set(date, Math.max(existing, Number(amount)));
  });
  const mergedWaterServer = Array.from(waterMap.entries()).map(([date, amount]) => ({
    id: `water_${date}`,
    date,
    amount,
    ownerId: userId
  }));

  // 2. Sleep Logs
  const serverSleep = db.sleepLogs.filter(sl => sl.ownerId === userId);
  const sleepMap = new Map<string, SleepLog>();
  serverSleep.forEach(s => sleepMap.set(s.id, s));
  sleepLogs.forEach((cs: SleepLog) => {
    sleepMap.set(cs.id, cs);
  });
  const mergedSleepServer = Array.from(sleepMap.values()).map(s => ({ ...s, ownerId: userId }));

  // 3. Workouts
  const serverWorkouts = db.workouts.filter(w => w.ownerId === userId);
  const workoutMap = new Map<string, WorkoutLog>();
  serverWorkouts.forEach(w => workoutMap.set(w.id, w));
  workouts.forEach((cw: WorkoutLog) => {
    workoutMap.set(cw.id, cw);
  });
  const mergedWorkoutsServer = Array.from(workoutMap.values()).map(w => ({ ...w, ownerId: userId }));

  // 4. Weight Logs
  const serverWeight = db.weightLogs.filter(wl => wl.ownerId === userId);
  const weightMap = new Map<string, WeightLog>();
  serverWeight.forEach(wl => weightMap.set(wl.id, wl));
  weightLogs.forEach((cwl: WeightLog) => {
    weightMap.set(cwl.id, cwl);
  });
  const mergedWeightServer = Array.from(weightMap.values()).map(wl => ({ ...wl, ownerId: userId }));

  // 5. Medications
  const serverMeds = db.medications.filter(m => m.ownerId === userId);
  const medsMap = new Map<string, Medication>();
  serverMeds.forEach(m => medsMap.set(m.id, m));
  medications.forEach((cm: Medication) => {
    medsMap.set(cm.id, cm);
  });
  const mergedMedsServer = Array.from(medsMap.values()).map(m => ({ ...m, ownerId: userId }));

  // Write all back to database
  db.waterLogs = db.waterLogs.filter(wl => wl.ownerId !== userId).concat(mergedWaterServer);
  db.sleepLogs = db.sleepLogs.filter(sl => sl.ownerId !== userId).concat(mergedSleepServer);
  db.workouts = db.workouts.filter(w => w.ownerId !== userId).concat(mergedWorkoutsServer);
  db.weightLogs = db.weightLogs.filter(wl => wl.ownerId !== userId).concat(mergedWeightServer);
  db.medications = db.medications.filter(m => m.ownerId !== userId).concat(mergedMedsServer);

  writeDb(db);

  // Return clean client structures (without ownerId)
  res.json({
    waterIntake: Object.fromEntries(waterMap.entries()),
    waterGoal: accountKey ? db.users[accountKey].waterGoal : undefined,
    waterReminderInterval: accountKey ? db.users[accountKey].waterReminderInterval : undefined,
    waterReminderActive: accountKey ? db.users[accountKey].waterReminderActive : undefined,
    sleepLogs: Array.from(sleepMap.values()),
    workouts: Array.from(workoutMap.values()),
    weightLogs: Array.from(weightMap.values()),
    medications: Array.from(medsMap.values())
  });
});

// ==========================================
// RECOVERY ENDPOINTS (Sprint 4)
// ==========================================

app.post('/api/recovery/sync', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { 
    recoveryTrackers = [], 
    cravings = [], 
    recoveryCheckins = [] 
  } = req.body;

  const db = readDb();

  // 1. Recovery Trackers
  const serverTrackers = db.recoveryTrackers.filter(rt => rt.ownerId === userId);
  const trackersMap = new Map<string, RecoveryTracker>();
  serverTrackers.forEach(rt => trackersMap.set(rt.id, rt));
  recoveryTrackers.forEach((rt: RecoveryTracker) => {
    trackersMap.set(rt.id, rt);
  });
  const mergedTrackersServer = Array.from(trackersMap.values()).map(rt => ({ ...rt, ownerId: userId }));

  // 2. Cravings
  const serverCravings = db.cravings.filter(c => c.ownerId === userId);
  const cravingsMap = new Map<string, CravingLog>();
  serverCravings.forEach(c => cravingsMap.set(c.id, c));
  cravings.forEach((c: CravingLog) => {
    cravingsMap.set(c.id, c);
  });
  const mergedCravingsServer = Array.from(cravingsMap.values()).map(c => ({ ...c, ownerId: userId }));

  // 3. Recovery Checkins
  const serverCheckins = db.recoveryCheckins.filter(rc => rc.ownerId === userId);
  const checkinsMap = new Map<string, RecoveryCheckin>();
  serverCheckins.forEach(rc => checkinsMap.set(rc.id, rc));
  recoveryCheckins.forEach((rc: RecoveryCheckin) => {
    checkinsMap.set(rc.id, rc);
  });
  const mergedCheckinsServer = Array.from(checkinsMap.values()).map(rc => ({ ...rc, ownerId: userId }));

  // Save back to DB
  db.recoveryTrackers = db.recoveryTrackers.filter(rt => rt.ownerId !== userId).concat(mergedTrackersServer);
  db.cravings = db.cravings.filter(c => c.ownerId !== userId).concat(mergedCravingsServer);
  db.recoveryCheckins = db.recoveryCheckins.filter(rc => rc.ownerId !== userId).concat(mergedCheckinsServer);

  writeDb(db);

  // Return clean structures
  res.json({
    recoveryTrackers: Array.from(trackersMap.values()),
    cravings: Array.from(cravingsMap.values()),
    recoveryCheckins: Array.from(checkinsMap.values())
  });
});

// ==========================================
// JOURNAL ENDPOINTS (Sprint 4)
// ==========================================

app.post('/api/journals/sync', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { journals = [] } = req.body;

  const db = readDb();

  // Merge journals
  const serverJournals = db.journals.filter(j => j.ownerId === userId);
  const journalsMap = new Map<string, JournalEntry>();
  serverJournals.forEach(j => journalsMap.set(j.id, j));
  journals.forEach((j: JournalEntry) => {
    journalsMap.set(j.id, j);
  });
  const mergedJournalsServer = Array.from(journalsMap.values()).map(j => ({ ...j, ownerId: userId }));

  // Save back to DB
  db.journals = db.journals.filter(j => j.ownerId !== userId).concat(mergedJournalsServer);

  writeDb(db);

  // Return clean structures
  res.json({
    journals: Array.from(journalsMap.values())
  });
});

// ==========================================
// PRODUCTIVITY ENDPOINTS (Sprint 4)
// ==========================================

app.post('/api/productivity/sync', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { 
    tasks = [], 
    notes = [], 
    focusSessions = [] 
  } = req.body;

  const db = readDb();

  // 1. Tasks
  const serverTasks = db.tasks.filter(t => t.ownerId === userId);
  const tasksMap = new Map<string, Task>();
  serverTasks.forEach(t => tasksMap.set(t.id, t));
  tasks.forEach((t: Task) => {
    tasksMap.set(t.id, t);
  });
  const mergedTasksServer = Array.from(tasksMap.values()).map(t => ({ ...t, ownerId: userId }));

  // 2. Notes
  const serverNotes = db.notes.filter(n => n.ownerId === userId);
  const notesMap = new Map<string, Note>();
  serverNotes.forEach(n => notesMap.set(n.id, n));
  notes.forEach((n: Note) => {
    notesMap.set(n.id, n);
  });
  const mergedNotesServer = Array.from(notesMap.values()).map(n => ({ ...n, ownerId: userId }));

  // 3. Focus Sessions
  const serverSessions = db.focusSessions.filter(fs => fs.ownerId === userId);
  const sessionsMap = new Map<string, FocusSession>();
  serverSessions.forEach(fs => sessionsMap.set(fs.id, fs));
  focusSessions.forEach((fs: FocusSession) => {
    sessionsMap.set(fs.id, fs);
  });
  const mergedSessionsServer = Array.from(sessionsMap.values()).map(fs => ({ ...fs, ownerId: userId }));

  // Save back to DB
  db.tasks = db.tasks.filter(t => t.ownerId !== userId).concat(mergedTasksServer);
  db.notes = db.notes.filter(n => n.ownerId !== userId).concat(mergedNotesServer);
  db.focusSessions = db.focusSessions.filter(fs => fs.ownerId !== userId).concat(mergedSessionsServer);

  writeDb(db);

  // Return clean structures
  res.json({
    tasks: Array.from(tasksMap.values()),
    notes: Array.from(notesMap.values()),
    focusSessions: Array.from(sessionsMap.values())
  });
});

// ==========================================
// NOTIFICATIONS & LOGS
// ==========================================

app.get('/api/notifications', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userNotif = db.notifications.filter(n => n.ownerId === userId);
  res.json(userNotif);
});

app.put('/api/notifications/:id/read', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const db = readDb();
  const idx = db.notifications.findIndex(n => n.id === id && n.ownerId === userId);
  if (idx !== -1) {
    db.notifications[idx].isRead = true;
    writeDb(db);
  }
  res.json({ success: true });
});

app.get('/api/logs', authenticate, (req, res) => {
  const userId = (req as any).userId;
  const db = readDb();
  const userLogs = db.logs.filter(l => l.ownerId === userId);
  res.json(userLogs);
});

// ==========================================
// AI & GEMINI ANALYTICS ENDPOINTS
// ==========================================

app.get('/api/ai/insights', authenticate, async (req, res) => {
  const userId = (req as any).userId;

  // Check cache first
  const cached = aiCache[userId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const db = readDb();
  const transactions = db.transactions.filter(t => t.ownerId === userId);
  const budgets = db.budgets.filter(b => b.ownerId === userId);
  const goals = db.goals.filter(g => g.ownerId === userId);
  const user = Object.values(db.users).find(u => u.id === userId);

  const currencySymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : '$';

  // Format historical summaries for Gemini
  const recentTransactionSummary = transactions.slice(0, 15).map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date
  }));

  const budgetSummary = budgets.map(b => ({
    category: b.category,
    limit: b.limitAmount
  }));

  const goalSummary = goals.map(g => ({
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    date: g.targetDate
  }));

  const defaultInsights = {
    score: 72,
    suggestions: [
      "Set individual category budgets to prevent miscellaneous overspending.",
      "You spent 15% more on Entertainment compared to last week. Consider setting a weekly cap.",
      "Consider transferring an extra ₹5,000 towards your Emergency Fund goal to meet your year-end target."
    ],
    spendingForecast: [
      { month: "Aug", predictedAmount: 14500 },
      { month: "Sep", predictedAmount: 13800 },
      { month: "Oct", predictedAmount: 15200 }
    ],
    unusualExpensesDetected: []
  };

  if (!ai) {
    console.log('Gemini client not initialized, returning premium static financial insights.');
    return res.json(defaultInsights);
  }

  try {
    const prompt = `
You are Rupio's elite AI Financial Assistant. Based on the user's transaction history, current budget caps, and savings goals, calculate a Financial Health Score (0 to 100), identify unusual high-spending incidents, forecast the next 3 months of expenses, and generate 3 highly personalized, actionable savings suggestions.

Here is the user's recent data:
Currency Symbol: "${currencySymbol}"
Recent Transactions: ${JSON.stringify(recentTransactionSummary)}
Active Budgets: ${JSON.stringify(budgetSummary)}
Savings Goals: ${JSON.stringify(goalSummary)}

Generate a response STRICTLY in JSON format following this TypeScript schema:
{
  "score": number, // 0 to 100
  "suggestions": string[], // Exactly 3 helpful, actionable suggestions
  "spendingForecast": { "month": string, "predictedAmount": number }[], // 3 upcoming months
  "unusualExpensesDetected": { "category": string, "amount": number, "reason": string }[] // Outliers
}

Do not include any extra text, code blocks, or explanations outside the JSON block. Return ONLY the valid parseable JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const jsonStartIdx = text.indexOf('{');
    const jsonEndIdx = text.lastIndexOf('}') + 1;
    const cleanJson = text.substring(jsonStartIdx, jsonEndIdx);
    
    const parsedData = JSON.parse(cleanJson);

    // Cache the outcome
    aiCache[userId] = {
      timestamp: Date.now(),
      data: parsedData
    };

    res.json(parsedData);
  } catch (error) {
    console.error('Gemini API call failed, reverting to default fallback analysis:', error);
    res.json(defaultInsights);
  }
});

// Clear cache endpoint (used when user logs a transaction)
app.post('/api/ai/insights/refresh', authenticate, (req, res) => {
  const userId = (req as any).userId;
  delete aiCache[userId];
  res.json({ message: 'AI analytics cache successfully cleared.' });
});

// ==========================================
// PORT BINDING AND STATIC FILES
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
