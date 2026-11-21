import { Video, Clock, Volume2, Eye, Check, Lock } from 'lucide-react';
import type { MirrorStep } from '../types/mirror';

interface StepRailProps {
  activeStep: MirrorStep;
  completedSteps: MirrorStep[];
  hasSession: boolean;
  isUnlocked: boolean;
  onSelectStep: (step: MirrorStep) => void;
}

interface StepDefinition {
  step: MirrorStep;
  code: string;
  title: string;
  subtitle: string;
}

const STEPS: StepDefinition[] = [
  { step: 1, code: '01', title: 'Record 5 Min', subtitle: 'First take · No plan' },
  { step: 2, code: '02', title: 'Wait 24 Hrs', subtitle: 'Then review it' },
  { step: 3, code: '03', title: 'Listen Only', subtitle: 'Phone face down' },
  { step: 4, code: '04', title: 'Watch on Mute', subtitle: 'Hands · Face · Posture' },
  { step: 5, code: '05', title: 'AI Transcript', subtitle: 'Words · Fillers · Clarity' },
];

function StepIcon({ step, isActive }: { step: MirrorStep; isActive: boolean }) {
  if (step === 1) {
    return <Video className="w-6 h-6" strokeWidth={1.75} />;
  }
  if (step === 2) {
    return <Clock className="w-6 h-6" strokeWidth={1.75} />;
  }
  if (step === 3) {
    return <Volume2 className="w-6 h-6" strokeWidth={1.75} />;
  }
  if (step === 4) {
    return (
      <div className="relative flex items-center justify-center">
        <Eye className="w-6 h-6" strokeWidth={1.75} />
        <span
          aria-hidden="true"
          className={`absolute -bottom-1 -right-1 w-2.5 h-0.5 rotate-45 rounded-full ${
            isActive ? 'bg-[#FACC15]' : 'bg-[#FACC15]/80'
          }`}
        />
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 28 28"
      className="w-7 h-7"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6.5C4 5.12 5.12 4 6.5 4h15C22.88 4 24 5.12 24 6.5v10.5c0 1.38-1.12 2.5-2.5 2.5H12l-5 4v-4H6.5C5.12 19.5 4 18.38 4 17V6.5Z"
        fill="currentColor"
      />
      <text
        x="14"
        y="14.2"
        textAnchor="middle"
        fill="#0B0C0E"
        fontSize="8.5"
        fontWeight="700"
        fontFamily="Barlow Condensed, sans-serif"
        letterSpacing="0.06em"
      >
        AI
      </text>
    </svg>
  );
}

export function StepRail({
  activeStep,
  completedSteps,
  hasSession,
  isUnlocked,
  onSelectStep,
}: StepRailProps) {
  const canNavigateTo = (step: MirrorStep): boolean => {
    if (step === 1) return true;
    if (!hasSession) return false;
    if (step === 2) return true;
    return isUnlocked;
  };

  return (
    <section
      aria-label="5-Step Mirror Workflow"
      className="w-full border-b border-[#22262E] bg-[#0F1115]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-2 items-start">
          {STEPS.map((item, idx) => {
            const isActive = activeStep === item.step;
            const isCompleted = completedSteps.includes(item.step);
            const navigable = canNavigateTo(item.step);
            const isAiStep = item.step === 5;
            const lockedByWait = item.step >= 3 && hasSession && !isUnlocked;

            return (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {idx < STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden sm:flex items-center justify-center absolute top-8 -right-4 w-8 text-[#4B5563] pointer-events-none"
                  >
                    <svg viewBox="0 0 32 12" className="w-7 h-3" fill="none">
                      <line x1="0" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="1.25" />
                      <polyline
                        points="22,2 27,6 22,10"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!navigable}
                  onClick={() => navigable && onSelectStep(item.step)}
                  className={`group flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded-lg px-2 py-1 transition-colors ${
                    navigable ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
                  }`}
                >
                  <div
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-150 ${
                      isAiStep
                        ? isActive
                          ? 'border-[#FACC15] bg-[#FACC15]/15 text-[#FACC15] shadow-[0_0_24px_rgba(250,204,21,0.18)]'
                          : 'border-[#FACC15]/70 bg-[#FACC15]/5 text-[#FACC15] group-hover:border-[#FACC15]'
                        : isActive
                        ? 'border-[#F5F5F4] bg-[#F5F5F4]/10 text-[#F5F5F4]'
                        : isCompleted
                        ? 'border-[#9CA3AF] bg-[#171A21] text-[#F5F5F4]'
                        : 'border-[#333945] bg-[#121417] text-[#D1D5DB] group-hover:border-[#6B7280]'
                    }`}
                  >
                    <StepIcon step={item.step} isActive={isActive} />
                    {isCompleted && !isActive && (
                      <span
                        title="Completed"
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#F5F5F4] text-[#0B0C0E] flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" strokeWidth={2.75} />
                      </span>
                    )}
                    {lockedByWait && (
                      <span
                        title="Unlocks after 24-hour wait"
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1C2029] border border-[#333945] text-[#9CA3AF] flex items-center justify-center"
                      >
                        <Lock className="w-2.5 h-2.5" strokeWidth={2.25} />
                      </span>
                    )}
                  </div>

                  <span
                    className={`mt-2.5 font-mono-tabular text-[11px] tracking-wider ${
                      isAiStep
                        ? 'text-[#FACC15]'
                        : isActive
                        ? 'text-[#F5F5F4]'
                        : 'text-[#9CA3AF]'
                    }`}
                  >
                    {item.code}
                  </span>

                  <span
                    className={`font-display text-lg sm:text-xl font-bold uppercase tracking-wide leading-tight whitespace-nowrap ${
                      isAiStep
                        ? 'text-[#FACC15]'
                        : isActive
                        ? 'text-[#F5F5F4]'
                        : 'text-[#E5E7EB] group-hover:text-white'
                    }`}
                  >
                    {item.title}
                  </span>

                  <span className="mt-0.5 text-[11px] text-[#9CA3AF] tracking-wide whitespace-nowrap">
                    {item.subtitle}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
