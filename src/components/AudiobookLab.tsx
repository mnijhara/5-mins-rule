import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  BookOpen,
  Headphones,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { formatClock, formatSessionDate } from '../lib/format';
import { analyzeAudioAcoustics, type AcousticMetrics } from '../lib/audioAnalysis';
import { VocalDrillsDeck } from './VocalDrillsDeck';
import {
  deleteAudiobookSession,
  getAllAudiobookSessions,
  getAudiobookMedia,
  saveAudiobookMedia,
  saveAudiobookSession,
} from '../lib/storage';
import type { AudiobookComparison, AudiobookSession } from '../types/mirror';

interface SamplePassage {
  id: string;
  label: string;
  title: string;
  text: string;
}

const SAMPLE_PASSAGES: SamplePassage[] = [
  {
    id: 'instrument',
    label: 'Non-Fiction',
    title: 'The Voice as an Instrument',
    text: `Most people go through their entire lives speaking on only two or three keys of an eighty-eight-key piano. They rush through the moments that deserve silence, raise their pitch at the end of sentences they actually believe, and confuse shouting with authority. Yet the moment you pause for two full beats before your most important thought, the room leans forward. Your voice is not a fixed trait you were born with. It is an instrument waiting for deliberate practice.`,
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    title: 'The Quiet Train Station',
    text: `At six in the morning, the platform was nearly empty—just cold iron, drifting steam, and an old man folding a newspaper with unhurried precision. I had rehearsed my apology ten different ways on the walk over, every word sharp and defensive. Then he looked up, smiled as if we had all the time in the world, and asked a single question I hadn't prepared for. For the first time all week, I stopped performing and simply told the truth.`,
  },
  {
    id: 'dialogue',
    label: 'Dialogue & Contrast',
    title: 'Before We Speak',
    text: `"Are you listening to understand me," she asked quietly, "or are you just waiting for your turn to fix this?" I opened my mouth to explain why the deadline had slipped, why the numbers looked worse than they were—and then I stopped. Notice how hard it is to stay silent when your instinct is to defend yourself. That two-second gap between impulse and answer is where real connection begins.`,
  },
  {
    id: 'custom',
    label: 'Custom Book Page',
    title: 'Your Own Book Excerpt',
    text: '',
  },
];

const NARRATOR_VOICES = [
  { id: 'Charon', label: 'Charon · Deep & Grounded' },
  { id: 'Kore', label: 'Kore · Warm & Clear' },
  { id: 'Fenrir', label: 'Fenrir · Commanding' },
  { id: 'Puck', label: 'Puck · Expressive' },
  { id: 'Zephyr', label: 'Zephyr · Conversational' },
];

