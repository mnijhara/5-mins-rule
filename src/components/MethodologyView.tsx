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

const AUTHORITY_GESTURES = [
  {
    level: '01',
    name: 'Placator',
    cue: 'Palms up · open',
    use: 'Signals "I am not a threat"—ideal for opening conversations, softening tension, and building rapport.',
  },
  {
    level: '02',
    name: 'Leveler',
    cue: 'Palms down · "Here\'s the thing"',
    use: 'Grounds the room with calm certainty, weight, and leadership when giving direction.',
  },
  {
    level: '03',
    name: 'Blamer',
    cue: 'Even more authority',
    use: 'Sharpens emphasis and command when drawing a firm boundary or holding attention.',
  },
  {
    level: '04',
    name: 'Point',
    cue: 'One-to-many only',
    use: 'Maximum directional authority for stages and large rooms (use an open hand or all fingers together; avoid 1-on-1).',
  },
];

const COMPUTER_GESTURE = {
  name: 'Computer',
  cue: 'Hand to chin · "I\'m thinking"',
  use: 'Signals deep analytical listening and thoughtful consideration before you respond.',
};

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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Dial Up Your Authority + Computer
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Match your hand posture to the level of authority the moment calls for—then switch to Computer when listening.
                  </p>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
                  Authority Progression
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {AUTHORITY_GESTURES.map((g, idx) => (
                  <div
                    key={g.name}
                    className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-zinc-500">
                        {g.level}
                      </span>
                      {idx < AUTHORITY_GESTURES.length - 1 && (
                        <ArrowRight className="hidden h-3.5 w-3.5 text-sky-400/70 lg:block" />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-100">{g.name}</h4>
                    <p className="text-[11px] font-medium text-sky-300">[{g.cue}]</p>
                    <p className="text-xs leading-relaxed text-zinc-400">{g.use}</p>
                  </div>
                ))}
              </div>

              {/* Analytical / Listening Stance set apart */}
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                      Analytical / Listening Stance
                    </span>
                    <span className="text-xs font-medium text-amber-200">
                      [{COMPUTER_GESTURE.cue}]
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    {COMPUTER_GESTURE.name}
                  </h4>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {COMPUTER_GESTURE.use}
                  </p>
                </div>
              </div>
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

      <StoryBankPanel />

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
