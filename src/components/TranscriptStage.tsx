import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Copy,
  Download,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatClock } from '../lib/format';
import type { MirrorSession, TranscriptAnalysis } from '../types/mirror';

interface TranscriptStageProps {
  session: MirrorSession;
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  audioUrl: string | null;
  videoUrl: string | null;
  onSaveTranscript: (analysis: TranscriptAnalysis) => Promise<void>;
  onOpenArchive?: () => void;
  onStartNewTake?: () => void;
}

const FILLER_REGEX = /\b(um+|uh+|like|you know|actually|basically|so|right|kind of|sort of)\b/gi;

function renderHighlightedText(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(FILLER_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <mark
        key={`${match.index}-${match[0]}`}
        className="bg-[#FACC15]/20 text-[#FACC15] px-1 rounded-xs font-medium"
      >
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function TranscriptStage({
  session,
  audioBlob,
  videoBlob,
  audioUrl,
  videoUrl,
  onSaveTranscript,
  onOpenArchive,
  onStartNewTake,
}: TranscriptStageProps) {
  const isSampleWithoutMedia = session.id.startsWith('sample-') && !audioBlob && !videoBlob;
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const analysis = session.transcript;
  const totalFillers = analysis
    ? analysis.fillerBreakdown.reduce((acc, item) => acc + item.count, 0)
    : 0;
  const topCrutch =
    analysis && analysis.fillerBreakdown.length > 0
      ? [...analysis.fillerBreakdown].sort((a, b) => b.count - a.count)[0]
      : null;

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onTime = () => setCurrentTime(el.currentTime);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioUrl, videoUrl]);

  const handleGenerate = async () => {
    const targetBlob = audioBlob || videoBlob;
    if (!targetBlob) {
      setError('Recording media could not be loaded from local storage.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analyze-speech?durationSeconds=${Math.max(1, session.durationSeconds)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': targetBlob.type || 'audio/webm',
          },
          body: targetBlob,
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Analysis failed (${response.status})`);
      }

      await onSaveTranscript(payload as TranscriptAnalysis);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate AI transcript. Verify GEMINI_API_KEY is configured on the server.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const seekTo = async (seconds: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      await el.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = async () => {
    const el = mediaRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      await el.play();
      setIsPlaying(true);
    }
  };

  const buildMarkdownReport = (): string => {
    if (!analysis) return '';
    const lines = [
      `# ${session.title} — The 5-Minute Mirror Report`,
      `Duration: ${formatClock(session.durationSeconds)} | Words: ${analysis.totalWords} | Pace: ${analysis.wordsPerMinute} WPM | Fillers: ${totalFillers}`,
      '',
      '## Summary',
      analysis.summary,
      '',
      ...(analysis.vocalObservations
        ? [
            '## Vocal Instrument Breakdown',
            `- Rate & Pauses: ${analysis.vocalObservations.rateAndPauses}`,
            `- Pitch & Melody: ${analysis.vocalObservations.pitchAndMelody}`,
            `- Volume & Tonality: ${analysis.vocalObservations.volumeAndTonality}`,
            ...(analysis.vocalObservations.storytellingNote
              ? [`- Reliving vs. Reporting: ${analysis.vocalObservations.storytellingNote}`]
              : []),
            '',
          ]
        : []),
      '## Strengths',
      ...analysis.strengths.map((s) => `- ${s}`),
      '',
      '## Friction Points',
      ...analysis.frictionPoints.map((f) => `- ${f}`),
      '',
      '## Drills for Next Take',
      ...analysis.nextTakeDrills.map((d, i) => `${i + 1}. ${d}`),
      '',
      '## Verbatim Transcript',
      ...analysis.segments.map(
        (seg) => `[${formatClock(seg.startSeconds)}] ${seg.text}`
      ),
    ];
    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(buildMarkdownReport());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const blob = new Blob([buildMarkdownReport()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mirror-report';
    a.href = url;
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Action Bar */}
      <div className="p-6 rounded-xl border border-[#FACC15]/40 bg-[#121417] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono-tabular text-xs text-[#FACC15] uppercase tracking-wider">
            Step 05 · Verbatim AI Audit
          </span>
          <h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            AI Transcript & Clarity Breakdown
          </h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Inspect word choice, filler habits, and structure now that you have heard and watched
            the take independently.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {analysis && (
            <>
              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#FACC15]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Markdown' : 'Copy Report'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </>
          )}

          <button
            type="button"
            disabled={isGenerating || isSampleWithoutMedia}
            title={isSampleWithoutMedia ? 'Sample take uses preloaded audit results' : undefined}
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-50 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>
              {isGenerating
                ? 'Transcribing & Auditing...'
                : analysis
                ? 'Re-Run AI Audit'
                : 'Generate AI Transcript'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/35 bg-red-500/10 text-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isGenerating && !analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
          <div className="lg:col-span-7 p-6 rounded-xl border border-[#22262E] bg-[#121417] space-y-4">
            <div className="h-5 w-48 bg-[#1F242E] rounded" />
            <div className="h-16 w-full bg-[#171A21] rounded" />
            <div className="h-16 w-full bg-[#171A21] rounded" />
            <div className="h-16 w-full bg-[#171A21] rounded" />
          </div>
          <div className="lg:col-span-5 p-6 rounded-xl border border-[#22262E] bg-[#121417] space-y-4">
            <div className="h-5 w-36 bg-[#1F242E] rounded" />
            <div className="h-24 w-full bg-[#171A21] rounded" />
            <div className="h-24 w-full bg-[#171A21] rounded" />
          </div>
        </div>
      )}

      {/* Empty state before generation */}
      {!analysis && !isGenerating && (
        <div className="p-10 rounded-xl border border-[#22262E] bg-[#121417] text-center">
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4]">
            Ready for Verbatim Transcription
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
            Click <span className="text-[#FACC15] font-medium">Generate AI Transcript</span> above
            to transcribe every word verbatim—including filler words and false starts—and sync it
            with your recording.
          </p>
        </div>
      )}

      {/* Populated Analysis */}
      {analysis && (
        <>
          {/* 4-Column Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#22262E] rounded-xl border border-[#22262E] bg-[#121417]">
            <div className="p-5">
              <span className="text-xs text-[#9CA3AF]">Spoken Words</span>
              <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
                {analysis.totalWords}
              </div>
            </div>
            <div className="p-5">
              <span className="text-xs text-[#9CA3AF]">Speaking Pace</span>
              <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4]">
                {analysis.wordsPerMinute} <span className="text-xs font-normal text-[#9CA3AF]">WPM</span>
              </div>
            </div>
            <div className="p-5">
              <span className="text-xs text-[#9CA3AF]">Filler Words</span>
              <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#FACC15]">
                {totalFillers}
              </div>
            </div>
            <div className="p-5">
              <span className="text-xs text-[#9CA3AF]">Top Crutch Word</span>
              <div className="mt-1 font-mono-tabular text-2xl font-semibold text-[#F5F5F4] truncate">
                {topCrutch ? `"${topCrutch.word}" (${topCrutch.count})` : 'None'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 cols: Synced Verbatim Transcript */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Compact Synced Player */}
              {(videoUrl || audioUrl) && (
                <div className="p-4 rounded-xl border border-[#22262E] bg-[#121417] flex flex-col gap-3">
                  {videoUrl ? (
                    <video
                      ref={mediaRef as React.RefObject<HTMLVideoElement>}
                      src={videoUrl}
                      playsInline
                      className="w-full max-h-64 rounded-lg bg-[#0B0C0E] object-contain"
                    />
                  ) : (
                    <audio
                      ref={mediaRef as React.RefObject<HTMLAudioElement>}
                      src={audioUrl || undefined}
                      className="hidden"
                    />
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F4] hover:bg-white text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Pause Synced Playback' : 'Play Synced Playback'}</span>
                    </button>
                    <span className="font-mono-tabular text-xs text-[#9CA3AF]">
                      {formatClock(currentTime)} / {formatClock(session.durationSeconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Verbatim Segments */}
              <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417]">
                <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[#22262E]">
                  <h3 className="text-sm font-semibold text-[#F5F5F4]">
                    Verbatim Transcript (Click timestamp to jump)
                  </h3>
                  <span className="text-xs text-[#9CA3AF]">
                    Filler words highlighted in yellow
                  </span>
                </div>

                <div className="divide-y divide-[#22262E]">
                  {analysis.segments.map((seg, idx) => {
                    const active =
                      currentTime >= seg.startSeconds && currentTime < seg.endSeconds;
                    return (
                      <div
                        key={idx}
                        className={`py-4 transition-colors ${
                          active ? 'bg-[#FACC15]/5 -mx-3 px-3 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => seekTo(seg.startSeconds)}
                            className="font-mono-tabular text-xs text-[#FACC15] hover:underline pt-1 shrink-0 cursor-pointer"
                          >
                            {formatClock(seg.startSeconds)}
                          </button>
                          <div className="flex-1">
                            <p className="text-sm text-[#E5E7EB] leading-relaxed">
                              {renderHighlightedText(seg.text)}
                            </p>
                            {seg.deliveryNote && (
                              <p className="mt-1.5 text-xs text-[#9CA3AF]">
                                Note: {seg.deliveryNote}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 cols: Audit & Next-Take Drills */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417] space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F5F4]">Core Message & Pace</h3>
                  <p className="mt-1.5 text-sm text-[#D1D5DB] leading-relaxed">
                    {analysis.summary}
                  </p>
                  <p className="mt-2 text-xs text-[#9CA3AF] leading-relaxed">
                    {analysis.pacingAssessment}
                  </p>
                </div>

                {analysis.vocalObservations && (
                  <div className="pt-5 border-t border-[#22262E] space-y-3">
                    <h3 className="text-sm font-semibold text-[#F5F5F4]">
                      Vocal Instrument Audit
                    </h3>
                    <div className="space-y-2.5 text-xs leading-relaxed">
                      <div>
                        <span className="font-medium text-[#E5E7EB]">Rate &amp; Pauses: </span>
                        <span className="text-[#9CA3AF]">
                          {analysis.vocalObservations.rateAndPauses}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-[#E5E7EB]">Pitch &amp; Melody: </span>
                        <span className="text-[#9CA3AF]">
                          {analysis.vocalObservations.pitchAndMelody}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-[#E5E7EB]">Volume &amp; Tonality: </span>
                        <span className="text-[#9CA3AF]">
                          {analysis.vocalObservations.volumeAndTonality}
                        </span>
                      </div>
                      {analysis.vocalObservations.storytellingNote && (
                        <div>
                          <span className="font-medium text-[#FACC15]">Reliving vs. Reporting: </span>
                          <span className="text-[#D1D5DB]">
                            {analysis.vocalObservations.storytellingNote}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysis.fillerBreakdown.length > 0 && (
                  <div className="pt-5 border-t border-[#22262E]">
                    <h3 className="text-sm font-semibold text-[#F5F5F4] mb-3">
                      Filler Frequency
                    </h3>
                    <div className="divide-y divide-[#22262E]">
                      {analysis.fillerBreakdown.map((item) => (
                        <div
                          key={item.word}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <span className="text-[#E5E7EB] font-medium">&ldquo;{item.word}&rdquo;</span>
                          <span className="font-mono-tabular text-[#FACC15]">
                            {item.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-5 border-t border-[#22262E]">
                  <h3 className="text-sm font-semibold text-[#F5F5F4] mb-2.5">What Landed</h3>
                  <ul className="space-y-2 text-xs text-[#D1D5DB] leading-relaxed">
                    {analysis.strengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono-tabular text-[#9CA3AF]">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 border-t border-[#22262E]">
                  <h3 className="text-sm font-semibold text-[#F5F5F4] mb-2.5">
                    Clarity Friction Points
                  </h3>
                  <ul className="space-y-2 text-xs text-[#D1D5DB] leading-relaxed">
                    {analysis.frictionPoints.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono-tabular text-[#9CA3AF]">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 border-t border-[#22262E]">
                  <h3 className="text-sm font-semibold text-[#FACC15] mb-2.5">
                    3 Drills for Your Next 5-Minute Take
                  </h3>
                  <ul className="space-y-2.5 text-xs text-[#E5E7EB] leading-relaxed">
                    {analysis.nextTakeDrills.map((drill, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono-tabular text-[#FACC15] font-semibold">
                          0{i + 1}
                        </span>
                        <span>{drill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* End-of-Flow Action Bar */}
          {(onOpenArchive || onStartNewTake) && (
            <div className="p-6 rounded-xl border border-[#22262E] bg-[#121417] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#F5F5F4]">
                  {isSampleWithoutMedia
                    ? 'Sample Audit Complete — Ready for Your Own Baseline?'
                    : 'Audit Complete — Lock In Your Next Rep'}
                </h3>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  Pick 1–4 habits from your Focus Plan and apply them in your next 5-minute take.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {onOpenArchive && (
                  <button
                    type="button"
                    onClick={onOpenArchive}
                    className="px-4 py-2.5 rounded-lg border border-[#2E3440] bg-[#171A21] hover:bg-[#1F242E] text-xs font-medium text-[#F5F5F4] transition-colors cursor-pointer"
                  >
                    View 30-Day Progress
                  </button>
                )}
                {onStartNewTake && (
                  <button
                    type="button"
                    onClick={onStartNewTake}
                    className="px-5 py-2.5 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Record Next Take
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