const NARRATOR_STYLES = [
  {
    id: 'warm-storyteller',
    label: 'Warm Audiobook Narrator',
    prompt:
      'Warm, expressive audiobook narrator with deliberate pauses at punctuation, rich pitch melody, and confident downward sentence endings',
  },
  {
    id: 'reflective-author',
    label: 'Reflective Non-Fiction Author',
    prompt:
      'Thoughtful, calm author reading their own memoir, slowing down on key phrases and leaving breathing room between ideas',
  },
  {
    id: 'dramatic-fiction',
    label: 'Dramatic Fiction Reader',
    prompt:
      'Dynamic literary narrator using clear tonal contrast between narration and dialogue, vivid emotional texture, and dramatic pauses',
  },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

async function detectAudioDuration(blob: Blob): Promise<number> {
  const metaDuration = await new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
  if (metaDuration !== null) return Math.max(1, metaDuration);

  try {
    const buf = await blob.arrayBuffer();
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(buf);
    await ctx.close();
    return Math.max(1, Math.round(decoded.duration));
  } catch {
    return 15;
  }
}

export function AudiobookLab() {
  const [sessions, setSessions] = useState<AudiobookSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_PASSAGES[0].id);
  const [title, setTitle] = useState<string>(SAMPLE_PASSAGES[0].title);
  const [passageText, setPassageText] = useState<string>(SAMPLE_PASSAGES[0].text);
  const [voiceName, setVoiceName] = useState<string>(NARRATOR_VOICES[0].id);
  const [styleId, setStyleId] = useState<string>(NARRATOR_STYLES[0].id);
  const [refMode, setRefMode] = useState<'ai' | 'upload'>('ai');

  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  const [userUrl, setUserUrl] = useState<string | null>(null);
  const [userDuration, setUserDuration] = useState<number>(0);
  const [userAcoustics, setUserAcoustics] = useState<AcousticMetrics | null>(null);

  const [refBlob, setRefBlob] = useState<Blob | null>(null);
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [refDuration, setRefDuration] = useState<number>(0);
  const [refAcoustics, setRefAcoustics] = useState<AcousticMetrics | null>(null);
  const [refSource, setRefSource] = useState<'ai-narrator' | 'uploaded-clip'>('ai-narrator');

  const [comparison, setComparison] = useState<AudiobookComparison | undefined>(undefined);

  // Mic Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  // A/B Playback State
  const [labMode, setLabMode] = useState<'audiobook' | 'drills'>('audiobook');
  const [activeTrack, setActiveTrack] = useState<'user' | 'ref'>('user');
  const [visualMode, setVisualMode] = useState<'amplitude' | 'pitch'>('amplitude');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Async Actions
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recAnimRef = useRef<number | null>(null);
  const recCtxRef = useRef<AudioContext | null>(null);
  const recStartRef = useRef<number>(0);
  const refUploadInputRef = useRef<HTMLInputElement | null>(null);
  const userUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved audiobook sessions on mount
  useEffect(() => {
    (async () => {
      const saved = await getAllAudiobookSessions();
      setSessions(saved);
      if (saved.length > 0) {
        await loadSessionIntoWorkspace(saved[0]);
      }
    })();
    return () => {
      stopRecResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manage object URLs & acoustic DSP cleanly
  useEffect(() => {
    let cancelled = false;
    const nextUrl = userBlob ? URL.createObjectURL(userBlob) : null;
    setUserUrl(nextUrl);
    if (userBlob) {
      analyzeAudioAcoustics(userBlob).then((metrics) => {
        if (!cancelled) setUserAcoustics(metrics);
      });
    } else {
      setUserAcoustics(null);
    }
    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [userBlob]);

  useEffect(() => {
    let cancelled = false;
    const nextUrl = refBlob ? URL.createObjectURL(refBlob) : null;
    setRefUrl(nextUrl);
    if (refBlob) {
      analyzeAudioAcoustics(refBlob).then((metrics) => {
        if (!cancelled) setRefAcoustics(metrics);
      });
    } else {
      setRefAcoustics(null);
    }
    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [refBlob]);

  // Sync audio playback time listeners
  useEffect(() => {
    const el = activeTrack === 'user' ? userAudioRef.current : refAudioRef.current;
    if (!el) return;

    const onTime = () => setPlaybackTime(el.currentTime);
    const onEnded = () => setIsPlaying(false);

    el.playbackRate = playbackRate;
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [activeTrack, userUrl, refUrl, playbackRate]);

  const stopRecResources = () => {
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (recAnimRef.current !== null) {
      cancelAnimationFrame(recAnimRef.current);
      recAnimRef.current = null;
    }
    if (recCtxRef.current) {
      recCtxRef.current.close().catch(() => {});
      recCtxRef.current = null;
    }
    if (recStreamRef.current) {
      recStreamRef.current.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
    }
    setMicLevel(0);
  };

  const loadSessionIntoWorkspace = async (session: AudiobookSession) => {
    stopPlayback();
    setActiveId(session.id);
    setTitle(session.title);
    setPassageText(session.passageText);
    setVoiceName(session.voiceName);
    const matchingSample = SAMPLE_PASSAGES.find((p) => p.text === session.passageText);
    setSelectedSampleId(matchingSample ? matchingSample.id : 'custom');
    setUserDuration(session.userDurationSeconds);
    setRefDuration(session.refDurationSeconds);
    setRefSource(session.referenceSource);
    setComparison(session.comparison);

    const media = await getAudiobookMedia(session.id);
    setUserBlob(media?.userAudioBlob ?? null);
    setRefBlob(media?.refAudioBlob ?? null);
  };

  const persistCurrentState = async (overrides?: {
    id?: string;
    nextUserBlob?: Blob | null;
    nextRefBlob?: Blob | null;
    nextUserDuration?: number;
    nextRefDuration?: number;
    nextRefSource?: 'ai-narrator' | 'uploaded-clip';
    nextComparison?: AudiobookComparison;
  }) => {
    const id = overrides?.id ?? activeId ?? `ab_${Date.now()}`;
    const uBlob = overrides?.nextUserBlob !== undefined ? overrides.nextUserBlob : userBlob;
    const rBlob = overrides?.nextRefBlob !== undefined ? overrides.nextRefBlob : refBlob;
    const uDur = overrides?.nextUserDuration ?? userDuration;
    const rDur = overrides?.nextRefDuration ?? refDuration;
    const rSrc = overrides?.nextRefSource ?? refSource;
    const comp =
      overrides && 'nextComparison' in overrides ? overrides.nextComparison : comparison;

    const styleObj = NARRATOR_STYLES.find((s) => s.id === styleId) || NARRATOR_STYLES[0];
    const session: AudiobookSession = {
      id,
      title: title.trim() || 'Untitled Passage',
      passageText,
      voiceName,
      styleLabel: styleObj.label,
      referenceSource: rSrc,
      createdAt:
        sessions.find((s) => s.id === id)?.createdAt ?? Date.now(),
      userDurationSeconds: uDur,
      refDurationSeconds: rDur,
      comparison: comp,
    };

    await saveAudiobookSession(session);
    await saveAudiobookMedia({
      sessionId: id,
      userAudioBlob: uBlob ?? undefined,
      refAudioBlob: rBlob ?? undefined,
    });

    setActiveId(id);
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === id);
      const next = exists
        ? prev.map((s) => (s.id === id ? session : s))
        : [session, ...prev];
      return next.sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const handleSelectSample = (sample: SamplePassage) => {
    stopPlayback();
    setActiveId(null);
    setSelectedSampleId(sample.id);
    setTitle(sample.title);
    setPassageText(sample.text);
    setUserBlob(null);
    setRefBlob(null);
    setUserDuration(0);
    setRefDuration(0);
    setComparison(undefined);
    setError(null);
  };

  const handleStartNewPassage = () => {
    const custom = SAMPLE_PASSAGES[SAMPLE_PASSAGES.length - 1];
    handleSelectSample(custom);
  };

  const handleStartMicRecording = async () => {
    stopPlayback();
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      recStreamRef.current = stream;

      const ctx = new AudioContext();
      recCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setMicLevel(Math.min(100, Math.round((sum / data.length / 100) * 100)));
        recAnimRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const mimeCandidate = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (m) => MediaRecorder.isTypeSupported(m)
      );
      const recorder = new MediaRecorder(
        stream,
        mimeCandidate ? { mimeType: mimeCandidate, audioBitsPerSecond: 64000 } : undefined
      );
      recChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;

      recorder.start(500);
      recStartRef.current = Date.now();
      setRecSeconds(0);
      setIsRecording(true);

      recTimerRef.current = window.setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - recStartRef.current) / 1000));
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone unavailable (${err.message}). You can also upload a reading clip.`
          : 'Microphone permission denied.'
      );
    }
  };

  const handleStopMicRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    const elapsed = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });

    const blob = new Blob(recChunksRef.current, {
      type: recorder.mimeType || 'audio/webm',
    });
    stopRecResources();
    setIsRecording(false);
    setUserBlob(blob);
    setUserDuration(elapsed);
    setComparison(undefined);
    await persistCurrentState({
      nextUserBlob: blob,
      nextUserDuration: elapsed,
      nextComparison: undefined,
    });
  };

  const handleUserClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const dur = await detectAudioDuration(file);
    setUserBlob(file);
    setUserDuration(dur);
    setComparison(undefined);
    await persistCurrentState({
      nextUserBlob: file,
      nextUserDuration: dur,
      nextComparison: undefined,
    });
    if (userUploadInputRef.current) userUploadInputRef.current.value = '';
  };

  const handleRefClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const dur = await detectAudioDuration(file);
    setRefBlob(file);
    setRefDuration(dur);
    setRefSource('uploaded-clip');
    setComparison(undefined);
    await persistCurrentState({
      nextRefBlob: file,
      nextRefDuration: dur,
      nextRefSource: 'uploaded-clip',
      nextComparison: undefined,
    });
    if (refUploadInputRef.current) refUploadInputRef.current.value = '';
  };

  const handleGenerateAudiobookNarration = async () => {
    if (!passageText.trim()) {
      setError('Paste or select a book passage first before generating an audiobook narration.');
      return;
    }

    setIsGeneratingRef(true);
    setError(null);
    const styleObj = NARRATOR_STYLES.find((s) => s.id === styleId) || NARRATOR_STYLES[0];

    try {
      const response = await fetch('/api/narrate-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageText: passageText.trim(),
          voiceName,
          styleDescription: styleObj.prompt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Narration failed (${response.status})`);
      }

      const wavBlob = base64ToBlob(payload.audioBase64, payload.mimeType || 'audio/wav');
      const dur = await detectAudioDuration(wavBlob);
      setRefBlob(wavBlob);
      setRefDuration(dur);
      setRefSource('ai-narrator');
      setComparison(undefined);

      await persistCurrentState({
        nextRefBlob: wavBlob,
        nextRefDuration: dur,
        nextRefSource: 'ai-narrator',
        nextComparison: undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not generate audiobook narration.'
      );
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const handleRunComparison = async () => {
    if (!userBlob || !refBlob) {
      setError('Record or upload your reading AND generate/upload the audiobook reference track first.');
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const [userBase64, refBase64] = await Promise.all([
        blobToBase64(userBlob),
        blobToBase64(refBlob),
      ]);

      const response = await fetch('/api/compare-audiobook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageText,
          userAudioBase64: userBase64,
          userMimeType: userBlob.type || 'audio/webm',
          refAudioBase64: refBase64,
          refMimeType: refBlob.type || 'audio/wav',
          userDurationSeconds: userDuration,
          refDurationSeconds: refDuration,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Comparison failed (${response.status})`);
      }

      const nextComparison = payload as AudiobookComparison;
      setComparison(nextComparison);
      await persistCurrentState({ nextComparison });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to compare audio tracks.'
      );
    } finally {
      setIsComparing(false);
    }
  };

  const stopPlayback = () => {
    userAudioRef.current?.pause();
    refAudioRef.current?.pause();
    setIsPlaying(false);
  };

  const switchAbTrack = async (nextTrack: 'user' | 'ref') => {
    if (nextTrack === activeTrack) return;
    const currentEl = activeTrack === 'user' ? userAudioRef.current : refAudioRef.current;
    const targetEl = nextTrack === 'user' ? userAudioRef.current : refAudioRef.current;
    const wasPlaying = isPlaying;

    const currentDur = activeTrack === 'user' ? userDuration : refDuration;
    const targetDur = nextTrack === 'user' ? userDuration : refDuration;
    const ratio = currentDur > 0 ? playbackTime / currentDur : 0;
    const mappedTime = targetDur > 0 ? ratio * targetDur : 0;

    currentEl?.pause();
    setActiveTrack(nextTrack);

    if (targetEl) {
      targetEl.currentTime = mappedTime;
      targetEl.playbackRate = playbackRate;
      setPlaybackTime(mappedTime);
      if (wasPlaying) {
        await targetEl.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
      setPlaybackTime(0);
    }
  };

  const togglePlay = async () => {
    const el = activeTrack === 'user' ? userAudioRef.current : refAudioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.playbackRate = playbackRate;
      await el.play();
      setIsPlaying(true);
    }
  };

  const seekTrack = (seconds: number) => {
    const el = activeTrack === 'user' ? userAudioRef.current : refAudioRef.current;
    const maxDur = activeTrack === 'user' ? userDuration : refDuration;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(maxDur || 1, seconds));
    setPlaybackTime(el.currentTime);
  };

  const jumpToTrackRatio = async (target: 'user' | 'ref', ratio: number) => {
    const targetUrl = target === 'user' ? userUrl : refUrl;
    if (!targetUrl) return;
    const targetDur = target === 'user' ? userDuration : refDuration;
    const targetSeconds = Math.max(0, Math.min(targetDur, ratio * targetDur));

    if (activeTrack !== target) {
      const currentEl = activeTrack === 'user' ? userAudioRef.current : refAudioRef.current;
      currentEl?.pause();
      setActiveTrack(target);
    }
    const targetEl = target === 'user' ? userAudioRef.current : refAudioRef.current;
    if (targetEl) {
      targetEl.currentTime = targetSeconds;
      targetEl.playbackRate = playbackRate;
      setPlaybackTime(targetSeconds);
      await targetEl.play();
      setIsPlaying(true);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    await deleteAudiobookSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      handleStartNewPassage();
    }
  };

  const activeMaxDuration = activeTrack === 'user' ? userDuration : refDuration;
  const wordCount = passageText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Header Bar */}
      <div className="pb-6 border-b border-[#22262E] flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-xs text-[#FACC15] uppercase tracking-wider">
            Vocal Contrast Practice · Read Aloud vs. Audiobook
          </span>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            Audiobook Shadow &amp; Compare Lab
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF] max-w-2xl">
            Read a book passage aloud, generate a studio audiobook narration (or upload an
            audiobook clip), and compare Rate, Pauses, Pitch Melody, and Tonality side-by-side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121417] border border-[#22262E]">
            <button
              type="button"
              onClick={() => setLabMode('audiobook')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                labMode === 'audiobook'
                  ? 'bg-[#1F242E] text-[#F5F5F4]'
                  : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Book vs. Audiobook
            </button>
            <button
              type="button"
              onClick={() => setLabMode('drills')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                labMode === 'drills'
                  ? 'bg-[#1F242E] text-[#FACC15]'
                  : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Vinh&apos;s Vocal Drills
            </button>
          </div>

          {labMode === 'audiobook' && (
            <button
              type="button"
              onClick={handleStartNewPassage}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Passage</span>
            </button>
          )}
        </div>
      </div>

      {labMode === 'drills' ? (
        <VocalDrillsDeck />
      ) : (
        <>

      {/* Saved Practice Sessions Strip */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-xs text-[#9CA3AF] whitespace-nowrap shrink-0">
            Recent Reads:
          </span>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap shrink-0 ${
                s.id === activeId
                  ? 'border-[#FACC15]/60 bg-[#171A21] text-[#F5F5F4]'
                  : 'border-[#22262E] bg-[#121417] text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              <button
                type="button"
                onClick={() => loadSessionIntoWorkspace(s)}
                className="cursor-pointer font-medium"
              >
                {s.title} · {formatSessionDate(s.createdAt).split(',')[0]}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSaved(s.id)}
                aria-label={`Delete ${s.title}`}
                className="text-[#6B7280] hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/35 bg-red-500/10 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: Book Passage + Read Aloud Recorder + A/B Comparison Player */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Book Passage Card */}
          <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FACC15]" />
                <span className="text-sm font-semibold text-[#F5F5F4]">
                  01. Choose or Paste a Book Passage
                </span>
              </div>
              <span className="font-mono-tabular text-xs text-[#9CA3AF]">
                {wordCount} words
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E] mb-4">
              {SAMPLE_PASSAGES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSampleId === sample.id
                      ? 'bg-[#1F242E] text-[#FACC15]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title or chapter name..."
              className="w-full mb-3 px-3.5 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] focus:border-[#FACC15] focus:outline-none text-sm font-medium text-[#F5F5F4] placeholder-[#6B7280]"
            />

            <textarea
              value={passageText}
              onChange={(e) => {
                setPassageText(e.target.value);
                setSelectedSampleId('custom');
              }}
              rows={6}
              placeholder="Paste a paragraph or page from any book you want to practice reading aloud..."
              className="w-full p-4 rounded-lg bg-[#0B0C0E] border border-[#22262E] focus:border-[#FACC15] focus:outline-none text-base text-[#F5F5F4] placeholder-[#6B7280] leading-relaxed"
            />
          </div>

          {/* Step 2: Record Yourself Reading Aloud */}
          <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F4]">
                  02. Record Your Reading Aloud
                </h2>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  Read the passage above naturally—experiment with pauses, pitch, and emphasis.
                </p>
              </div>
              {userDuration > 0 && !isRecording && (
                <span className="font-mono-tabular text-xs text-[#D1D5DB]">
                  Saved Take · {formatClock(userDuration)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">
                    {isRecording ? 'Recording' : 'Take Length'}
                  </span>
                  <span className="font-mono-tabular text-xl font-semibold text-[#F5F5F4]">
                    {isRecording ? formatClock(recSeconds) : formatClock(userDuration)}
                  </span>
                </div>

                {isRecording && (
                  <div className="flex items-center gap-1 h-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-3 rounded-xs ${
                          micLevel >= (i + 1) * 10 ? 'bg-[#FACC15]' : 'bg-[#252A34]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  ref={userUploadInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleUserClipUpload}
                  className="hidden"
                />
                {!isRecording && (
                  <button
                    type="button"
                    onClick={() => userUploadInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#D1D5DB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Take</span>
                  </button>
                )}

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartMicRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F4] hover:bg-white text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{userBlob ? 'Re-Record Reading' : 'Record Reading'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopMicRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop &amp; Save</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Side-by-Side A/B Listen & Waveform Deck */}
          <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#FACC15]" />
                <h2 className="text-sm font-semibold text-[#F5F5F4]">
                  03. A/B Listen &amp; Waveform Contrast
                </h2>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
                <button
                  type="button"
                  disabled={!userUrl}
                  onClick={() => switchAbTrack('user')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-35 ${
                    activeTrack === 'user'
                      ? 'bg-[#1F242E] text-[#F5F5F4]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  A · Your Reading
                </button>
                <button
                  type="button"
                  disabled={!refUrl}
                  onClick={() => switchAbTrack('ref')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-35 ${
                    activeTrack === 'ref'
                      ? 'bg-[#1F242E] text-[#FACC15]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  B · Audiobook
                </button>
              </div>
            </div>

            {userUrl && <audio ref={userAudioRef} src={userUrl} preload="metadata" className="hidden" />}
            {refUrl && <audio ref={refAudioRef} src={refUrl} preload="metadata" className="hidden" />}

            {/* Dual Visual Amplitude / Pitch Envelopes */}
            <div className="space-y-3 p-4 rounded-lg bg-[#0B0C0E] border border-[#22262E] mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1C2029]">
                <span className="text-[11px] text-[#9CA3AF]">
                  Click anywhere on a track waveform to jump directly to that moment
                </span>
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#121417] border border-[#22262E]">
                  <button
                    type="button"
                    onClick={() => setVisualMode('amplitude')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      visualMode === 'amplitude'
                        ? 'bg-[#1F242E] text-[#F5F5F4]'
                        : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                    }`}
                  >
                    Amplitude &amp; Pauses
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisualMode('pitch')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      visualMode === 'pitch'
                        ? 'bg-[#1F242E] text-[#FACC15]'
                        : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                    }`}
                  >
                    88-Key Pitch Span
                  </button>
                </div>
              </div>

              {/* Track A */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1.5">
                  <span className="text-[#E5E7EB]">Track A · Your Reading</span>
                  <div className="flex items-center gap-2 font-mono-tabular text-[#9CA3AF]">
                    {userAcoustics && userBlob && (
                      <>
                        <span>
                          {userAcoustics.pitchRangeSemitones > 0
                            ? `${userAcoustics.pitchRangeSemitones} st`
                            : '— st'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{userAcoustics.pauseCount} pauses</span>
                        <span aria-hidden="true">·</span>
                        <span>{userAcoustics.pauseRatioPct}% silence</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{userDuration > 0 ? formatClock(userDuration) : 'Not recorded'}</span>
                  </div>
                </div>

                {visualMode === 'amplitude' ? (
                  <div className="h-10 flex items-center gap-[2px]">
                    {(userAcoustics?.amplitudeEnvelope ??
                      Array.from({ length: 72 }, () => 0.08)
                    ).map((amp, i) => {
                      const pct = (i / 72) * 100;
                      const played =
                        activeTrack === 'user' &&
                        activeMaxDuration > 0 &&
                        pct <= (playbackTime / activeMaxDuration) * 100;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!userBlob}
                          onClick={() => jumpToTrackRatio('user', i / 72)}
                          aria-label={`Jump Track A to ${Math.round((i / 72) * 100)}%`}
                          className={`flex-1 rounded-xs transition-colors ${
                            !userBlob
                              ? 'bg-[#1C2029] cursor-default'
                              : played
                              ? 'bg-[#F5F5F4] cursor-pointer'
                              : 'bg-[#4B5563] hover:bg-[#9CA3AF] cursor-pointer'
                          }`}
                          style={{ height: `${Math.round(amp * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-10 flex items-end gap-[2px]">
                    {(userAcoustics?.pitchContour ??
                      Array.from({ length: 72 }, () => null)
                    ).map((hz, i) => {
                      const pct = (i / 72) * 100;
                      const played =
                        activeTrack === 'user' &&
                        activeMaxDuration > 0 &&
                        pct <= (playbackTime / activeMaxDuration) * 100;
                      const norm = hz ? Math.min(1, Math.max(0.12, (hz - 75) / 240)) : 0.06;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!userBlob}
                          onClick={() => jumpToTrackRatio('user', i / 72)}
                          aria-label={`Jump Track A to ${Math.round((i / 72) * 100)}%`}
                          className={`flex-1 rounded-xs transition-colors ${
                            !hz
                              ? 'bg-[#1C2029]'
                              : played
                              ? 'bg-[#F5F5F4]'
                              : 'bg-[#6B7280] hover:bg-[#D1D5DB]'
                          } ${userBlob ? 'cursor-pointer' : 'cursor-default'}`}
                          style={{ height: `${Math.round(norm * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Track B */}
              <div className="pt-2 border-t border-[#1C2029]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mb-1.5">
                  <span className="text-[#FACC15]">Track B · Audiobook Reference</span>
                  <div className="flex items-center gap-2 font-mono-tabular text-[#9CA3AF]">
                    {refAcoustics && refBlob && (
                      <>
                        <span className="text-[#FACC15]">
                          {refAcoustics.pitchRangeSemitones > 0
                            ? `${refAcoustics.pitchRangeSemitones} st`
                            : '— st'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{refAcoustics.pauseCount} pauses</span>
                        <span aria-hidden="true">·</span>
                        <span>{refAcoustics.pauseRatioPct}% silence</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{refDuration > 0 ? formatClock(refDuration) : 'Not generated'}</span>
                  </div>
                </div>

                {visualMode === 'amplitude' ? (
                  <div className="h-10 flex items-center gap-[2px]">
                    {(refAcoustics?.amplitudeEnvelope ??
                      Array.from({ length: 72 }, () => 0.08)
                    ).map((amp, i) => {
                      const pct = (i / 72) * 100;
                      const played =
                        activeTrack === 'ref' &&
                        activeMaxDuration > 0 &&
                        pct <= (playbackTime / activeMaxDuration) * 100;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!refBlob}
                          onClick={() => jumpToTrackRatio('ref', i / 72)}
                          aria-label={`Jump Track B to ${Math.round((i / 72) * 100)}%`}
                          className={`flex-1 rounded-xs transition-colors ${
                            !refBlob
                              ? 'bg-[#1C2029] cursor-default'
                              : played
                              ? 'bg-[#FACC15] cursor-pointer'
                              : 'bg-[#715D14] hover:bg-[#CA8A04] cursor-pointer'
                          }`}
                          style={{ height: `${Math.round(amp * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-10 flex items-end gap-[2px]">
                    {(refAcoustics?.pitchContour ??
                      Array.from({ length: 72 }, () => null)
                    ).map((hz, i) => {
                      const pct = (i / 72) * 100;
                      const played =
                        activeTrack === 'ref' &&
                        activeMaxDuration > 0 &&
                        pct <= (playbackTime / activeMaxDuration) * 100;
                      const norm = hz ? Math.min(1, Math.max(0.12, (hz - 75) / 240)) : 0.06;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!hz || !refBlob}
                          onClick={() => jumpToTrackRatio('ref', i / 72)}
                          aria-label={`Jump Track B to ${Math.round((i / 72) * 100)}%`}
                          className={`flex-1 rounded-xs transition-colors ${
                            !hz
                              ? 'bg-[#1C2029]'
                              : played
                              ? 'bg-[#FACC15]'
                              : 'bg-[#854D0E] hover:bg-[#EAB308]'
                          } ${refBlob ? 'cursor-pointer' : 'cursor-default'}`}
                          style={{ height: `${Math.round(norm * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="range"
                min={0}
                max={activeMaxDuration || 1}
                step={0.1}
                value={playbackTime}
                disabled={activeTrack === 'user' ? !userUrl : !refUrl}
                onChange={(e) => seekTrack(Number(e.target.value))}
                aria-label="Track playback scrubber"
                className="w-full accent-[#FACC15] cursor-pointer disabled:opacity-40"
              />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={activeTrack === 'user' ? !userUrl : !refUrl}
                    onClick={togglePlay}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F4] hover:bg-white disabled:opacity-40 text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>
                      {isPlaying
                        ? 'Pause'
                        : activeTrack === 'user'
                        ? 'Play Your Take'
                        : 'Play Audiobook'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={activeTrack === 'user' ? !userUrl : !refUrl}
                    onClick={() => seekTrack(Math.max(0, playbackTime - 5))}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#22262E] bg-[#171A21] hover:bg-[#1F242E] disabled:opacity-40 text-xs text-[#D1D5DB] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-5s</span>
                  </button>

                  <span className="font-mono-tabular text-xs text-[#9CA3AF]">
                    {formatClock(playbackTime)} / {formatClock(activeMaxDuration)}
                  </span>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
                  {[0.85, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
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
        </div>

        {/* Right 5 cols: Audiobook Reference Setup + AI Vocal Comparison */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Reference Audiobook Source */}
          <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-[#F5F5F4]">
                Audiobook Reference Track
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E] mb-4">
              <button
                type="button"
                onClick={() => setRefMode('ai')}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  refMode === 'ai'
                    ? 'bg-[#1F242E] text-[#F5F5F4]'
                    : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                }`}
              >
                AI Narrator Voice
              </button>
              <button
                type="button"
                onClick={() => setRefMode('upload')}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  refMode === 'upload'
                    ? 'bg-[#1F242E] text-[#F5F5F4]'
                    : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                }`}
              >
                Upload Audiobook Clip
              </button>
            </div>

            {refMode === 'ai' ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="narrator-voice"
                    className="block text-xs text-[#9CA3AF] mb-1.5"
                  >
                    Narrator Voice
                  </label>
                  <select
                    id="narrator-voice"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-xs text-[#F5F5F4] focus:border-[#FACC15] focus:outline-none"
                  >
                    {NARRATOR_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="narrator-style"
                    className="block text-xs text-[#9CA3AF] mb-1.5"
                  >
                    Delivery Style
                  </label>
                  <select
                    id="narrator-style"
                    value={styleId}
                    onChange={(e) => setStyleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-xs text-[#F5F5F4] focus:border-[#FACC15] focus:outline-none"
                  >
                    {NARRATOR_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingRef || !passageText.trim()}
                  onClick={handleGenerateAudiobookNarration}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] disabled:opacity-45 text-xs font-semibold text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGeneratingRef ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FACC15]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
                  )}
                  <span>
                    {isGeneratingRef
                      ? 'Generating Audiobook Track...'
                      : refBlob
                      ? 'Regenerate Audiobook Track'
                      : 'Generate Audiobook Track'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Import an excerpt from a real audiobook (.mp3, .wav, .m4a, .webm) to
                  compare your read-aloud pacing and melody directly against the narrator.
                </p>
                <input
                  ref={refUploadInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleRefClipUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => refUploadInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-semibold text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FACC15]" />
                  <span>
                    {refBlob && refSource === 'uploaded-clip'
                      ? 'Replace Audiobook Clip'
                      : 'Choose Audiobook Audio File'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* AI Vocal Contrast Audit */}
          <div className="p-6 rounded-xl border border-[#FACC15]/40 bg-[#121417] flex flex-col gap-5">
            <div>
              <span className="font-mono-tabular text-xs text-[#FACC15] uppercase tracking-wider">
                Vocal Comparison Audit
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                Compare &amp; Learn
              </h2>
              <p className="mt-1 text-xs text-[#9CA3AF] leading-relaxed">
                Audit how your reading compares to the audiobook across Vinh Giang&apos;s 5
                Vocal Foundations.
              </p>
            </div>

            <button
              type="button"
              disabled={isComparing || !userBlob || !refBlob}
              onClick={handleRunComparison}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-40 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isComparing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isComparing
                  ? 'Comparing Vocal Delivery...'
                  : comparison
                  ? 'Re-Compare Reading vs. Audiobook'
                  : 'Compare My Reading vs. Audiobook'}
              </span>
            </button>

            {comparison && (
              <div className="space-y-5 pt-2 border-t border-[#22262E]">
                {/* Pace Contrast */}
                <div className="grid grid-cols-2 divide-x divide-[#22262E] rounded-lg border border-[#22262E] bg-[#0B0C0E]">
                  <div className="p-3.5">
                    <span className="text-[11px] text-[#9CA3AF]">Your Pace</span>
                    <div className="mt-0.5 font-mono-tabular text-xl font-semibold text-[#F5F5F4]">
                      {comparison.userWpm}{' '}
                      <span className="text-xs font-normal text-[#9CA3AF]">WPM</span>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <span className="text-[11px] text-[#9CA3AF]">Audiobook</span>
                    <div className="mt-0.5 font-mono-tabular text-xl font-semibold text-[#FACC15]">
                      {comparison.audiobookWpm}{' '}
                      <span className="text-xs font-normal text-[#9CA3AF]">WPM</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#F5F5F4] uppercase tracking-wider">
                    Core Contrast
                  </h3>
                  <p className="mt-1.5 text-sm text-[#D1D5DB] leading-relaxed">
                    {comparison.overallTakeaway}
                  </p>
                </div>

                {/* 5 Vocal Pillars */}
                <div className="divide-y divide-[#22262E] border-t border-[#22262E]">
                  {comparison.dimensions.map((dim) => (
                    <div key={dim.pillar} className="py-3.5 space-y-1.5 text-xs leading-relaxed">
                      <div className="font-semibold text-[#F5F5F4]">{dim.pillar}</div>
                      <p className="text-[#9CA3AF]">
                        <span className="text-[#E5E7EB]">You:</span> {dim.yourDelivery}
                      </p>
                      <p className="text-[#9CA3AF]">
                        <span className="text-[#FACC15]">Audiobook:</span> {dim.audiobookDelivery}
                      </p>
                      <p className="text-[#D1D5DB]">
                        <span className="font-medium text-[#F5F5F4]">Shift:</span> {dim.keyShift}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Standout Moments */}
                <div className="pt-4 border-t border-[#22262E]">
                  <h3 className="text-xs font-semibold text-[#F5F5F4] uppercase tracking-wider mb-2">
                    Moments to Notice
                  </h3>
                  <ul className="space-y-2 text-xs text-[#D1D5DB] leading-relaxed">
                    {comparison.standoutMoments.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono-tabular text-[#9CA3AF]">{idx + 1}.</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3 Imitation Drills */}
                <div className="pt-4 border-t border-[#22262E]">
                  <h3 className="text-xs font-semibold text-[#FACC15] uppercase tracking-wider mb-2">
                    Try on Your Next Read-Through
                  </h3>
                  <ul className="space-y-2 text-xs text-[#E5E7EB] leading-relaxed">
                    {comparison.imitationDrills.map((drill, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono-tabular text-[#FACC15] font-semibold">
                          0{idx + 1}
                        </span>
                        <span>{drill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
