import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Ear,
  EyeOff,
  Hand,
  Headphones,
  MessageSquareText,
  Mic,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { StoryBankPanel } from './StoryBankPanel';

interface MethodologyViewProps {
  onStartNewTake: () => void;
}

const PROTOCOL_STEPS = [
  {
    step: '01',
    title: 'Record 5 Min',
    subtitle: 'First Take · No Plan',
    detail:
      'Capture your raw baseline. When you speak without a script, you reveal your habitual voice—the patterns you copied growing up.',
  },
  {
    step: '02',
    title: 'Wait 24 Hrs',
    subtitle: 'Detach From Ego',
    detail:
      'Your brain remembers the reversed mirror face and skull-conducted voice. Waiting 24 hours lets emotional bias fade so you can coach objectively.',
  },
  {
    step: '03',
    title: 'Listen Only',
    subtitle: 'Phone Face Down',
    detail:
      'Strip away visuals to audit the 5 Vocal Foundations: Tonality, Rate of Speech, Melody (88 Keys), Volume, and Power Pausing.',
  },
  {
    step: '04',
    title: 'Watch on Mute',
    subtitle: 'Hands · Face · Posture',
    detail:
      'Body language is the first language you learned. Mute the audio to catch "stone face," hidden hands, or braced shoulders.',
  },
  {
    step: '05',
    title: 'AI Transcript',
    subtitle: 'Verbal & Story Audit',
    detail:
      'Count non-words ("um, ah") and fillers ("like, basically"), then pick your Top 4 Habits—because applied knowledge is power.',
    highlight: true,
  },
];

const VOCAL_FOUNDATIONS = [
  {
    name: '1. Tonality (Emotion)',
    rule: 'Your face controls your voice.',
    detail:
      'Whatever emotion your face wears, your voice follows. Even lifting the corners of your lips by 2mm warms your tone instantly.',
  },
  {
    name: '2. Rate of Speech (1–10 Scale)',
    rule: 'Home base = 150 WPM (5/10).',
    detail:
      'Slow down to 3/10 when a point matters so listeners can process it; speed up to 8/10 to inject excitement. Flat speed becomes background noise.',
  },
  {
    name: '3. Melody & Pitch (88 Keys)',
    rule: 'Most people use only 20% of their range.',
    detail:
      'Avoid "uptalk" (rising pitch at the end of statements). Drop your pitch at the end to sound decisive, and stretch your range with siren drills.',
  },
  {
    name: '4. Volume (5 Zones)',
    rule: 'The voice can lead the body.',
    detail:
      'Move fluidly across Whisper (1–2), Close Conversation (3–4), Everyday Leader (5–6), Projection (7–8), and Emergency (9–10).',
  },
  {
    name: '5. The Pause (/, //, ///)',
    rule: 'Replace fillers—don’t just fight them.',
    detail:
      'Hold 1s (/), 2s (//), or 3s (///) instead of saying "um" or "like." Silence creates suspense and gives listeners time to feel what you said.',
  },
];

const SATIR_GESTURES = [
  {
    name: 'The Placater',
    cue: 'Open palms facing up (rib height)',
    use: 'Signals "I am not a threat"—ideal for opening conversations and building rapport.',
  },
  {
    name: 'The Leveler',
    cue: 'Palms flat, facing down toward the floor',
    use: 'Projects strength, certainty, and leadership when giving direction.',
  },
  {
    name: 'The Blamer',
    cue: 'Pointing (pro tip: use all fingers together)',
    use: 'Creates sharp emphasis; softening to an open-hand point avoids feeling aggressive.',
  },
  {
    name: 'The Thinker',
    cue: 'One arm tucked, other hand on chin/cheek',
    use: 'Signals deep listening and thoughtful consideration.',
  },
  {
    name: 'The Distracter',
    cue: 'Single clap + wave + voice redirect',
    use: 'Resets wandering ears and eyes when a room starts drifting.',
  },
];

const LISTENING_TRAPS = [
  { trap: 'Judging', fix: 'Notice silently without rating their idea mid-sentence.' },
  { trap: 'Giving Advice', fix: 'Stop building a 7-step fix; ask what they need first.' },
  { trap: 'One-Upping', fix: 'Resist topping their story with your "better" version.' },
  { trap: 'Mind Reading', fix: 'Don’t assume what "ASAP" or "fine" means—reflect their exact word.' },
  { trap: 'Daydreaming', fix: 'Slow down and track their Verbal, Vocal, and Visual radars.' },
];

