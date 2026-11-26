import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Plus, Trash2, ArrowRight, Check } from 'lucide-react';
import { formatClock } from '../lib/format';
import { analyzeAudioAcoustics, type AcousticMetrics } from '../lib/audioAnalysis';
import type { ListenChecklist, MirrorSession, ObservationNote } from '../types/mirror';

interface ListenStageProps {
  session: MirrorSession;
  audioBlob: Blob | null;
  audioUrl: string | null;
  onUpdateChecklist: (checklist: ListenChecklist) => Promise<void>;
  onAddNote: (note: Omit<ObservationNote, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCompleteStep: () => Promise<void>;
}

const CHECKLIST_ITEMS: { key: keyof ListenChecklist; label: string; hint: string }[] = [
  {
    key: 'vocalVariety',
    label: 'Pitch & Melody (88-Key Piano)',
    hint: 'Are you playing only 2–3 flat notes, or moving across pitch to keep the listener hooked?',
  },
  {
    key: 'sentenceEndings',
    label: 'Authority Finish (Downward Pitch)',
    hint: 'Do sentences end with a grounded downward drop, or trail upward like a question?',
  },
  {
    key: 'pacingAndPauses',
    label: 'Rate of Speech & Strategic Pauses',
    hint: 'Slow down for weight, speed up for urgency, and let silence give ideas room to land.',
  },
  {
    key: 'volumeAndProjection',
    label: 'Volume Without the "Volume Trap"',
    hint: 'High volume with flat melody sounds aggressive; pair projection with warmth and breath.',
  },
  {
    key: 'tonalityAndEmotion',
    label: 'Tonality (Emotion Beneath Words)',
    hint: 'Does the feeling in your voice genuinely match the story or message you are sharing?',
  },
  {
    key: 'fillerAwareness',
    label: 'Fillers Replacing Silence',
    hint: 'Notice where "um", "uh", or "like" slipped in instead of a clean silent pause.',
  },
];

const NOTE_CATEGORIES = ['Tone', 'Pace', 'Filler', 'Pause', 'Clarity'];

export function ListenStage({
  session,
  audioBlob,
  audioUrl,
  onUpdateChecklist,
  onAddNote,
  onDeleteNote,
  onCompleteStep,
}: ListenStageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceConnectedRef = useRef(false);
  const animRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [noteCategory, setNoteCategory] = useState<string>('Tone');
  const [faceDownMode, setFaceDownMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [acoustics, setAcoustics] = useState<AcousticMetrics | null>(null);

  const listenNotes = session.notes.filter((n) => n.step === 3);

  useEffect(() => {
    let cancelled = false;
    if (!audioBlob) {
      setAcoustics(null);
      return;
    }
    analyzeAudioAcoustics(audioBlob).then((res) => {
      if (!cancelled) {
        setAcoustics(res);
        if (res.durationSeconds > 0 && (!Number.isFinite(duration) || duration <= 1)) {
          setDuration(res.durationSeconds);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [audioBlob]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    audioEl.playbackRate = playbackRate;
    const onTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    const onLoadedMeta = () => {
      audioEl.playbackRate = playbackRate;
      if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        setDuration(audioEl.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audioEl.addEventListener('timeupdate', onTimeUpdate);
    audioEl.addEventListener('loadedmetadata', onLoadedMeta);
    audioEl.addEventListener('ended', onEnded);

    return () => {
      audioEl.removeEventListener('timeupdate', onTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', onLoadedMeta);
      audioEl.removeEventListener('ended', onEnded);
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      sourceConnectedRef.current = false;
    };
  }, [audioUrl]);

  const startVisualizer = () => {
    const audioEl = audioRef.current;
    const canvas = canvasRef.current;
    if (!audioEl || !canvas) return;

    if (!audioCtxRef.current && !sourceConnectedRef.current) {
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        sourceConnectedRef.current = true;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          const c2d = canvas.getContext('2d');
          if (!c2d) return;
          analyser.getByteFrequencyData(data);
          c2d.clearRect(0, 0, canvas.width, canvas.height);

          const barCount = data.length;
          const barWidth = canvas.width / barCount;
          for (let i = 0; i < barCount; i++) {
            const val = data[i] / 255;
            const barHeight = Math.max(4, val * (canvas.height - 16));
            const x = i * barWidth + 2;
            const y = (canvas.height - barHeight) / 2;
            c2d.fillStyle = val > 0.62 ? '#FACC15' : '#9CA3AF';
            c2d.fillRect(x, y, Math.max(2, barWidth - 4), barHeight);
          }
          animRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch {
        // Fallback if Web Audio source attachment is restricted
      }
    } else if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const togglePlay = async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      audioEl.playbackRate = playbackRate;
      startVisualizer();
      await audioEl.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.currentTime = Math.max(0, Math.min(duration || session.durationSeconds, seconds));
    setCurrentTime(audioEl.currentTime);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const handleToggleChecklist = async (key: keyof ListenChecklist) => {
    await onUpdateChecklist({
      ...session.listenChecklist,
      [key]: !session.listenChecklist[key],
    });
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await onAddNote({
      step: 3,
      timestampSeconds: Math.round(currentTime),
      category: noteCategory,
      text: noteText.trim(),
    });
    setNoteText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 7 cols: Acoustic "Phone Face Down" Deck */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="p-8 rounded-xl border border-[#22262E] bg-[#121417]">
          {faceDownMode && (
        <div className="fixed inset-0 z-50 bg-[#0B0C0E]/98 flex flex-col items-center justify-center gap-6 p-6">
          <div className="font-mono-tabular text-5xl sm:text-6xl font-bold text-[#F5F5F4] tracking-tight">
            {formatClock(currentTime)}
          </div>
          <button
            type="button"
            disabled={!audioUrl}
            onClick={togglePlay}
            className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[#F5F5F4] hover:bg-white disabled:opacity-40 text-[#0B0C0E] font-semibold text-lg transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onAddNote({
                step: 3,
                timestampSeconds: Math.round(currentTime),
                category: noteCategory,
                text: 'Quick vocal flag (eyes-closed)',
              })
            }
            className="px-8 py-4 rounded-xl border border-[#FACC15]/50 bg-[#FACC15]/15 hover:bg-[#FACC15]/25 text-[#FACC15] font-medium text-base transition-colors cursor-pointer"
          >
            Tap to Flag Vocal Moment
          </button>
          <button
            type="button"
            onClick={() => setFaceDownMode(false)}
            className="mt-2 px-5 py-2.5 rounded-lg border border-[#333945] text-[#9CA3AF] hover:text-[#F5F5F4] text-sm transition-colors cursor-pointer"
          >
            Exit Face-Down Mode
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-mono-tabular text-xs text-[#9CA3AF] uppercase tracking-wider">
                Step 03 · Audio Isolation
              </span>
              <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                Listen Only · Phone Face Down
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFaceDownMode(true)}
                className="px-3 py-1.5 rounded-lg border border-[#333945] bg-[#171A21] hover:border-[#FACC15]/60 text-xs font-medium text-[#F5F5F4] transition-colors cursor-pointer"
              >
                Face-Down Mode
              </button>
              <div className="w-11 h-11 rounded-full border border-[#333945] bg-[#171A21] flex items-center justify-center text-[#FACC15]">
                <Volume2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
            Video is intentionally blacked out. Close your eyes or look away from the screen
            and evaluate purely by ear—pitch, pace, pauses, and vocal confidence.
          </p>

          {/* Acoustic Veil Stage */}
          <div className="relative rounded-xl border border-[#22262E] bg-[#0B0C0E] p-6 flex flex-col items-center justify-center min-h-[210px]">
            <canvas
              ref={canvasRef}
              width={560}
              height={120}
              className="w-full max-w-xl h-28"
            />
            {!isPlaying && currentTime === 0 && (
              <p className="mt-2 text-xs text-[#6B7280]">
                Press Play to begin your audio-only pass
              </p>
            )}
          </div>

          {acoustics && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-[#22262E] rounded-lg border border-[#22262E] bg-[#0B0C0E]">
              <div className="p-3.5">
                <span className="text-[11px] text-[#9CA3AF]">88-Key Pitch Span</span>
                <div className="mt-0.5 font-mono-tabular text-lg font-semibold text-[#F5F5F4]">
                  {acoustics.pitchRangeSemitones > 0
                    ? `${acoustics.pitchRangeSemitones} st`
                    : '—'}
                </div>
              </div>
              <div className="p-3.5">
                <span className="text-[11px] text-[#9CA3AF]">Pauses (&ge;0.35s)</span>
                <div className="mt-0.5 font-mono-tabular text-lg font-semibold text-[#FACC15]">
                  {acoustics.pauseCount}
                </div>
              </div>
              <div className="p-3.5">
                <span className="text-[11px] text-[#9CA3AF]">Silence Ratio</span>
                <div className="mt-0.5 font-mono-tabular text-lg font-semibold text-[#F5F5F4]">
                  {acoustics.pauseRatioPct}%
                </div>
              </div>
            </div>
          )}

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
          )}

          {/* Scrubber & Transport */}
          <div className="mt-6 space-y-4">
            <input
              type="range"
              min={0}
              max={duration || session.durationSeconds || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Audio playback position"
              className="w-full accent-[#FACC15] cursor-pointer"
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!audioUrl}
                  onClick={togglePlay}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5F5F4] hover:bg-white disabled:opacity-40 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause Audio' : 'Play Audio'}</span>
                </button>

                <button
                  type="button"
                  disabled={!audioUrl}
                  onClick={() => seekTo(Math.max(0, currentTime - 10))}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#22262E] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-10s</span>
                </button>

                <span className="font-mono-tabular text-sm text-[#D1D5DB]">
                  {formatClock(currentTime)} / {formatClock(duration || session.durationSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
                {[1, 1.25, 1.5].map((rate) => (
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
        </div>

        {/* Timestamped Audio Notes Log */}
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <h3 className="text-sm font-semibold text-[#F5F5F4] mb-4">
            Timestamped Vocal Notes ({listenNotes.length})
          </h3>

          <form onSubmit={handleSubmitNote} className="flex flex-wrap sm:flex-nowrap gap-2 mb-5">
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              aria-label="Observation category"
              className="px-3 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-xs text-[#E5E7EB] focus:border-[#FACC15] focus:outline-none"
            >
              {NOTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Note at ${formatClock(currentTime)} (e.g., rushed the transition)...`}
              className="flex-1 min-w-[180px] px-3.5 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-sm text-[#F5F5F4] placeholder-[#6B7280] focus:border-[#FACC15] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!noteText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F242E] hover:bg-[#2A303D] disabled:opacity-40 text-xs font-semibold text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log at {formatClock(currentTime)}</span>
            </button>
          </form>

          {listenNotes.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-2">
              No audio notes logged yet. Capture moments where your tone dropped, sped up, or
              sounded particularly grounded.
            </p>
          ) : (
            <ul className="divide-y divide-[#22262E]">
              {listenNotes.map((note) => (
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
                    aria-label="Delete note"
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

      {/* Right 5 cols: Vocal Audit Checklist */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            What to Listen For
          </h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Check off each acoustic dimension once you have consciously listened for it. If a new vocal choice feels weird, call it <span className="text-[#F5F5F4]">unfamiliar</span>—not fake.
          </p>
          {!audioUrl && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              No audio track is attached to this sample take. Review the checklist and notes below, or record/upload your own take to listen.
            </div>
          )}

          <div className="mt-5 divide-y divide-[#22262E]">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = Boolean(session.listenChecklist[item.key]);
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
            <span>
              {session.hasVideo
                ? 'Complete & Move to Step 04: Watch on Mute'
                : 'Complete & Move to Step 04'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
