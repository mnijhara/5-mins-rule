import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  VolumeX,
  Plus,
  Trash2,
  ArrowRight,
  Check,
  VideoOff,
} from 'lucide-react';
import { formatClock } from '../lib/format';
import type { MirrorSession, ObservationNote, WatchChecklist } from '../types/mirror';

interface WatchStageProps {
  session: MirrorSession;
  videoUrl: string | null;
  onUpdateChecklist: (checklist: WatchChecklist) => Promise<void>;
  onAddNote: (note: Omit<ObservationNote, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCompleteStep: () => Promise<void>;
}

const WATCH_ITEMS: { key: keyof WatchChecklist; label: string; hint: string }[] = [
  {
    key: 'handGestures',
    label: 'Hands & Purposeful Gestures',
    hint: 'Do your hands illustrate the narrative openly, or repeat nervous, distracting loops?',
  },
  {
    key: 'facialCongruence',
    label: 'Face (Remote Control for Tonality)',
    hint: 'A frozen face creates a monotone voice. Look for relaxed muscles and expressive warmth.',
  },
  {
    key: 'postureAndStance',
    label: 'Posture & Grounded Presence',
    hint: 'Watch for swaying, collapsed shoulders, or restless shifting that leaks tension.',
  },
  {
    key: 'eyeLineStability',
    label: 'Eye-Line Connection',
    hint: 'Notice where your eyes dart when searching for words instead of holding connection.',
  },
];

const VISUAL_CATEGORIES = ['Hands', 'Face', 'Posture', 'Eyes'];

export function WatchStage({
  session,
  videoUrl,
  onUpdateChecklist,
  onAddNote,
  onDeleteNote,
  onCompleteStep,
}: WatchStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.5);
  const [noteCategory, setNoteCategory] = useState<string>('Hands');
  const [noteText, setNoteText] = useState('');

  const watchNotes = session.notes.filter((n) => n.step === 4);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = true;
    videoEl.volume = 0;
    videoEl.playbackRate = playbackRate;

    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const onLoadedMeta = () => {
      if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
        setDuration(videoEl.duration);
      }
      videoEl.muted = true;
      videoEl.playbackRate = playbackRate;
    };
    const onEnforceMute = () => {
      if (!videoEl.muted || videoEl.volume > 0) {
        videoEl.muted = true;
        videoEl.volume = 0;
      }
    };
    const onEnded = () => setIsPlaying(false);

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('loadedmetadata', onLoadedMeta);
    videoEl.addEventListener('volumechange', onEnforceMute);
    videoEl.addEventListener('ended', onEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', onLoadedMeta);
      videoEl.removeEventListener('volumechange', onEnforceMute);
      videoEl.removeEventListener('ended', onEnded);
    };
  }, [videoUrl, playbackRate]);

  const togglePlay = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.pause();
      setIsPlaying(false);
    } else {
      videoEl.muted = true;
      await videoEl.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(duration || session.durationSeconds, seconds));
    setCurrentTime(videoEl.currentTime);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const handleToggleChecklist = async (key: keyof WatchChecklist) => {
    await onUpdateChecklist({
      ...session.watchChecklist,
      [key]: !session.watchChecklist[key],
    });
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await onAddNote({
      step: 4,
      timestampSeconds: Math.round(currentTime),
      category: noteCategory,
      text: noteText.trim(),
    });
    setNoteText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 7 cols: Strictly Muted Video Player */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <span className="font-mono-tabular text-xs text-[#9CA3AF] uppercase tracking-wider">
                Step 04 · Visual Isolation
              </span>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                Watch on Mute · Hands · Face · Posture
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[#FACC15]">
              <VolumeX className="w-4 h-4" />
              <span>Sound Locked Off</span>
            </div>
          </div>

          {videoUrl ? (
            <>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#22262E] bg-[#0B0C0E]">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-5 space-y-4">
                <input
                  type="range"
                  min={0}
                  max={duration || session.durationSeconds || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Video playback position"
                  className="w-full accent-[#FACC15] cursor-pointer"
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5F5F4] hover:bg-white text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'Pause Video' : 'Watch Muted'}</span>
                    </button>

                    <span className="font-mono-tabular text-sm text-[#D1D5DB]">
                      {formatClock(currentTime)} / {formatClock(duration || session.durationSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
                    {[1, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-2.5 py-1 rounded-md font-mono-tabular text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-[#1F242E] text-[#FACC15]'
                            : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-video w-full rounded-xl border border-[#22262E] bg-[#0B0C0E] flex flex-col items-center justify-center p-8 text-center">
              <VideoOff className="w-8 h-8 text-[#6B7280] mb-3" />
              <p className="text-sm font-medium text-[#E5E7EB]">
                This take was recorded in Audio-Only mode
              </p>
              <p className="mt-1 text-xs text-[#9CA3AF] max-w-md">
                No video track is attached to this session. Record with Camera + Mic next
                time to inspect hands, facial expressions, and posture, or proceed straight to
                Step 05.
              </p>
            </div>
          )}
        </div>

        {/* Timestamped Visual Notes */}
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <h3 className="text-sm font-semibold text-[#F5F5F4] mb-4">
            Body Language Notes ({watchNotes.length})
          </h3>

          <form onSubmit={handleSubmitNote} className="flex flex-wrap sm:flex-nowrap gap-2 mb-5">
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              aria-label="Body language category"
              className="px-3 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-xs text-[#E5E7EB] focus:border-[#FACC15] focus:outline-none"
            >
              {VISUAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Visual cue at ${formatClock(currentTime)} (e.g., clasped hands tightly)...`}
              className="flex-1 min-w-[180px] px-3.5 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-sm text-[#F5F5F4] placeholder-[#6B7280] focus:border-[#FACC15] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!noteText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F242E] hover:bg-[#2A303D] disabled:opacity-40 text-xs font-semibold text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Flag at {formatClock(currentTime)}</span>
            </button>
          </form>

          {watchNotes.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-2">
              Tip: Watching at 1.5x or 2.0x speed makes repetitive hand habits and posture shifts
              immediately obvious.
            </p>
          ) : (
            <ul className="divide-y divide-[#22262E]">
              {watchNotes.map((note) => (
                <li key={note.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => seekTo(note.timestampSeconds)}
                      className="font-mono-tabular text-xs text-[#FACC15] hover:underline pt-0.5 shrink-0 cursor-pointer"
                    >
                      {formatClock(note.timestampSeconds)}
                    </button>
                    <div>
                      <span className="text-xs text-[#9CA3AF] mr-2">{note.category} ·</span>
                      <span className="text-sm text-[#E5E7EB]">{note.text}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    aria-label="Delete visual note"
                    className="text-[#6B7280] hover:text-red-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right 5 cols: Body Language Checklist */}
      <div className="lg:col-span-5">
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            What to Watch For
          </h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Default speed is set to 1.5x so micro-habits stand out without sound biasing you.
          </p>

          <div className="mt-5 divide-y divide-[#22262E]">
            {WATCH_ITEMS.map((item) => {
              const checked = session.watchChecklist[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleToggleChecklist(item.key)}
                  className="w-full py-4 flex items-start gap-3.5 text-left group cursor-pointer"
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'bg-[#FACC15] border-[#FACC15] text-[#0B0C0E]'
                        : 'border-[#333945] bg-[#0B0C0E] group-hover:border-[#6B7280]'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" strokeWidth={2.75} />}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-[#F5F5F4]">{item.label}</div>
                    <div className="mt-0.5 text-xs text-[#9CA3AF] leading-relaxed">
                      {item.hint}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onCompleteStep}
            className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Proceed to Step 05: AI Transcript</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
