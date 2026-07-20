import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, Transaction, Budget, SavingsGoal, 
  RecurringExpense, Notification, ActivityLog, AppSettings 
 } from '../src/types.js'; // Use ESM-compatible import paths or plain file names
import { 
  Habit, SleepLog, WorkoutLog, WeightLog, Medication,
  RecoveryTracker, CravingLog, RecoveryCheckin,
  Task, Note, FocusSession, JournalEntry
} from '../src/lib/localDb.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface Schema {
  users: Record<string, User & { passwordHash: string }>;
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringExpense[];
  notifications: Notification[];
  logs: ActivityLog[];
  settings: AppSettings[];
  habits: (Habit & { ownerId: string })[];
  habitCompletions: { habitId: string; date: string; completed: boolean; ownerId: string }[];
  
  // Health Module
  waterLogs: { id: string; date: string; amount: number; ownerId: string }[];
  sleepLogs: (SleepLog & { ownerId: string })[];
  workouts: (WorkoutLog & { ownerId: string })[];
  weightLogs: (WeightLog & { ownerId: string })[];
  medications: (Medication & { ownerId: string })[];

  // Recovery Module
  recoveryTrackers: (RecoveryTracker & { ownerId: string })[];
  cravings: (CravingLog & { ownerId: string })[];
  recoveryCheckins: (RecoveryCheckin & { ownerId: string })[];

  // Journal Module
  journals: (JournalEntry & { ownerId: string })[];

  // Productivity Module
  tasks: (Task & { ownerId: string })[];
  notes: (Note & { ownerId: string })[];
  focusSessions: (FocusSession & { ownerId: string })[];
}

const defaultSchema: Schema = {
  users: {},
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  notifications: [],
  logs: [],
  settings: [],
  habits: [],
  habitCompletions: [],
  
  // Health
  waterLogs: [],
  sleepLogs: [],
  workouts: [],
  weightLogs: [],
  medications: [],

  // Recovery
  recoveryTrackers: [],
  cravings: [],
  recoveryCheckins: [],

  // Journal
  journals: [],

  // Productivity
  tasks: [],
  notes: [],
  focusSessions: []
};

// Ensure data folder and file exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultSchema, null, 2), 'utf-8');
  }
}

// Read database
export function readDb(): Schema {
  initDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Schema;
    return {
      ...defaultSchema,
      ...parsed,
      users: { ...defaultSchema.users, ...parsed.users }
    };
  } catch (error) {
    console.error('Failed to read database, resetting to default', error);
    return defaultSchema;
  }
}

// Write database
export function writeDb(data: Schema): void {
  initDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write database', error);
  }
}

// Password utility using native Node.js crypto (extremely secure, pbkdf2)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// Simple session token generator using HMAC/SHA256
const JWT_SECRET = process.env.JWT_SECRET || 'rupio_persistent_fallback_secret_39103';

export function generateToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): string | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (Date.now() > decodedPayload.exp) return null; // Expired
    return decodedPayload.userId;
  } catch {
    return null;
  }
}
