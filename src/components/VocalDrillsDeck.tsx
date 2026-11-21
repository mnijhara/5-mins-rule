import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { formatClock } from '../lib/format';
import { analyzeAudioAcoustics, type AcousticMetrics } from '../lib/audioAnalysis';
import type { DrillEvaluation } from '../types/mirror';

type DrillId = '88-keys' | 'reliving' | 'volume-dial';

interface DrillSpec {
  id: DrillId;
  code: string;
  title: string;
  principle: string;
  instruction: string;
  samplePrompts: string[];
}

const DRILLS: DrillSpec[] = [
  {
    id: '88-keys',
    code: '01',
    title: '88-Key Melody & Authority Finish',
    principle: 'Vinh Giang · Vocal Piano',
    instruction:
      'Record the sentence twice: first in your normal baseline voice (Take A), then deliberately sweeping across high, mid, and low notes before landing the final word on a downward pitch drop (Take B).',
    samplePrompts: [
      'I did not spend three months building this just to watch it sit in a folder.',
      'Most people think confidence is a personality trait—it is actually a habit you train.',
      'When you pause for two full beats before your point, the entire room leans forward.',
    ],
  },
  {
    id: 'reliving',
    code: '02',
    title: 'Reliving vs. Reporting (Storytelling)',
    principle: 'Vinh Giang · Stage Academy',
    instruction:
      'Take a flat, reported fact below and retell it in 20–45 seconds by reliving the scene: step into the moment, speak actual character dialogue out loud, and pause before the turning point.',
    samplePrompts: [
      'Reported fact: Yesterday a teammate disagreed with my idea in a meeting and it felt tense.',
      'Reported fact: Last year I almost turned down a scary speaking invite, then decided to do it.',
      'Reported fact: Someone gave me blunt feedback on my presentation and it changed how I prepare.',
    ],
  },
  {
    id: 'volume-dial',
    code: '03',
    title: 'Volume Dial (Escape the Volume Trap)',
    principle: 'Vinh Giang · Projection + Warmth',
    instruction:
      'Project at a strong Level 7–8 volume while keeping your face relaxed (a slight natural smile acts as the remote control for warmth) so louder energy reads as passion rather than anger.',
    samplePrompts: [
      'Listen closely: the single biggest change in your career will come from how clearly you share what you already know!',
      'We do not need another complicated framework—we need one honest conversation today.',
    ],
  },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function VocalDrillsDeck() {
  const [selectedDrillId, setSelectedDrillId] = useState<DrillId>('88-keys');
  const [promptIdx, setPromptIdx] = useState(0);
  const [customPrompt, setCustomPrompt] = useState(DRILLS[0].samplePrompts[0]);

  const [takeABlob, setTakeABlob] = useState<Blob | null>(null);
  const [takeAUrl, setTakeAUrl] = useState<string | null>(null);
  const [takeAMetrics, setTakeAMetrics] = useState<AcousticMetrics | null>(null);
  const [takeADuration, setTakeADuration] = useState(0);

  const [takeBBlob, setTakeBBlob] = useState<Blob | null>(null);
  const [takeBUrl, setTakeBUrl] = useState<string | null>(null);
  const [takeBMetrics, setTakeBMetrics] = useState<AcousticMetrics | null>(null);
  const [takeBDuration, setTakeBDuration] = useState(0);

  const [recordingSlot, setRecordingSlot] = useState<'A' | 'B' | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const [liveVolumeDial, setLiveVolumeDial] = useState(0);
  const [playingSlot, setPlayingSlot] = useState<'A' | 'B' | null>(null);

  const [evaluation, setEvaluation] = useState<DrillEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const startRef = useRef<number>(0);

  const activeDrill = DRILLS.find((d) => d.id === selectedDrillId) || DRILLS[0];

  const stopMicResources = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setLiveVolumeDial(0);
  };

  useEffect(() => {
    return () => stopMicResources();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url = takeABlob ? URL.createObjectURL(takeABlob) : null;
    setTakeAUrl(url);
    if (takeABlob) {
      analyzeAudioAcoustics(takeABlob, 48).then((m) => {
        if (!cancelled) setTakeAMetrics(m);
      });
    } else {
      setTakeAMetrics(null);
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [takeABlob]);

  useEffect(() => {
    let cancelled = false;
    const url = takeBBlob ? URL.createObjectURL(takeBBlob) : null;
    setTakeBUrl(url);
    if (takeBBlob) {
      analyzeAudioAcoustics(takeBBlob, 48).then((m) => {
        if (!cancelled) setTakeBMetrics(m);
      });
    } else {
      setTakeBMetrics(null);
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [takeBBlob]);

  const handleSelectDrill = (drill: DrillSpec) => {
    stopPlayback();
    setSelectedDrillId(drill.id);
    setPromptIdx(0);
    setCustomPrompt(drill.samplePrompts[0]);
    setTakeABlob(null);
    setTakeBBlob(null);
    setTakeADuration(0);
    setTakeBDuration(0);
    setEvaluation(null);
    setError(null);
  };

  const cyclePrompt = () => {
    const nextIdx = (promptIdx + 1) % activeDrill.samplePrompts.length;
    setPromptIdx(nextIdx);
    setCustomPrompt(activeDrill.samplePrompts[nextIdx]);
  };

  const stopPlayback = () => {
    audioARef.current?.pause();
    audioBRef.current?.pause();
    setPlayingSlot(null);
  };

  const startRecording = async (slot: 'A' | 'B') => {
    stopPlayback();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Keep true dynamic loudness for Volume Dial drill!
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const timeData = new Float32Array(analyser.fftSize);

      const updateMeter = () => {
        analyser.getFloatTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
        const rms = Math.sqrt(sum / timeData.length);
        // Map RMS (~0.005 to ~0.35) to 1..10 dial scale
        const dial = Math.min(10, Math.max(0, Math.round((rms / 0.25) * 10)));
        setLiveVolumeDial(dial);
        animRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) =>
        MediaRecorder.isTypeSupported(m)
      );
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;

      recorder.start(400);
      startRef.current = Date.now();
      setRecSeconds(0);
      setRecordingSlot(slot);

      timerRef.current = window.setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - startRef.current) / 1000));
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone unavailable (${err.message}).`
          : 'Microphone access denied.'
      );
    }
  };

  const stopRecording = async () => {
    const rec = recorderRef.current;
    const slot = recordingSlot;
    if (!rec || rec.state === 'inactive' || !slot) return;

    const elapsed = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    await new Promise<void>((resolve) => {
      rec.addEventListener('stop', () => resolve(), { once: true });
      rec.stop();
    });

    const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
    stopMicResources();
    setRecordingSlot(null);
    setEvaluation(null);

    if (slot === 'A') {
      setTakeABlob(blob);
      setTakeADuration(elapsed);
    } else {
      setTakeBBlob(blob);
      setTakeBDuration(elapsed);
    }
  };

  const toggleSlotPlayback = async (slot: 'A' | 'B') => {
    const targetEl = slot === 'A' ? audioARef.current : audioBRef.current;
    const otherEl = slot === 'A' ? audioBRef.current : audioARef.current;
    if (!targetEl) return;

    if (playingSlot === slot) {
      targetEl.pause();
      setPlayingSlot(null);
    } else {
      otherEl?.pause();
      targetEl.currentTime = 0;
      await targetEl.play();
      setPlayingSlot(slot);
    }
  };

  const handleEvaluateDrill = async () => {
    const hasBoth88Takes = selectedDrillId === '88-keys' && Boolean(takeABlob && takeBBlob);
    const targetBlob = selectedDrillId === '88-keys' ? takeBBlob || takeABlob : takeABlob || takeBBlob;
    const targetMetrics =
      selectedDrillId === '88-keys' ? takeBMetrics || takeAMetrics : takeAMetrics || takeBMetrics;
    const targetDur =
      selectedDrillId === '88-keys'
        ? takeBDuration || takeADuration
        : takeADuration || takeBDuration;

    if (!targetBlob) {
      setError('Record a drill take first before requesting an AI coach check.');
      return;
    }

    setIsEvaluating(true);
    setError(null);

    try {
      const [base64, baselineBase64] = await Promise.all([
        blobToBase64(targetBlob),
        hasBoth88Takes && takeABlob ? blobToBase64(takeABlob) : Promise.resolve(undefined),
      ]);

      const res = await fetch('/api/evaluate-drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drillType: selectedDrillId,
          promptText: customPrompt,
          userAudioBase64: base64,
          userMimeType: targetBlob.type || 'audio/webm',
          baselineAudioBase64: baselineBase64,
          baselineMimeType: hasBoth88Takes && takeABlob ? takeABlob.type || 'audio/webm' : undefined,
          baselinePitchRangeSemitones: hasBoth88Takes ? takeAMetrics?.pitchRangeSemitones : undefined,
          durationSeconds: targetDur,
          pitchRangeSemitones: targetMetrics?.pitchRangeSemitones ?? 0,
          pauseCount: targetMetrics?.pauseCount ?? 0,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `Evaluation failed (${res.status})`);
      }
      setEvaluation(payload as DrillEvaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate drill.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const semitoneDelta =
    takeAMetrics &&
    takeBMetrics &&
    takeAMetrics.pitchRangeSemitones > 0 &&
    takeBMetrics.pitchRangeSemitones > 0
      ? Number(
          (takeBMetrics.pitchRangeSemitones - takeAMetrics.pitchRangeSemitones).toFixed(1)
        )
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Drill Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DRILLS.map((drill) => {
          const active = drill.id === selectedDrillId;
          return (
            <button
              key={drill.id}
              type="button"
              onClick={() => handleSelectDrill(drill)}
              className={`p-5 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'border-[#FACC15] bg-[#171A21]'
                  : 'border-[#22262E] bg-[#121417] hover:border-[#333945]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono-tabular text-[#FACC15]">{drill.code}</span>
                <span className="text-[#9CA3AF]">{drill.principle}</span>
              </div>
              <div className="font-display text-xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                {drill.title}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/35 bg-red-500/10 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: Drill Prompt & Take Recorder(s) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-[#F5F5F4]">
                Exercise Prompt
              </span>
              <button
                type="button"
                onClick={cyclePrompt}
                className="flex items-center gap-1.5 text-xs font-medium text-[#FACC15] hover:text-[#FDE047] cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Example</span>
              </button>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">
              {activeDrill.instruction}
            </p>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="w-full p-4 rounded-lg bg-[#0B0C0E] border border-[#22262E] focus:border-[#FACC15] focus:outline-none text-base text-[#F5F5F4] leading-relaxed"
            />

            {/* Live Volume Dial 1-10 */}
            <div className="mt-4 p-3.5 rounded-lg bg-[#0B0C0E] border border-[#22262E] flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">
                  Live Volume Dial (1–10)
                </span>
                <div className="font-mono-tabular text-lg font-semibold text-[#F5F5F4]">
                  {recordingSlot ? `Level ${liveVolumeDial} / 10` : 'Standby'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const level = idx + 1;
                  const lit = recordingSlot !== null && liveVolumeDial >= level;
                  return (
                    <span
                      key={level}
                      className={`w-2.5 h-5 rounded-xs transition-colors ${
                        lit
                          ? level >= 7
                            ? 'bg-[#FACC15]'
                            : 'bg-[#F5F5F4]'
                          : 'bg-[#1C2029]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recording Slots */}
          <div
            className={`grid grid-cols-1 ${
              selectedDrillId === '88-keys' ? 'sm:grid-cols-2' : ''
            } gap-4`}
          >
            {/* Slot A */}
            <div className="p-5 rounded-xl border border-[#22262E] bg-[#121417] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#F5F5F4]">
                    {selectedDrillId === '88-keys'
                      ? 'Take A · Baseline Read'
                      : 'Your Drill Take'}
                  </span>
                  <span className="font-mono-tabular text-[#9CA3AF]">
                    {recordingSlot === 'A'
                      ? formatClock(recSeconds)
                      : takeADuration > 0
                      ? formatClock(takeADuration)
                      : '—'}
                  </span>
                </div>
                {takeAMetrics && takeABlob && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono-tabular text-[#9CA3AF]">
                    <span>{takeAMetrics.pitchRangeSemitones} st span</span>
                    <span aria-hidden="true">·</span>
                    <span>{takeAMetrics.pauseCount} pauses</span>
                  </div>
                )}
              </div>

              {takeAUrl && (
                <audio
                  ref={audioARef}
                  src={takeAUrl}
                  onEnded={() => setPlayingSlot(null)}
                  className="hidden"
                />
              )}

              <div className="flex items-center gap-2">
                {recordingSlot === 'A' ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FACC15] text-[#0B0C0E] text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Take A</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={recordingSlot !== null}
                    onClick={() => startRecording('A')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F4] hover:bg-white disabled:opacity-40 text-[#0B0C0E] text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{takeABlob ? 'Re-Record' : 'Record'}</span>
                  </button>
                )}

                {takeAUrl && recordingSlot !== 'A' && (
                  <button
                    type="button"
                    onClick={() => toggleSlotPlayback('A')}
                    className="px-3 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs text-[#F5F5F4] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {playingSlot === 'A' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Slot B (for 88-Keys A/B Contrast) */}
            {selectedDrillId === '88-keys' && (
              <div className="p-5 rounded-xl border border-[#FACC15]/40 bg-[#121417] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#FACC15]">
                      Take B · 88-Key Exaggerated
                    </span>
                    <span className="font-mono-tabular text-[#9CA3AF]">
                      {recordingSlot === 'B'
                        ? formatClock(recSeconds)
                        : takeBDuration > 0
                        ? formatClock(takeBDuration)
                        : '—'}
                    </span>
                  </div>
                  {takeBMetrics && takeBBlob && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-mono-tabular text-[#9CA3AF]">
                      <span className="text-[#FACC15]">
                        {takeBMetrics.pitchRangeSemitones} st span
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{takeBMetrics.pauseCount} pauses</span>
                      {semitoneDelta !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#F5F5F4]">
                            {semitoneDelta >= 0 ? `+${semitoneDelta}` : semitoneDelta} st
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {takeBUrl && (
                  <audio
                    ref={audioBRef}
                    src={takeBUrl}
                    onEnded={() => setPlayingSlot(null)}
                    className="hidden"
                  />
                )}

                <div className="flex items-center gap-2">
                  {recordingSlot === 'B' ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FACC15] text-[#0B0C0E] text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Take B</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={recordingSlot !== null}
                      onClick={() => startRecording('B')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-40 text-[#0B0C0E] text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{takeBBlob ? 'Re-Record B' : 'Record Take B'}</span>
                    </button>
                  )}

                  {takeBUrl && recordingSlot !== 'B' && (
                    <button
                      type="button"
                      onClick={() => toggleSlotPlayback('B')}
                      className="px-3 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs text-[#F5F5F4] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {playingSlot === 'B' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: AI Drill Coach Evaluation */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-xl border border-[#FACC15]/40 bg-[#121417] flex flex-col gap-5">
            <div>
              <span className="font-mono-tabular text-xs text-[#FACC15] uppercase tracking-wider">
                Instant Rep Coaching
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                Vinh Giang Drill Check
              </h2>
              <p className="mt-1 text-xs text-[#9CA3AF] leading-relaxed">
                Get immediate feedback on whether your take hit the target vocal or
                storytelling shift before running your next rep.
              </p>
            </div>

            <button
              type="button"
              disabled={isEvaluating || (!takeABlob && !takeBBlob) || recordingSlot !== null}
              onClick={handleEvaluateDrill}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-40 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isEvaluating && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEvaluating ? 'Auditing Take...' : 'Evaluate My Drill Take'}</span>
            </button>

            {evaluation && (
              <div className="space-y-4 pt-4 border-t border-[#22262E] text-xs leading-relaxed">
                <div>
                  <span className="font-semibold text-[#F5F5F4] uppercase tracking-wider">
                    What Landed
                  </span>
                  <p className="mt-1 text-[#D1D5DB]">{evaluation.whatWorked}</p>
                </div>

                <div>
                  <span className="font-semibold text-[#F5F5F4] uppercase tracking-wider">
                    Missed Opportunity
                  </span>
                  <p className="mt-1 text-[#9CA3AF]">{evaluation.missedOpportunity}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B0C0E] border border-[#FACC15]/30">
                  <span className="font-semibold text-[#FACC15] uppercase tracking-wider">
                    Next 15-Second Rep Cue
                  </span>
                  <p className="mt-1 text-[#F5F5F4]">{evaluation.nextRepCue}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
