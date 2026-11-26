import { useEffect, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  Square,
  Upload,
  Shuffle,
  FlipHorizontal2,
  AlertCircle,
} from 'lucide-react';
import { CONVERSATION_SPARKS, formatClock } from '../lib/format';
import type { MirrorSession, SessionMediaBlobs } from '../types/mirror';

interface StoryBankPromptItem {
  id: string;
  title: string;
  spark: string;
  point: string;
}

function loadStoryBankPrompts(): StoryBankPromptItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('five_minute_mirror_story_bank_v1');
    return raw ? (JSON.parse(raw) as StoryBankPromptItem[]) : [];
  } catch {
    return [];
  }
}

interface RecordStageProps {
  onSessionCreated: (session: MirrorSession, media: SessionMediaBlobs) => Promise<void>;
}

const TARGET_SECONDS = 300; // 5:00
const MAX_UPLOAD_BYTES = 45 * 1024 * 1024; // 45 MB

function inferMimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}

function pickSupportedMime(candidates: string[]): string {
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function RecordStage({ onSessionCreated }: RecordStageProps) {
  const [storyPrompts] = useState<StoryBankPromptItem[]>(() => loadStoryBankPrompts());
  const [promptSource, setPromptSource] = useState<'spark' | 'story'>('spark');
  const [sparkIndex, setSparkIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [cameraMode, setCameraMode] = useState<'video' | 'audio' | 'upload'>('video');
  const [mirrored, setMirrored] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTracksAndMeter = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
    setAudioLevel(0);
  };

  const initDevices = async (mode: 'video' | 'audio') => {
    stopTracksAndMeter();
    setPermissionError(null);

    try {
      const constraints: MediaStreamConstraints =
        mode === 'video'
          ? {
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          : {
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (mode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Set up real Web Audio level meter
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 110) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      setStreamReady(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera or microphone permission was denied.';
      if (mode === 'video') {
        setPermissionError(
          `Camera unavailable (${msg}). Switch to Mic-Only mode or upload a pre-recorded clip.`
        );
      } else {
        setPermissionError(
          `Microphone unavailable (${msg}). Allow microphone access or upload an existing recording.`
        );
      }
    }
  };

  useEffect(() => {
    if (cameraMode === 'upload') {
      stopTracksAndMeter();
      setPermissionError(null);
    } else {
      initDevices(cameraMode);
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      stopTracksAndMeter();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode]);

  const finalizeRecording = async () => {
    setIsSaving(true);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    const waitForStop = (rec: MediaRecorder | null) =>
      new Promise<void>((resolve) => {
        if (!rec || rec.state === 'inactive') {
          resolve();
          return;
        }
        rec.addEventListener('stop', () => resolve(), { once: true });
        rec.stop();
      });

    await Promise.all([
      waitForStop(videoRecorderRef.current),
      waitForStop(audioRecorderRef.current),
    ]);

    const audioMime = audioRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: audioMime });
    const hasVideo = cameraMode === 'video' && videoChunksRef.current.length > 0;
    const videoMime = videoRecorderRef.current?.mimeType || 'video/webm';
    const videoBlob = hasVideo
      ? new Blob(videoChunksRef.current, { type: videoMime })
      : undefined;

    const now = Date.now();
    const sessionId = `take_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const sparkText = activePrompt;
    const title =
      customTitle.trim() ||
      `First Take · ${new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(now)}`;

    const session: MirrorSession = {
      id: sessionId,
      title,
      prompt: sparkText,
      createdAt: now,
      unlockAt: now + 24 * 60 * 60 * 1000,
      bypassWait: false,
      durationSeconds: duration,
      hasVideo,
      videoMimeType: hasVideo ? videoMime : undefined,
      audioMimeType: audioMime,
      currentStep: 2,
      completedSteps: [1],
      listenChecklist: {
        vocalVariety: false,
        pacingAndPauses: false,
        fillerAwareness: false,
        sentenceEndings: false,
        volumeAndProjection: false,
        tonalityAndEmotion: false,
      },
      watchChecklist: {
        handGestures: false,
        facialCongruence: false,
        postureAndStance: false,
        eyeLineStability: false,
      },
      notes: [],
    };

    await onSessionCreated(session, {
      sessionId,
      audioBlob,
      videoBlob,
    });
    setIsSaving(false);
    setIsRecording(false);
  };

  const handleStartRecording = () => {
    if (!streamRef.current || isRecording) return;
    setPermissionError(null);
    videoChunksRef.current = [];
    audioChunksRef.current = [];

    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    const audioMime = pickSupportedMime(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']);
    const audioRec = new MediaRecorder(
      audioStream,
      audioMime ? { mimeType: audioMime, audioBitsPerSecond: 64000 } : undefined
    );
    audioRec.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    audioRecorderRef.current = audioRec;

    if (cameraMode === 'video' && streamRef.current.getVideoTracks().length > 0) {
      const videoMime = pickSupportedMime([
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ]);
      const videoRec = new MediaRecorder(
        streamRef.current,
        videoMime
          ? { mimeType: videoMime, videoBitsPerSecond: 750000, audioBitsPerSecond: 64000 }
          : undefined
      );
      videoRec.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      videoRecorderRef.current = videoRec;
      videoRec.start(1000);
    } else {
      videoRecorderRef.current = null;
    }

    audioRec.start(1000);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRecording(true);

    timerRef.current = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(sec);
      if (sec >= TARGET_SECONDS) {
        finalizeRecording();
      }
    }, 250);
  };

  const processUploadedFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setPermissionError(
        `File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please upload a video or audio clip under 45 MB.`
      );
      return;
    }

    const resolvedMime = file.type || inferMimeFromFilename(file.name);
    const isVideo = resolvedMime.startsWith('video/');
    const isAudio = resolvedMime.startsWith('audio/');
    if (!isVideo && !isAudio) {
      setPermissionError('Unsupported file format. Please upload a video or audio file (.mp4, .mov, .webm, .mp3, .wav, .m4a).');
      return;
    }

    setIsSaving(true);
    setPermissionError(null);

    try {
      const objectUrl = URL.createObjectURL(file);

      const detectedDuration = await new Promise<number>((resolve) => {
        const mediaEl = document.createElement(isVideo ? 'video' : 'audio');
        mediaEl.preload = 'metadata';
        mediaEl.onloadedmetadata = () => {
          const d = Number.isFinite(mediaEl.duration) ? Math.round(mediaEl.duration) : 60;
          URL.revokeObjectURL(objectUrl);
          resolve(Math.max(1, d));
        };
        mediaEl.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(60);
        };
        mediaEl.src = objectUrl;
      });

      const now = Date.now();
      const sessionId = `take_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      const session: MirrorSession = {
        id: sessionId,
        title: customTitle.trim() || cleanName || 'Uploaded Take',
        prompt: activePrompt,
        createdAt: now,
        unlockAt: now + 24 * 60 * 60 * 1000,
        bypassWait: false,
        durationSeconds: detectedDuration,
        hasVideo: isVideo,
        videoMimeType: isVideo ? resolvedMime : undefined,
        audioMimeType: resolvedMime,
        currentStep: 2,
        completedSteps: [1],
        listenChecklist: {
          vocalVariety: false,
          pacingAndPauses: false,
          fillerAwareness: false,
          sentenceEndings: false,
          volumeAndProjection: false,
          tonalityAndEmotion: false,
        },
        watchChecklist: {
          handGestures: false,
          facialCongruence: false,
          postureAndStance: false,
          eyeLineStability: false,
        },
        notes: [],
      };

      await onSessionCreated(session, {
        sessionId,
        audioBlob: file,
        videoBlob: isVideo ? file : undefined,
      });
    } catch (err) {
      setPermissionError(
        err instanceof Error ? err.message : 'Unable to process uploaded recording.'
      );
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isRecording || isSaving) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const activePrompt =
    promptSource === 'story' && storyPrompts.length > 0
      ? `Relive "${storyPrompts[storyIndex % storyPrompts.length].title}": ${
          storyPrompts[storyIndex % storyPrompts.length].spark ||
          storyPrompts[storyIndex % storyPrompts.length].point
        }`
      : CONVERSATION_SPARKS[sparkIndex];

  const remainingSeconds = Math.max(0, TARGET_SECONDS - elapsedSeconds);
  const progressPct = Math.min(100, (elapsedSeconds / TARGET_SECONDS) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 7 cols: Camera / Studio Stage */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#22262E] bg-[#121417]">
          {cameraMode === 'video' ? (
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                mirrored ? 'scale-x-[-1]' : ''
              } ${streamReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            />
          ) : cameraMode === 'audio' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full border border-[#2E3440] bg-[#171A21] flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-[#F5F5F4]" strokeWidth={1.6} />
              </div>
              <p className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                Audio-Only Studio Mode
              </p>
              <p className="mt-1.5 text-sm text-[#9CA3AF] max-w-md">
                Recording microphone audio directly. You can still run the 24-hour wait,
                listen-only review, and AI transcript audit.
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isSaving && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isSaving) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'bg-[#FACC15]/10' : 'hover:bg-[#171A21]/60'
              }`}
            >
              <div className="w-20 h-20 rounded-full border border-[#2E3440] bg-[#171A21] flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-[#FACC15]" strokeWidth={1.6} />
              </div>
              <p className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
                {isSaving ? 'Importing Clip...' : 'Upload Video / Audio File'}
              </p>
              <p className="mt-1.5 text-sm text-[#9CA3AF] max-w-md">
                Drag and drop an existing recording here, or click to browse (.mp4, .mov, .webm, .mp3, .wav, .m4a · up to 45 MB).
              </p>
            </div>
          )}

          {!streamReady && cameraMode === 'video' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#121417]">
              <VideoOff className="w-8 h-8 text-[#6B7280] mb-3" />
              <p className="text-sm text-[#D1D5DB]">
                Waiting for camera and microphone permission
              </p>
            </div>
          )}

          {/* Top-left live recording indicator (only shown when MediaRecorder is actively running) */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono-tabular text-xs font-medium text-[#F5F5F4] tracking-wider">
                REC {formatClock(elapsedSeconds)}
              </span>
            </div>
          )}

          {/* Top-right studio camera mirror toggle */}
          {cameraMode === 'video' && streamReady && (
            <button
              type="button"
              onClick={() => setMirrored((prev) => !prev)}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/70 hover:bg-black/85 text-xs font-medium text-[#E5E7EB] border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              <span>{mirrored ? 'Mirrored' : 'Unmirrored'}</span>
            </button>
          )}

          {/* Bottom audio level bar */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#1C2029]">
            <div
              className="h-full bg-[#FACC15] transition-[width] duration-75"
              style={{ width: `${isRecording ? progressPct : 0}%` }}
            />
          </div>
        </div>

        {/* Transport & Capture Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#22262E] bg-[#121417]">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">
                {isRecording ? 'Remaining' : 'Target Duration'}
              </span>
              <span className="font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
                {isRecording ? formatClock(remainingSeconds) : '05:00'}
              </span>
            </div>

            <div className="h-8 w-px bg-[#22262E]" aria-hidden="true" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">
                Mic Input
              </span>
              <div className="flex items-center gap-1 h-3">
                {Array.from({ length: 12 }).map((_, i) => {
                  const threshold = (i + 1) * 8;
                  const active = audioLevel >= threshold;
                  return (
                    <span
                      key={i}
                      className={`w-1.5 h-3 rounded-xs transition-colors duration-75 ${
                        active
                          ? i >= 10
                            ? 'bg-red-500'
                            : 'bg-[#FACC15]'
                          : 'bg-[#252A34]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isRecording && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0C0E] border border-[#22262E]">
                <button
                  type="button"
                  onClick={() => setCameraMode('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cameraMode === 'video'
                      ? 'bg-[#1F242E] text-[#F5F5F4]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Camera + Mic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode('audio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cameraMode === 'audio'
                      ? 'bg-[#1F242E] text-[#F5F5F4]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Mic Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    cameraMode === 'upload'
                      ? 'bg-[#1F242E] text-[#F5F5F4]'
                      : 'text-[#9CA3AF] hover:text-[#F5F5F4]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            )}

            {cameraMode === 'upload' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-45 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isSaving ? 'Importing...' : 'Upload Video / Audio File'}</span>
              </button>
            ) : !isRecording ? (
              <button
                type="button"
                disabled={!streamReady || isSaving}
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-45 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B0C0E]" />
                <span>Start First Take</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={finalizeRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5F5F4] hover:bg-white disabled:opacity-50 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{isSaving ? 'Saving Take...' : 'Finish & Lock Take'}</span>
              </button>
            )}
          </div>
        </div>

        {permissionError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p>{permissionError}</p>
          </div>
        )}
      </div>

      {/* Right 5 cols: Unscripted Rules & Optional Spark */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="font-mono-tabular text-xs text-[#9CA3AF] uppercase tracking-wider">
              Step 01 · Unscripted Capture
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-[#F5F5F4] text-balance">
            First Take · No Plan
          </h2>
          <p className="mt-2 text-sm text-[#9CA3AF] leading-relaxed">
            Do not write a script or outline. Hit record and speak continuously for up to
            5 minutes—even if you stumble, pause, or lose your train of thought. The goal
            is capturing your natural baseline.
          </p>

          <div className="mt-6 pt-5 border-t border-[#22262E]">
            <label
              htmlFor="take-title"
              className="block text-xs font-medium text-[#D1D5DB] mb-2"
            >
              Session Label (Optional)
            </label>
            <input
              id="take-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={isRecording}
              placeholder="e.g., Weekly Standup Practice or Storytelling Take"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-[#22262E] focus:border-[#FACC15] focus:outline-none text-sm text-[#F5F5F4] placeholder-[#6B7280] disabled:opacity-60"
            />
          </div>

          <div className="mt-5 pt-5 border-t border-[#22262E]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#D1D5DB]">
                  {promptSource === 'story' && storyPrompts.length > 0
                    ? 'Story Bank Drill'
                    : 'Conversation Spark'}
                </span>
                {storyPrompts.length > 0 && (
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() =>
                      setPromptSource((prev) => (prev === 'spark' ? 'story' : 'spark'))
                    }
                    className="rounded-md border border-[#2E3440] bg-[#171A21] px-2 py-0.5 text-[11px] text-[#9CA3AF] hover:text-[#F5F5F4] disabled:opacity-40 cursor-pointer"
                  >
                    {promptSource === 'spark'
                      ? `Use Story Bank (${storyPrompts.length})`
                      : 'Use Spark'}
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={isRecording}
                onClick={() => {
                  if (promptSource === 'story' && storyPrompts.length > 0) {
                    setStoryIndex((prev) => (prev + 1) % storyPrompts.length);
                  } else {
                    setSparkIndex((prev) => (prev + 1) % CONVERSATION_SPARKS.length);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-[#FACC15] hover:text-[#FDE047] disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle Prompt</span>
              </button>
            </div>
            <p className="p-3.5 rounded-lg bg-[#0B0C0E] border border-[#22262E] text-sm text-[#E5E7EB] leading-relaxed">
              {activePrompt}
            </p>
          </div>
        </div>

        {/* Upload alternative */}
        <div className="p-5 rounded-xl border border-[#22262E] bg-[#121417] flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F4]">
              Already recorded on your phone?
            </h3>
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              Import an .mp4, .mov, .webm, .mp3, or .wav clip up to 45 MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={isRecording || isSaving}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video / Audio File</span>
          </button>
        </div>
      </div>
    </div>
  );
}
