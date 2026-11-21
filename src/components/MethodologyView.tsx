import { ArrowRight } from 'lucide-react';

interface MethodologyViewProps {
  onStartNewTake: () => void;
}

const PROTOCOL_STEPS = [
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
    </div>
  );
}
