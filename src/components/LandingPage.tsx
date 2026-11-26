import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  EyeOff,
  Flame,
  Headphones,
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

const USE_CASES = [
  'Confidence',
  'Job & Promotion',
  'Leadership',
  'Dating & Social',
];

const STEPS = [
  {
    num: '01',
    title: 'Record 5 Min',
    sub: 'First take · no plan',
    desc: 'Speak unscripted—capture your real baseline.',
    icon: Video,
  },
  {
    num: '02',
    title: 'Wait 24 Hrs',
    sub: 'Drop the ego',
    desc: 'Review yourself tomorrow like a stranger.',
    icon: Clock,
  },
  {
    num: '03',
    title: 'Listen Only',
    sub: 'Phone face down',
    desc: 'Spot rushed pace, flat tone, and volume.',
    icon: Headphones,
  },
  {
    num: '04',
    title: 'Watch on Mute',
    sub: 'Hands · face · posture',
    desc: 'Catch fidgets, stiffness, and eye contact.',
    icon: EyeOff,
  },
  {
    num: '05',
    title: 'AI Transcript',
    sub: 'Fillers & drills',
    desc: 'Get exact filler counts and next-take drills.',
    icon: Sparkles,
    highlight: true,
  },
];

const PREVIEW_PASSES = {
  vocal: {
    label: 'Vocal Foundations',
    metricLabel: '88-Key Pitch Span',
    metricValue: '11.4 semitones',
    delta: '+3.2 vs Day 1',
    cue: 'Hold a 2-second pause before your key point—silence signals confidence.',
    bars: [28, 45, 72, 38, 86, 64, 22, 18, 92, 74, 52, 80, 44, 68, 30, 88],
  },
  visual: {
    label: 'Physical Presence',
    metricLabel: 'Hands & Eye Line',
    metricValue: 'Open · Grounded',
    delta: '0 fidgets flagged',
    cue: 'Hands stayed in the Power Sphere—pulling focus straight back to your face.',
    bars: [50, 56, 62, 70, 74, 68, 80, 84, 78, 88, 90, 85, 82, 92, 88, 94],
  },
  verbal: {
    label: 'Verbal Audit',
    metricLabel: 'Filler Words',
    metricValue: '1 per take',
    delta: 'Down from 11 on Day 1',
    cue: 'Replaced "um" and "like" with clean breaths. Drop volume 20% on your close.',
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
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const preview = PREVIEW_PASSES[activePreview];

  return (
    <div className="mx-auto max-w-6xl space-y-10 py-4 sm:space-y-14 sm:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
        />

        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-stone-200 bg-[#FAF7F2] px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#111318] sm:text-5xl lg:leading-[1.08]">
              Be heard. Be seen.{' '}
              <span className="text-[#1D4ED8]">Speak with confidence.</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Record 5 unscripted minutes. Audit your voice, body language, and filler words—for a job, a promotion, personal confidence, or asking someone out.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={onStartStudio}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#111318] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 sm:w-auto"
              >
                <Mic className="h-4 w-4 text-[#FACC15]" />
                <span>{sessionCount > 0 ? 'Record New Take' : 'Start 5-Min Take'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {sessionCount > 0 ? (
                <button
                  type="button"
                  onClick={onOpenArchive}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-400 sm:w-auto"
                >
                  <span>My Takes ({sessionCount})</span>
                </button>
              ) : (
                onLoadSample && (
                  <button
                    type="button"
                    onClick={onLoadSample}
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-[#FAF7F2] px-5 py-3 text-sm font-medium text-stone-800 transition hover:border-[#1D4ED8] hover:text-[#1D4ED8] sm:w-auto"
                  >
                    <Play className="h-3.5 w-3.5 text-[#1D4ED8]" />
                    <span>Try Sample Audit</span>
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobilePreview((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 lg:hidden"
            >
              <span>{showMobilePreview ? 'Hide' : 'Preview'} sample scorecard</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showMobilePreview ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <div className={`${showMobilePreview ? 'block' : 'hidden'} lg:block lg:col-span-5`}>
            <div className="rounded-2xl border border-stone-200 bg-[#FAF7F2] p-4 shadow-sm space-y-3.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Mirror Preview
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <TrendingDown className="h-3 w-3" />
                  <span>Day 1 → Day 30</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-stone-200 bg-white p-1">
                {(['vocal', 'visual', 'verbal'] as PreviewKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePreview(key)}
                    className={`min-h-[36px] rounded-lg px-2 py-1 text-xs font-medium transition ${
                      activePreview === key
                        ? 'bg-[#111318] text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {key === 'vocal' ? 'Vocal' : key === 'visual' ? 'Visual' : 'AI'}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-stone-500">
                      {preview.metricLabel}
                    </div>
                    <div className="text-lg font-bold text-[#111318]">
                      {preview.metricValue}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#1D4ED8]">
                    {preview.delta}
                  </span>
                </div>

                <div className="flex h-10 items-end gap-1" aria-hidden="true">
                  {preview.bars.map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${
                        height > 75
                          ? 'bg-[#1D4ED8]'
                          : height > 45
                          ? 'bg-blue-400/70'
                          : 'bg-stone-200'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                <p className="border-t border-stone-100 pt-2.5 text-xs leading-relaxed text-stone-600">
                  <strong className="text-[#111318]">{preview.label}:</strong> {preview.cue}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111318] sm:text-xl">
            How the 5-Minute Mirror Works
          </h2>
          <button
            type="button"
            onClick={onOpenMethodology}
            className="text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            Full playbook →
          </button>
        </div>

        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className={`w-[220px] shrink-0 snap-start rounded-2xl border p-4 space-y-2 lg:w-auto ${
                  step.highlight
                    ? 'border-[#FACC15] bg-amber-50/80 shadow-sm'
                    : 'border-stone-200 bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-stone-400">{step.num}</span>
                  <Icon
                    className={`h-4 w-4 ${
                      step.highlight ? 'text-amber-600' : 'text-stone-500'
                    }`}
                  />
                </div>
                <h3 className="text-sm font-semibold text-[#111318]">{step.title}</h3>
                <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                  {step.sub}
                </p>
                <p className="text-xs leading-relaxed text-stone-600">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenArchive}
          className="text-left rounded-2xl border border-stone-200 bg-white p-5 space-y-1.5 shadow-sm transition hover:border-amber-400"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <Flame className="h-4 w-4" />
            <span>30-Day Top 4 Habits</span>
          </div>
          <p className="text-sm font-medium text-[#111318]">
            Compare Day 1 vs. your latest take and fix one habit at a time.
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenAudiobook}
          className="text-left rounded-2xl border border-stone-200 bg-white p-5 space-y-1.5 shadow-sm transition hover:border-[#1D4ED8]"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            <Headphones className="h-4 w-4" />
            <span>Audiobook Lab</span>
          </div>
          <p className="text-sm font-medium text-[#111318]">
            Shadow great narrators to expand your pitch, pace, and pauses.
          </p>
        </button>
      </section>
    </div>
  );
}