export function MethodologyView({ onStartNewTake }: MethodologyViewProps) {
  const [tab, setTab] = useState<'vocal' | 'body' | 'story'>('vocal');

  return (
    <div className="mx-auto max-w-6xl space-y-12 py-6">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-zinc-800 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Vinh Giang · Before We Forget: How to Connect</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Communication Is an Instrument You Can Learn to Play
          </h1>
          <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
            Your present voice isn&apos;t fixed—it&apos;s just your <em>habitual</em> voice. When a new vocal or physical choice feels weird, don&apos;t call it fake; call it <strong>unfamiliar</strong> and keep practicing.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewTake}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300"
        >
          <Mic className="h-4 w-4" />
          <span>Record a Take</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {/* 5-Step Isolation Protocol */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-100">
          The 5-Step Isolation Protocol
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {PROTOCOL_STEPS.map((item) => (
            <div
              key={item.step}
              className={`rounded-2xl border p-4 space-y-2 ${
                item.highlight
                  ? 'border-yellow-400/50 bg-yellow-400/10'
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500">{item.step}</span>
                {item.highlight && <Sparkles className="h-4 w-4 text-yellow-400" />}
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
              <p className="text-[11px] font-medium uppercase tracking-wider text-yellow-400/90">
                {item.subtitle}
              </p>
              <p className="text-xs leading-relaxed text-zinc-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Playbook Tabs */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              The Book & STAGE Playbook
            </h2>
            <p className="text-xs text-zinc-400">
              Switch pillars to review exact scales, gestures, and frameworks while auditing your takes.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
            <button
              type="button"
              onClick={() => setTab('vocal')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === 'vocal'
                  ? 'bg-yellow-400 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>5 Vocal Foundations</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('body')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === 'body'
                  ? 'bg-yellow-400 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Hand className="h-3.5 w-3.5" />
              <span>Body & Power Sphere</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('story')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === 'story'
                  ? 'bg-yellow-400 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Ear className="h-3.5 w-3.5" />
              <span>Story & Listening</span>
            </button>
          </div>
        </div>

        {tab === 'vocal' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {VOCAL_FOUNDATIONS.map((vf) => (
              <div
                key={vf.name}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2"
              >
                <h3 className="text-sm font-semibold text-white">{vf.name}</h3>
                <p className="text-xs font-medium text-yellow-400">{vf.rule}</p>
                <p className="text-xs leading-relaxed text-zinc-400">{vf.detail}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'body' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  The Power Sphere
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Keep gestures between your <strong>belly button and your eyes</strong>. Too low disappears; too high looks frantic.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  The Doorway Reset
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Drop and roll shoulders back, soften knees, feet shoulder-width apart, and lift the crown of your head.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  Eye Contact & Timeline
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Hold 3–5 seconds per person in groups. For timelines, your <strong>right = past</strong> and your <strong>left = future</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SATIR_GESTURES.map((g) => (
                <div
                  key={g.name}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-1.5"
                >
                  <h3 className="text-sm font-semibold text-zinc-100">{g.name}</h3>
                  <p className="text-[11px] text-sky-300">{g.cue}</p>
                  <p className="text-xs leading-relaxed text-zinc-400">{g.use}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'story' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3 lg:col-span-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <MessageSquareText className="h-4 w-4" />
                <span>The Storytelling Formula</span>
              </div>
              <ul className="space-y-2.5 text-xs leading-relaxed text-zinc-300">
                <li>
                  <strong className="text-white">1. The Spark (Three Peaks + 4Ws):</strong>{' '}
                  Start near Peak emotion, action, or insight—then dial in <em>Who, What, Where, When</em>.
                </li>
                <li>
                  <strong className="text-white">2. The Point:</strong>{' '}
                  Land the meaning clearly: <em>&ldquo;The reason I&apos;m telling you this is because...&rdquo;</em>
                </li>
                <li>
                  <strong className="text-white">3. The Link:</strong>{' '}
                  Break your story into smaller ideas and connect it directly to your listener&apos;s world.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3 lg:col-span-7">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Headphones className="h-4 w-4" />
                <span>5 Passive Listening Traps to Catch</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LISTENING_TRAPS.map((item) => (
                  <div
                    key={item.trap}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1"
                  >
                    <div className="text-xs font-semibold text-zinc-100">{item.trap}</div>
                    <p className="text-xs text-zinc-400">{item.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Closing Quote */}
      <footer className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm italic text-zinc-300">
          &ldquo;Communication is the fundamental skill that allows you to negotiate any reality you desire.&rdquo;
        </p>
        <button
          type="button"
          onClick={onStartNewTake}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-400/20"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span>Start Your 30-Day Baseline</span>
        </button>
      </footer>
    </div>
  );
}
  {
    code: '01',
    title: 'Record 5 Min — First Take · No Plan',
    body: 'Set a camera in front of you and speak continuously for five minutes on an unscripted prompt. Do not outline or rehearse—capturing your unfiltered first take reveals the exact baseline habits you carry into real conversations.',
  },
  {
    code: '02',
    title: 'Wait 24 Hrs — Then Review It',
    body: 'Never evaluate your recording immediately. Right after speaking, your ego is still tied to what you intended to say. Waiting 24 hours dissolves emotional attachment so you can observe yourself with the neutrality of a stranger.',
  },
  {
    code: '03',
    title: 'Listen Only — Phone Face Down',
    body: 'Put the screen out of sight and audit purely by ear. Isolating the vocal instrument exposes your rate of speech, strategic pauses, downward authority finishes, pitch melody across the "88 keys", and filler habits.',
  },
  {
    code: '04',
    title: 'Watch on Mute — Hands · Face · Posture',
    body: 'Watch the video at 1.5x or 2.0x speed with sound locked off. Removing words makes physical patterns unmistakable—whether your hands illustrate ideas or fidget, and whether your facial expressions unlock or flatten your tonality.',
  },
  {
    code: '05',
    title: 'AI Transcript — Word Choice · Fillers · Clarity',
    body: 'Only after hearing and seeing the take separately do you inspect the verbatim text. Seeing every "um", "like", hedge, and circular tangent printed on the page converts vague self-criticism into concrete drills for your next 5-minute take.',
  },
];

const THREE_CHANNELS = [
  {
    channel: '01 · Vocal (The Instrument)',
    summary: 'How your voice moves across rate, pitch melody, volume, pauses, and emotion.',
    bullets: [
      '88-Key Melody: Move beyond 2–3 flat notes; vary pitch to hold attention.',
      'Authority Finish: Land key statements on a downward pitch inflection.',
      'The Volume Trap: High volume + flat tone reads as aggression; pair projection with warmth.',
      'Strategic Silence: Replace "um" and "uh" with deliberate breathing pauses.',
    ],
  },
  {
    channel: '02 · Visual (Physical Presence)',
    summary: 'What listeners read before a single word registers.',
    bullets: [
      'Face as Remote Control: A rigid face creates a monotone voice; facial energy drives tonality.',
      'Purposeful Hands: Let gestures clarify shape, size, and contrast rather than looping nervously.',
      'Grounded Posture: Stillness in your stance projects composure and invites trust.',
    ],
  },
  {
    channel: '03 · Verbal (Words & Story)',
    summary: 'How clearly your ideas land and stick in someone else’s memory.',
    bullets: [
      'Story Over Data Dump: Wrap core insights in concrete moments rather than abstract rambling.',
      'Cut Circular Phrasing: Notice in the verbatim transcript where a point took three loops to land.',
      'Clean Simplicity: Replace hedging clutter with direct, intentional language.',
    ],
  },
];

export function MethodologyView({ onStartNewTake }: MethodologyViewProps) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10">
      <div className="pb-6 border-b border-[#22262E] flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-xs text-[#FACC15] uppercase tracking-wider">
            Based on Vinh Giang · Before We Forget: How to Connect
          </span>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-[#F5F5F4] text-balance">
            Communication Is an Instrument You Can Learn to Play
          </h1>
        </div>
        <button
          type="button"
          onClick={onStartNewTake}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Record a Take</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-base text-[#D1D5DB] leading-relaxed max-w-3xl">
        Watching yourself on video usually triggers self-judgment because sound, body language,
        and words hit you all at once. Adapted from Vinh Giang&apos;s{' '}
        <span className="text-[#F5F5F4] font-medium">Record &amp; Review</span> practice and his
        book <span className="text-[#F5F5F4] font-medium">Before We Forget: How to Connect</span>,
        The 5-Minute Mirror isolates the Vocal, Visual, and Verbal channels one pass at a time.
      </p>

      {/* The 5-Step Isolation Protocol */}
      <section aria-labelledby="protocol-heading" className="space-y-4">
        <h2
          id="protocol-heading"
          className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]"
        >
          The 5-Step Isolation Protocol
        </h2>
        <div className="divide-y divide-[#22262E] rounded-xl border border-[#22262E] bg-[#121417]">
          {PROTOCOL_STEPS.map((step) => (
            <div
              key={step.code}
              className="p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-start"
            >
              <div className="sm:col-span-2">
                <span
                  className={`font-mono-tabular text-2xl font-semibold ${
                    step.code === '05' ? 'text-[#FACC15]' : 'text-[#9CA3AF]'
                  }`}
                >
                  {step.code}
                </span>
              </div>
              <div className="sm:col-span-10">
                <h3
                  className={`font-display text-2xl font-bold uppercase tracking-wide ${
                    step.code === '05' ? 'text-[#FACC15]' : 'text-[#F5F5F4]'
                  }`}
                >
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[#9CA3AF] leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The 3 Channels: Vocal, Visual, Verbal */}
      <section aria-labelledby="channels-heading" className="space-y-4">
        <h2
          id="channels-heading"
          className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]"
        >
          The 3 Channels Audited Across Your Passes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {THREE_CHANNELS.map((item) => (
            <div
              key={item.channel}
              className="p-6 rounded-xl border border-[#22262E] bg-[#121417] flex flex-col gap-3"
            >
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#FACC15]">
                {item.channel}
              </h3>
              <p className="text-xs text-[#D1D5DB] leading-relaxed">{item.summary}</p>
              <ul className="mt-2 pt-3 border-t border-[#22262E] space-y-2.5 text-xs text-[#9CA3AF] leading-relaxed">
                {item.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <StoryBankPanel />
    </div>
  );
}
