import React, { useState } from 'react';
import {
  ArrowRight,
  Clock,
  EyeOff,
  Flame,
  Headphones,
  Lock,
  Mic,
  Play,
  Sparkles,
  TrendingDown,
  Video,
} from 'lucide-react';

interface LandingPageProps {
  sessionCount: number;
  onStartStudio: () => void;
  onOpenArchive: () => void;
  onOpenMethodology: () => void;
  onOpenAudiobook: () => void;
  onLoadSample?: () => void;
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

const PREVIEW_PASSES = {
  vocal: {
    label: '03 · Listen Only',
    badge: 'Vocal Foundations',
    metricLabel: '88-Key Pitch Span',
    metricValue: '11.4 semitones',
    delta: '+3.2 vs Day 1',
    cue: 'You rushed the transition at 01:18. Hold a 2-second silent pause before your punchline—silence signals authority.',
    bars: [28, 45, 72, 38, 86, 64, 22, 18, 92, 74, 52, 80, 44, 68, 30, 88],
  },
  visual: {
    label: '04 · Watch on Mute',
    badge: 'Physical Presence',
    metricLabel: 'Gesture & Eye Line',
    metricValue: 'Open · Grounded',
    delta: '0 fidgets flagged',
    cue: 'Your hands stayed above the waist on the key contrast at 00:45, pulling focus straight back to your face.',
    bars: [50, 56, 62, 70, 74, 68, 80, 84, 78, 88, 90, 85, 82, 92, 88, 94],
  },
  verbal: {
    label: '05 · AI Transcript',
    badge: 'Verbal Audit',
    metricLabel: 'Filler Words',
    metricValue: '1 per take',
    delta: 'Down from 11 on Day 1',
    cue: 'Replaced "um" and "you know" with clean breaths. Next drill: drop your volume 20% on the final sentence.',
    bars: [82, 76, 68, 60, 54, 48, 42, 38, 32, 26, 22, 18, 16, 14, 12, 10],
  },
} as const;

type PreviewKey = keyof typeof PREVIEW_PASSES;

export function LandingPage({
  sessionCount,
  onStartStudio,
  onOpenArchive,
  onOpenMethodology,
  onOpenAudiobook,
  onLoadSample,
}: LandingPageProps) {
  const [activePreview, setActivePreview] = useState<PreviewKey>('vocal');
  const preview = PREVIEW_PASSES[activePreview];

  return (
    <div className="mx-auto max-w-6xl space-y-16 py-6 sm:py-10">
      {/* Stage-Spotlight Split Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-[#0D0F12] p-6 sm:p-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl"
        />

        <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left: Editorial Copy */}
          <div className="space-y-6 lg:col-span-7">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.06]">
              Great ideas get ignored when delivery falls flat.{' '}
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                Hear and see yourself the way everyone else does.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Your skull alters the sound of your own voice, and a mirror flips your face.
              Record 5 unscripted minutes, wait 24 hours for the ego to fade, then review your{' '}
              <strong className="text-white">voice</strong>,{' '}
              <strong className="text-white">body language</strong>, and{' '}
              <strong className="text-white">words</strong>—one pass at a time.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartStudio}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
              >
                <Mic className="h-4 w-4" />
                <span>{sessionCount > 0 ? 'Record New Take' : 'Start 5-Minute Take'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {sessionCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenArchive}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
                >
                  <span>Resume Archive ({sessionCount})</span>
                </button>
              ) : (
                onLoadSample && (
                  <button
                    type="button"
                    onClick={onLoadSample}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3.5 text-sm font-medium text-zinc-100 transition hover:border-yellow-400/50 hover:text-yellow-300"
                  >
                    <Play className="h-3.5 w-3.5 text-yellow-400" />
                    <span>Explore Sample Audit</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onOpenMethodology}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                <span>How It Works</span>
              </button>
            </div>
          </div>

          {/* Right: Interactive Live Pass Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Interactive Mirror Preview
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  <TrendingDown className="h-3 w-3" />
                  <span>Day 1 → Day 30</span>
                </span>
              </div>

              {/* 3-Tab Pass Switcher */}
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
                {(['vocal', 'visual', 'verbal'] as PreviewKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePreview(key)}
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                      activePreview === key
                        ? 'bg-yellow-400 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {key === 'vocal' ? '03 Vocal' : key === 'visual' ? '04 Mute' : '05 AI'}
                  </button>
                ))}
              </div>

              {/* Dynamic Metric + Waveform */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                      {preview.metricLabel}
                    </div>
                    <div className="text-xl font-bold text-white">
                      {preview.metricValue}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-yellow-400">
                    {preview.delta}
                  </span>
                </div>

                {/* Animated-style Waveform Bars */}
                <div className="flex h-12 items-end gap-1 pt-1" aria-hidden="true">
                  {preview.bars.map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all duration-300 ${
                        height > 75
                          ? 'bg-yellow-400'
                          : height > 45
                          ? 'bg-yellow-400/55'
                          : 'bg-zinc-700'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                <p className="border-t border-zinc-800/80 pt-3 text-xs leading-relaxed text-zinc-300">
                  <span className="font-semibold text-yellow-400">{preview.badge}: </span>
                  {preview.cue}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Architectural Proof Strip */}
        <div className="relative mt-10 grid grid-cols-1 divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3.5">
            <div className="text-sm font-semibold text-white">3 Isolated Passes</div>
            <div className="text-xs text-zinc-400">Separate voice, visuals, and words</div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-sm font-semibold text-white">24-Hour Detachment</div>
            <div className="text-xs text-zinc-400">Coach yourself without emotional bias</div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-sm font-semibold text-white">Private by Default</div>
            <div className="text-xs text-zinc-400">Stays on your device until you run an audit</div>
          </div>
        </div>
      </section>

      {/* 5-Step Isolation Protocol */}
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
                className={`group flex flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                  step.highlight
                    ? 'border-yellow-400/50 bg-yellow-400/10 shadow-lg shadow-yellow-400/5'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500">
                      {step.num}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        step.highlight ? 'text-yellow-400' : 'text-zinc-400 group-hover:text-zinc-200'
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

      {/* Practice Modes & Privacy */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={onOpenArchive}
          className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2 transition hover:border-amber-400/40"
        >
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
        </button>

        <button
          type="button"
          onClick={onOpenAudiobook}
          className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2 transition hover:border-sky-400/40"
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
            <span>Private Practice</span>
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Stays on Your Device
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Your recordings remain private on your device. Nothing leaves it unless you choose to run the AI audit.
          </p>
        </div>
      </section>
    </div>
  );
}
