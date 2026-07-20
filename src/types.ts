/**
 * Rupio Data Models & Types
 * Track Smart. Save Better.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  currency: string; // e.g. "USD", "INR", "EUR"
  language: string; // e.g. "en", "es", "hi"
  theme: 'dark' | 'light';
  rememberMe?: boolean;
  waterGoal?: number;
  waterReminderInterval?: number;
  waterReminderActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 
  // Expense Categories
  | 'Food' 
  | 'Shopping' 
  | 'Bills' 
  | 'Transport' 
  | 'Fuel' 
  | 'Medical' 
  | 'Education' 
  | 'Entertainment' 
  | 'Travel' 
  | 'Investment' 
  | 'Insurance' 
  | 'Rent' 
  | 'EMI' 
  | 'Business' 
  // Income Categories
  | 'Salary'
  | 'Pocket Money'
  | 'Investment Returns'
  | 'Business Income'
  | 'Freelance/Side Hustle'
  | 'Gifts/Grants'
  | 'Refund/Reimbursement'
  | 'Others';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string; // Hex color code
  ownerId: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: CategoryType | string;
  description: string;
  date: string; // YYYY-MM-DD
  ownerId: string;
  paymentMethod: 'cash' | 'card' | 'bank' | 'upi';
  isRecurring: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  category: CategoryType | 'All';
  limitAmount: number;
  period: 'daily' | 'weekly' | 'monthly';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string; // "Emergency Fund", "Vacation", etc.
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  ownerId: string;
  category: 'Emergency' | 'Vacation' | 'Tech' | 'Vehicle' | 'Property' | 'Custom';
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: CategoryType | string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: string; // YYYY-MM-DD
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  isRead: boolean;
  ownerId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  ownerId: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  ownerId: string;
  biometricLogin: boolean;
  pushNotifications: boolean;
  emailAlerts: boolean;
  automaticSync: boolean;
  backupFrequency: 'daily' | 'weekly' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  totalBalance: number;
  todayExpense: number;
  weeklyExpense: number;
  monthlyExpense: number;
  yearlyExpense: number;
  totalSavings: number;
  monthlyIncome: number;
  recentTransactions: Transaction[];
  budgetProgress: {
    category: string;
    limit: number;
    spent: number;
    percentage: number;
  }[];
  categoryDistribution: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  cashFlowHistory: {
    date: string;
    income: number;
    expense: number;
  }[];
  aiScore: number;
  aiSuggestions: string[];
}

export interface AISuggestionsResponse {
  score: number; // 0-100 financial health score
  suggestions: string[];
  spendingForecast: { month: string; predictedAmount: number }[];
  unusualExpensesDetected: { category: string; amount: number; reason: string }[];
}
