export interface FocusHabit {
  id: string;
  label: string;
  channel: 'vocal' | 'visual' | 'verbal';
  repsCompleted: number;
  createdAt: number;
}

export interface HabitPreset {
  label: string;
  channel: 'vocal' | 'visual' | 'verbal';
}

export const VINH_HABIT_PRESETS: HabitPreset[] = [
  {
    label: 'Pause 2–3 seconds after every key point (silence = confidence)',
    channel: 'vocal',
  },
  {
    label: 'Replace "umm" and "like" with a silent breath',
    channel: 'verbal',
  },
  {
    label: 'Play all 88 keys: add pitch highs and lows to key phrases',
    channel: 'vocal',
  },
  {
    label: 'Vary rate: slow down on what matters, speed up on transitions',
    channel: 'vocal',
  },
  {
    label: 'Use descriptive hand gestures above the waist',
    channel: 'visual',
  },
  {
    label: 'Keep eye line steady on the lens and open posture',
    channel: 'visual',
  },
];

const STORAGE_KEY = 'five_minute_mirror_top4_habits_v1';

export function loadFocusHabits(): FocusHabit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function saveFocusHabits(habits: FocusHabit[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(habits.slice(0, 4)));
  } catch {
    // Ignore storage quota errors
  }
}
