
export enum ViewMode {
  LIST = 'LIST',
  CALENDAR = 'CALENDAR',
  COMPOSE = 'COMPOSE',
  INTERVIEW_SETUP = 'INTERVIEW_SETUP',
  LIVE_SESSION = 'LIVE_SESSION',
  TEXT_SESSION = 'TEXT_SESSION',
  ENTRY_DETAIL = 'ENTRY_DETAIL',
  GOALS = 'GOALS',
  TASKS = 'TASKS',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS'
}

export type Persona = 'Nice' | 'Motivational' | 'Rude';
export type VoiceName = 'Puck' | 'Kore' | 'Fenrir' | 'Charon' | 'Zephyr';

export interface GroundingMetadata {
  webUrl?: string;
  mapUrl?: string;
  title?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO String
  title: string;
  content: string;
  summary: string;
  tags: string[];
  mood?: string;
  imageUrl?: string;
  audioId?: string; // Reference to IndexedDB
  groundingData?: GroundingMetadata[];
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export type GoalType = 'Daily' | 'Weekly' | 'Monthly';

export interface Goal {
  id: string;
  text: string;
  type: GoalType;
  isCompleted: boolean;
  createdAt: string; // ISO String
}

export interface Task {
  id: string;
  text: string;
  type: GoalType; // Reuse Daily/Weekly/Monthly
  isCompleted: boolean;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; 
  unlockedAt?: string;
}

export interface UserStats {
  xp: number;
  level: number;
  currentStreak: number;
  lastActiveDate: string;
  totalEntries: number;
  goalsCompleted: number;
  tasksCompleted: number;
  badges: Badge[];
}