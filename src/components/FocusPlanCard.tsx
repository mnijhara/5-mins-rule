import React, { useEffect, useState } from 'react';
import { Check, Flame, Plus, Sparkles, Trash2 } from 'lucide-react';
import { MirrorSession } from '../types/mirror';
import {
  FocusHabit,
  loadFocusHabits,
  saveFocusHabits,
  VINH_HABIT_PRESETS,
} from '../lib/focusPlan';

interface FocusPlanCardProps {
  sessions: MirrorSession[];
}

const CHANNEL_BADGE: Record<FocusHabit['channel'], string> = {
  vocal: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  visual: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  verbal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function FocusPlanCard({ sessions }: FocusPlanCardProps) {
  const [habits, setHabits] = useState<FocusHabit[]>(() => loadFocusHabits());
  const [customText, setCustomText] = useState('');
  const [customChannel, setCustomChannel] = useState<FocusHabit['channel']>('vocal');

  useEffect(() => {
    saveFocusHabits(habits);
  }, [habits]);

  const auditedChronological = [...sessions]
    .filter((s) => Boolean(s.transcript))
    .sort((a, b) => a.createdAt - b.createdAt);

  const dayOne = auditedChronological[0];
  const latest =
    auditedChronological.length > 1
      ? auditedChronological[auditedChronological.length - 1]
      : null;

  const dayOneFillers = dayOne?.transcript
    ? dayOne.transcript.fillerBreakdown.reduce((acc, f) => acc + f.count, 0)
    : 0;
  const latestFillers = latest?.transcript
    ? latest.transcript.fillerBreakdown.reduce((acc, f) => acc + f.count, 0)
    : 0;

  const fillerDelta = latest ? latestFillers - dayOneFillers : null;
  const wpmDelta =
    latest && dayOne?.transcript && latest.transcript
      ? latest.transcript.wordsPerMinute - dayOne.transcript.wordsPerMinute
      : null;

  const thirtyDayProgress = Math.min(30, sessions.length);

  const handleAddHabit = (label: string, channel: FocusHabit['channel']) => {
    const trimmed = label.trim();
    if (!trimmed || habits.length >= 4) return;
    if (habits.some((h) => h.label.toLowerCase() === trimmed.toLowerCase())) return;
    setHabits((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: trimmed,
        channel,
        repsCompleted: 0,
        createdAt: Date.now(),
      },
    ]);
    setCustomText('');
  };

  const handleIncrementRep = (id: string) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, repsCompleted: h.repsCompleted + 1 } : h
      )
    );
  };

  const handleRemoveHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-400">
            <Flame className="h-3.5 w-3.5" />
            <span>30-Day Mirror · Applied Knowledge</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">
            Pick Your Top 4 Focus Habits
          </h2>
          <p className="text-xs text-zinc-400">
            Don&apos;t fix everything at once. Pick up to 4 habits from your reviews and log each deliberate rep.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              30-Day Streak
            </div>
            <div className="text-sm font-semibold text-zinc-100">
              {thirtyDayProgress} / 30 takes
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="w-24">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${(thirtyDayProgress / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {dayOne?.transcript && latest?.transcript && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Day 1 vs. Latest Take
            </div>
            <div className="mt-0.5 text-xs text-zinc-300">
              Objective proof across {auditedChronological.length} audited takes
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Speaking Pace (WPM)
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-zinc-100">
                {dayOne.transcript.wordsPerMinute} → {latest.transcript.wordsPerMinute}
              </span>
              {wpmDelta !== null && (
                <span className="text-xs text-zinc-400">
                  ({wpmDelta >= 0 ? `+${wpmDelta}` : wpmDelta} wpm)
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Filler Words / Take
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-zinc-100">
                {dayOneFillers} → {latestFillers}
              </span>
              {fillerDelta !== null && (
                <span
                  className={`text-xs font-medium ${
                    fillerDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  ({fillerDelta > 0 ? `+${fillerDelta}` : fillerDelta})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {habits.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {habits.map((habit, idx) => (
            <div
              key={habit.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    0{idx + 1}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      CHANNEL_BADGE[habit.channel]
                    }`}
                  >
                    {habit.channel}
                  </span>
                </div>
                <p className="truncate text-sm text-zinc-200" title={habit.label}>
                  {habit.label}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleIncrementRep(habit.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-yellow-400/60 hover:text-yellow-300 transition-colors"
                  title="Log a practice rep"
                >
                  <Check className="h-3.5 w-3.5 text-yellow-400" />
                  <span>{habit.repsCompleted} reps</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveHabit(habit.id)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  aria-label="Remove habit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-center text-xs text-zinc-400">
          No active focus habits yet. Pick up to 4 below to start your 30-day deliberate practice.
        </div>
      )}

      {habits.length < 4 && (
        <div className="space-y-3 border-t border-zinc-800/80 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {VINH_HABIT_PRESETS.filter(
              (preset) =>
                !habits.some(
                  (h) => h.label.toLowerCase() === preset.label.toLowerCase()
                )
            )
              .slice(0, 4)
              .map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddHabit(preset.label, preset.channel)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  <Sparkles className="h-3 w-3 text-yellow-400" />
                  <span>{preset.label}</span>
                </button>
              ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddHabit(customText, customChannel);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <select
              value={customChannel}
              onChange={(e) =>
                setCustomChannel(e.target.value as FocusHabit['channel'])
              }
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 focus:border-yellow-400 focus:outline-none"
            >
              <option value="vocal">Vocal</option>
              <option value="visual">Visual</option>
              <option value="verbal">Verbal</option>
            </select>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Or add a custom habit from your latest review..."
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-yellow-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-yellow-300 disabled:opacity-40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add ({habits.length}/4)</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
