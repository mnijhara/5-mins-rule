import { useEffect, useState } from 'react';
import { Clock, Unlock, ArrowRight } from 'lucide-react';
import { formatClock, formatCountdown, formatSessionDate, isSessionUnlocked } from '../lib/format';
import type { MirrorSession } from '../types/mirror';

interface WaitStageProps {
  session: MirrorSession;
  onUnlockEarly: () => Promise<void>;
  onProceedToListen: () => Promise<void>;
}

export function WaitStage({ session, onUnlockEarly, onProceedToListen }: WaitStageProps) {
  const [now, setNow] = useState(Date.now());
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const unlocked = isSessionUnlocked(session.unlockAt, session.bypassWait, now);
  const remainingMs = Math.max(0, session.unlockAt - now);

  const handleUnlock = async () => {
    setUnlocking(true);
    await onUnlockEarly();
    setUnlocking(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-8 sm:p-10 rounded-xl border border-[#22262E] bg-[#121417]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#22262E]">
          <div>
            <span className="font-mono-tabular text-xs text-[#9CA3AF] uppercase tracking-wider">
              Step 02 · Cooling-Off Period
            </span>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-[#F5F5F4]">
              {unlocked ? '24-Hour Wait Complete' : 'Wait 24 Hours · Then Review It'}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-full border border-[#333945] bg-[#171A21] flex items-center justify-center text-[#F5F5F4] shrink-0">
            {unlocked ? <Unlock className="w-5 h-5 text-[#FACC15]" /> : <Clock className="w-5 h-5" />}
          </div>
        </div>

        <div className="py-8 border-b border-[#22262E] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
              {unlocked ? 'Review Status' : 'Time Until Objective Review'}
            </span>
            <div className="mt-2 font-mono-tabular text-5xl sm:text-6xl font-semibold tracking-tight text-[#F5F5F4]">
              {unlocked ? '00:00:00' : formatCountdown(remainingMs)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
              <span>Recorded {formatSessionDate(session.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">Duration {formatClock(session.durationSeconds)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {unlocked
                  ? 'Ready for Listen-Only & Mute Watch'
                  : `Unlocks ${formatSessionDate(session.unlockAt)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {unlocked ? (
              <button
                type="button"
                onClick={onProceedToListen}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Begin Step 03: Listen Only</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={unlocking}
                onClick={handleUnlock}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#E5E7EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5 text-[#FACC15]" />
                <span>{unlocking ? 'Unlocking...' : 'Skip 24h Wait & Preview Now'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F4]">Why 24 hours?</h3>
            <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
              Right after speaking, you still feel the effort of forming sentences. Waiting
              a full day lets emotional attachment fade so you observe yourself like a stranger.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F4]">Saved Locally</h3>
            <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
              Your recording is stored privately in your browser&apos;s IndexedDB archive.
              Close this tab and return tomorrow—your countdown and media stay intact.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F4]">What Comes Next</h3>
            <p className="mt-1.5 text-xs text-[#9CA3AF] leading-relaxed">
              Once unlocked, you will isolate sound first (Step 03), movement second (Step
              04), and finally read your AI-audited verbatim transcript (Step 05).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
