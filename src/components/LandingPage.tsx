import React from 'react';
import {
  ArrowRight,
  Clock,
  EyeOff,
  Flame,
  Headphones,
  Lock,
  Mic,
  Sparkles,
  Video,
} from 'lucide-react';

interface LandingPageProps {
  sessionCount: number;
  onStartStudio: () => void;
  onOpenArchive: () => void;
  onOpenMethodology: () => void;
  onOpenAudiobook: () => void;
}

const STEPS = [
  {
    num: '01',
    title: 'Record 5 Min',
    sub: 'First take · no plan',
    desc: 'Speak unscripted on camera or mic. Capture your raw baseline without scripts or retakes.',
    icon: Video,
  },
  {
    num: '02',
    title: 'Wait 24 Hrs',
    sub: 'Detach from ego',
    desc: 'Let emotional bias fade for 24 hours so you can coach yourself like a stranger.',
    icon: Clock,
  },
  {
    num: '03',
    title: 'Listen Only',
    sub: 'Phone face down',
    desc: 'Audit your 5 vocal foundations—rate, volume, pitch, tonality, and pause—without visuals.',
    icon: Headphones,
  },
  {
    num: '04',
    title: 'Watch on Mute',
    sub: 'Hands · face · posture',
    desc: 'Kill the audio and study your physical presence, gestures, and eye-line stability.',
    icon: EyeOff,
  },
  {
    num: '05',
    title: 'AI Transcript',
    sub: 'Verbal & pacing audit',
    desc: 'Get verbatim filler counts, WPM pacing, and targeted next-take drills powered by Gemini.',
    icon: Sparkles,
    highlight: true,
  },
];

export function LandingPage({
  sessionCount,
  onStartStudio,
  onOpenArchive,
  onOpenMethodology,
  onOpenAudiobook,
}: LandingPageProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-16 py-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-7 sm:p-12">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
            <Lock className="h-3.5 w-3.5" />
            <span>Local-First Studio · Camera stays off until you press Start</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
            Stop guessing how you sound.{' '}
            <span className="text-yellow-400">See yourself clearly.</span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            A 5-step communication mirror that separates your{' '}
            <strong className="text-white">voice</strong>,{' '}
            <strong className="text-white">body language</strong>, and{' '}
            <strong className="text-white">words</strong>—so you can fix one habit at a time without overthinking.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onStartStudio}
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300"
            >
              <Mic className="h-4 w-4" />
              <span>{sessionCount > 0 ? 'Record New Take' : 'Start 5-Minute Take'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {sessionCount > 0 && (
              <button
                type="button"
                onClick={onOpenArchive}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
              >
                <span>Resume Archive ({sessionCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenMethodology}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              <span>How It Works</span>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              The 5-Minute Mirror Protocol
            </p>
            <h2 className="text-2xl font-semibold text-zinc-100">
              One take. Three isolated passes. Zero ego.
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Inspired by Vinh Giang&apos;s <em>Before We Forget: How to Connect</em>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  step.highlight
                    ? 'border-yellow-400/40 bg-yellow-400/5'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500">
                      {step.num}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        step.highlight ? 'text-yellow-400' : 'text-zinc-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {step.title}
                    </h3>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      {step.sub}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Flame className="h-4 w-4" />
            <span>30-Day Top 4 Habits</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Measure Day 1 vs. Latest Take
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Track WPM and filler-word drops across takes, and commit to up to 4 deliberate habits at a time.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAudiobook}
          className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2 transition hover:border-zinc-600"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
            <Headphones className="h-4 w-4" />
            <span>Audiobook Lab</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Shadow Pro Narrators
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Compare your pitch, pauses, and volume side-by-side against an AI narrator or reference clip.
          </p>
        </button>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Lock className="h-4 w-4" />
            <span>Zero-Upload Recording</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Stored in Your Browser
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Video and audio stays in local IndexedDB. Nothing is sent to a server unless you request an AI audit.
          </p>
        </div>
      </section>
    </div>
  );
}
