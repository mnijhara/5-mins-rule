import { useState } from 'react';
import { Trash2, ArrowUpRight, Search, Plus } from 'lucide-react';
import { formatClock, formatSessionDate, isSessionUnlocked } from '../lib/format';
import type { MirrorSession } from '../types/mirror';
import { FocusPlanCard } from './FocusPlanCard';

interface ArchiveViewProps {
  sessions: MirrorSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => Promise<void>;
  onStartNewTake: () => void;
}

const STEP_LABELS: Record<number, string> = {
  1: '01 · Record',
  2: '02 · Waiting 24h',
  3: '03 · Listen Only',
  4: '04 · Watch on Mute',
  5: '05 · AI Transcript',
};

export function ArchiveView({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onStartNewTake,
}: ArchiveViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'completed'>('all');

  const filtered = sessions.filter((s) => {
    const matchesQuery =
      !query.trim() ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.prompt.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;
    if (filter === 'ready') {
      return isSessionUnlocked(s.unlockAt, s.bypassWait) && !s.transcript;
    }
    if (filter === 'completed') {
      return Boolean(s.transcript);
    }
    return true;
  });

  const auditedSessions = sessions.filter((s) => Boolean(s.transcript));
  const avgWpm =
    auditedSessions.length > 0
      ? Math.round(
          auditedSessions.reduce(
            (sum, s) => sum + (s.transcript?.wordsPerMinute ?? 0),
            0
          ) / auditedSessions.length
        )
      : null;
  const avgFillers =
    auditedSessions.length > 0
      ? (
          auditedSessions.reduce(
            (sum, s) =>
              sum +
              (s.transcript?.fillerBreakdown.reduce((a, f) => a + f.count, 0) ?? 0),
            0
          ) / auditedSessions.length
        ).toFixed(1)
      : null;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#22262E]">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            Session Archive
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            All takes are stored privately on this device in IndexedDB.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewTake}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Take</span>
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#22262E] rounded-xl border border-[#22262E] bg-[#121417]">
          <div className="p-4 sm:p-5">
            <span className="text-xs text-[#9CA3AF]">Takes Recorded</span>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
              {sessions.length}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs text-[#9CA3AF]">AI Audits Done</span>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
              {auditedSessions.length}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs text-[#9CA3AF]">Avg Speaking Pace</span>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
              {avgWpm !== null ? (
                <>
                  {avgWpm} <span className="text-xs font-normal text-[#9CA3AF]">WPM</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <span className="text-xs text-[#9CA3AF]">Avg Fillers / Take</span>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#FACC15]">
              {avgFillers !== null ? avgFillers : '—'}
            </div>
          </div>
        </div>
      )}

      <FocusPlanCard sessions={sessions} />

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search takes or prompts..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#121417] border border-[#22262E] focus:border-[#FACC15] focus:outline-none text-sm text-[#F5F5F4] placeholder-[#6B7280]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121417] border border-[#22262E]">
          {(
            [
              { id: 'all', label: 'All Takes' },
              { id: 'ready', label: 'Ready to Review' },
              { id: 'completed', label: 'Transcribed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1F242E] text-[#F5F5F4]'
                  : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Table / List */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-xl border border-[#22262E] bg-[#121417] text-center">
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            {sessions.length === 0 ? 'No Takes Recorded Yet' : 'No Matching Sessions'}
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-md mx-auto">
            {sessions.length === 0
              ? 'Record your first unscripted 5-minute take to start building self-awareness across tone, movement, and word choice.'
              : 'Try clearing your search or switching the filter tab.'}
          </p>
          {sessions.length === 0 && (
            <button
              type="button"
              onClick={onStartNewTake}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Start First Take</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[#22262E] bg-[#121417] divide-y divide-[#22262E]">
          {filtered.map((item) => {
            const unlocked = isSessionUnlocked(item.unlockAt, item.bypassWait);
            const isSelected = item.id === activeSessionId;
            return (
              <div
                key={item.id}
                className={`p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 transition-colors hover:bg-[#171A21]/60 ${
                  isSelected ? 'bg-[#171A21]/80' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSession(item.id)}
                      className="text-base font-semibold text-[#F5F5F4] hover:text-[#FACC15] transition-colors text-left truncate cursor-pointer"
                    >
                      {item.title}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                    <span>{formatSessionDate(item.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatClock(item.durationSeconds)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.hasVideo ? 'Camera + Mic' : 'Audio Only'}</span>
                    <span aria-hidden="true">·</span>
                    <span className={item.transcript ? 'text-[#FACC15]' : ''}>
                      {unlocked
                        ? STEP_LABELS[item.currentStep]
                        : 'Locked in 24h Wait'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectSession(item.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(item.id)}
                    aria-label={`Delete ${item.title}`}
                    className="p-2 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-[#6B7280] hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
