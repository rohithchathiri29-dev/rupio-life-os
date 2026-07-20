import { 
  User, Transaction, Budget, SavingsGoal, 
  RecurringExpense, Notification, ActivityLog, AppSettings, 
  DashboardData, AISuggestionsResponse 
} from '../types.js';
import { Habit, SleepLog, WorkoutLog, WeightLog, Medication, RecoveryTracker, CravingLog, RecoveryCheckin, JournalEntry, Task, Note, FocusSession } from './localDb.js';

const API_BASE = '/api';

// Retrieve token from LocalStorage
export function getToken(): string | null {
  return localStorage.getItem('rupio_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('rupio_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rupio_token');
}

// Global fetch wrapper with automatic JWT inject
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected server error occurred.';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

// Auth API
export const authApi = {
  async register(fullName: string, email: string, password: string): Promise<{ user: User; token: string }> {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password })
    });
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async me(): Promise<User> {
    return fetchApi('/auth/me');
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    return fetchApi('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteAccount(): Promise<{ message: string }> {
    return fetchApi('/auth/account', {
      method: 'DELETE'
    });
  }
};

// Transactions API
export const transactionsApi = {
  async list(): Promise<Transaction[]> {
    return fetchApi('/transactions');
  },

  async create(data: Omit<Transaction, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    return fetchApi('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    return fetchApi(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi(`/transactions/${id}`, {
      method: 'DELETE'
    });
  }
};

// Budgets API
export const budgetsApi = {
  async list(): Promise<Budget[]> {
    return fetchApi('/budgets');
  },

  async save(category: string, limitAmount: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<Budget> {
    return fetchApi('/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, limitAmount, period })
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi(`/budgets/${id}`, {
      method: 'DELETE'
    });
  }
};

// Savings Goals API
export const goalsApi = {
  async list(): Promise<SavingsGoal[]> {
    return fetchApi('/goals');
  },

  async create(data: Omit<SavingsGoal, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<SavingsGoal> {
    return fetchApi('/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProgress(id: string, currentAmount: number): Promise<SavingsGoal> {
    return fetchApi(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ currentAmount })
    });
  },

  async updateGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    return fetchApi(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi(`/goals/${id}`, {
      method: 'DELETE'
    });
  }
};

// Recurring Expenses API
export const recurringApi = {
  async list(): Promise<RecurringExpense[]> {
    return fetchApi('/recurring');
  },

  async create(data: Omit<RecurringExpense, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<RecurringExpense> {
    return fetchApi('/recurring', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi(`/recurring/${id}`, {
      method: 'DELETE'
    });
  }
};

// Notifications API
export const notificationsApi = {
  async list(): Promise<Notification[]> {
    return fetchApi('/notifications');
  },

  async markAsRead(id: string): Promise<{ success: boolean }> {
    return fetchApi(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }
};

// AI Insights API
export const aiApi = {
  async getInsights(): Promise<AISuggestionsResponse> {
    return fetchApi('/ai/insights');
  },

  async refreshInsights(): Promise<{ message: string }> {
    return fetchApi('/ai/insights/refresh', {
      method: 'POST'
    });
  }
};

// Habits API (Sprint 3 Sync)
export const habitsApi = {
  async list(): Promise<{ habits: Habit[]; completions: Record<string, Record<string, boolean>> }> {
    return fetchApi('/habits');
  },

  async create(data: Omit<Habit, 'streak'> & { streak?: number }): Promise<Habit> {
    return fetchApi('/habits', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi(`/habits/${id}`, {
      method: 'DELETE'
    });
  },

  async sync(habits: Habit[], completions: Record<string, Record<string, boolean>>): Promise<{ habits: Habit[]; completions: Record<string, Record<string, boolean>> }> {
    return fetchApi('/habits/sync', {
      method: 'POST',
      body: JSON.stringify({ habits, completions })
    });
  }
};

// Health API (Sprint 4 Sync)
export const healthApi = {
  async sync(data: {
    waterIntake: Record<string, number>;
    sleepLogs: SleepLog[];
    workouts: WorkoutLog[];
    weightLogs: WeightLog[];
    medications: Medication[];
  }): Promise<{
    waterIntake: Record<string, number>;
    sleepLogs: SleepLog[];
    workouts: WorkoutLog[];
    weightLogs: WeightLog[];
    medications: Medication[];
  }> {
    return fetchApi('/health/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Recovery API (Sprint 4 Sync)
export const recoveryApi = {
  async sync(data: {
    recoveryTrackers: RecoveryTracker[];
    cravings: CravingLog[];
    recoveryCheckins: RecoveryCheckin[];
  }): Promise<{
    recoveryTrackers: RecoveryTracker[];
    cravings: CravingLog[];
    recoveryCheckins: RecoveryCheckin[];
  }> {
    return fetchApi('/recovery/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Journal API (Sprint 4 Sync)
export const journalApi = {
  async sync(data: {
    journals: JournalEntry[];
  }): Promise<{
    journals: JournalEntry[];
  }> {
    return fetchApi('/journals/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Productivity API (Sprint 4 Sync)
export const productivityApi = {
  async sync(data: {
    tasks: Task[];
    notes: Note[];
    focusSessions: FocusSession[];
  }): Promise<{
    tasks: Task[];
    notes: Note[];
    focusSessions: FocusSession[];
  }> {
    return fetchApi('/productivity/sync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
