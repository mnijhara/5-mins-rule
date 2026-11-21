export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatCountdown(remainingMs: number): string {
  const totalSecs = Math.max(0, Math.floor(remainingMs / 1000));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSessionDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function isSessionUnlocked(unlockAt: number, bypassWait: boolean, now = Date.now()): boolean {
  return bypassWait || now >= unlockAt;
}

export const CONVERSATION_SPARKS: string[] = [
  'Tell the story of a moment where you felt deeply misunderstood—and what it taught you about how you communicate.',
  'Explain the hardest or most interesting part of your work as if we were having coffee together for the first time.',
  'Share a belief or habit you held for years that you eventually changed your mind about—and why.',
  'Teach one practical skill or principle you love so clearly that a curious 12-year-old could use it today.',
  'Describe someone in your life who makes others feel truly heard, and pinpoint what they actually do differently.',
  'Walk through a decision where you chose the uncomfortable path—and what happened afterward.',
  'Free Speak — Talk off the cuff for five minutes about whatever is genuinely on your mind right now.',
];
