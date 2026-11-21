import { useEffect, useMemo, useState } from 'react';
import { StepRail } from './components/StepRail';
import { RecordStage } from './components/RecordStage';
import { WaitStage } from './components/WaitStage';
import { ListenStage } from './components/ListenStage';
import { WatchStage } from './components/WatchStage';
import { TranscriptStage } from './components/TranscriptStage';
import { ArchiveView } from './components/ArchiveView';
import { MethodologyView } from './components/MethodologyView';
import { AudiobookLab } from './components/AudiobookLab';
import {
  deleteSession,
  getAllSessions,
  getMediaBlobs,
  saveMediaBlobs,
  saveSession,
} from './lib/storage';
import { formatClock, formatSessionDate, isSessionUnlocked } from './lib/format';
import type {
  AppView,
  ListenChecklist,
  MirrorSession,
  MirrorStep,
  ObservationNote,
  SessionMediaBlobs,
  TranscriptAnalysis,
  WatchChecklist,
} from './types/mirror';

export default function App() {
  const [view, setView] = useState<AppView>('studio');
  const [sessions, setSessions] = useState<MirrorSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<MirrorStep>(1);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  // Load saved sessions from IndexedDB on mount
  useEffect(() => {
    (async () => {
      const saved = await getAllSessions();
      setSessions(saved);
      if (saved.length > 0) {
        const latest = saved[0];
        setActiveSessionId(latest.id);
        setActiveStep(latest.currentStep);
      }
      setLoaded(true);
    })();
  }, []);

  // Load media blobs for the active session and manage Object URLs cleanly
  useEffect(() => {
    let cancelled = false;
    let nextAudioUrl: string | null = null;
    let nextVideoUrl: string | null = null;

    (async () => {
      if (!activeSessionId) {
        setAudioBlob(null);
        setVideoBlob(null);
        setAudioUrl(null);
        setVideoUrl(null);
        return;
      }

      const blobs = await getMediaBlobs(activeSessionId);
      if (cancelled) return;

      if (blobs) {
        setAudioBlob(blobs.audioBlob);
        setVideoBlob(blobs.videoBlob ?? null);
        nextAudioUrl = URL.createObjectURL(blobs.audioBlob);
        nextVideoUrl = blobs.videoBlob ? URL.createObjectURL(blobs.videoBlob) : null;
        setAudioUrl(nextAudioUrl);
        setVideoUrl(nextVideoUrl);
      } else {
        setAudioBlob(null);
        setVideoBlob(null);
        setAudioUrl(null);
        setVideoUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (nextAudioUrl) URL.revokeObjectURL(nextAudioUrl);
      if (nextVideoUrl) URL.revokeObjectURL(nextVideoUrl);
    };
  }, [activeSessionId]);

  const persistSession = async (updated: MirrorSession) => {
    await saveSession(updated);
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const next = exists
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [updated, ...prev];
      return next.sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const handleSessionCreated = async (
    session: MirrorSession,
    media: SessionMediaBlobs
  ) => {
    await saveMediaBlobs(media);
    await persistSession(session);
    setActiveSessionId(session.id);
    setActiveStep(2);
    setView('studio');
  };

  const handleStartNewTake = () => {
    setActiveSessionId(null);
    setActiveStep(1);
    setView('studio');
  };

  const handleSelectStep = async (step: MirrorStep) => {
    if (step === 1 && activeStep !== 1 && activeSession) {
      // Clicking Step 01 lets user start a fresh take
      handleStartNewTake();
      return;
    }
    setActiveStep(step);
    if (activeSession && activeSession.currentStep !== step) {
      await persistSession({ ...activeSession, currentStep: step });
    }
  };

  const handleUnlockEarly = async () => {
    if (!activeSession) return;
    const completed = Array.from(new Set<MirrorStep>([...activeSession.completedSteps, 2]));
    const updated: MirrorSession = {
      ...activeSession,
      bypassWait: true,
      currentStep: 3,
      completedSteps: completed,
    };
    await persistSession(updated);
    setActiveStep(3);
  };

  const handleProceedToListen = async () => {
    if (!activeSession) return;
    const completed = Array.from(new Set<MirrorStep>([...activeSession.completedSteps, 2]));
    const updated: MirrorSession = {
      ...activeSession,
      currentStep: 3,
      completedSteps: completed,
    };
    await persistSession(updated);
    setActiveStep(3);
  };

  const handleUpdateListenChecklist = async (listenChecklist: ListenChecklist) => {
    if (!activeSession) return;
    await persistSession({ ...activeSession, listenChecklist });
  };

  const handleUpdateWatchChecklist = async (watchChecklist: WatchChecklist) => {
    if (!activeSession) return;
    await persistSession({ ...activeSession, watchChecklist });
  };

  const handleAddNote = async (noteInput: Omit<ObservationNote, 'id' | 'createdAt'>) => {
    if (!activeSession) return;
    const newNote: ObservationNote = {
      ...noteInput,
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    await persistSession({
      ...activeSession,
      notes: [...activeSession.notes, newNote],
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeSession) return;
    await persistSession({
      ...activeSession,
      notes: activeSession.notes.filter((n) => n.id !== noteId),
    });
  };

  const handleCompleteStep = async (completedStep: MirrorStep, nextStep: MirrorStep) => {
    if (!activeSession) return;
    const completed = Array.from(
      new Set<MirrorStep>([...activeSession.completedSteps, completedStep])
    );
    await persistSession({
      ...activeSession,
      currentStep: nextStep,
      completedSteps: completed,
    });
    setActiveStep(nextStep);
  };

  const handleSaveTranscript = async (transcript: TranscriptAnalysis) => {
    if (!activeSession) return;
    const completed = Array.from(new Set<MirrorStep>([...activeSession.completedSteps, 5]));
    await persistSession({
      ...activeSession,
      transcript,
      currentStep: 5,
      completedSteps: completed,
    });
  };

  const handleSelectSessionFromArchive = (id: string) => {
    const found = sessions.find((s) => s.id === id);
    if (!found) return;
    setActiveSessionId(id);
    const unlocked = isSessionUnlocked(found.unlockAt, found.bypassWait);
    const targetStep: MirrorStep =
      !unlocked && found.currentStep > 2 ? 2 : found.currentStep;
    setActiveStep(targetStep);
    setView('studio');
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setActiveStep(1);
    }
  };

  const isUnlocked = activeSession
    ? isSessionUnlocked(activeSession.unlockAt, activeSession.bypassWait)
    : false;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C0E] text-[#F5F5F4]">
      {/* Strict 3-Zone Top Bar */}
      <header className="w-full border-b border-[#22262E] bg-[#0B0C0E]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setView('studio')}
            className="font-display text-2xl font-bold uppercase tracking-wide text-[#F5F5F4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            The 5-Minute Mirror
          </button>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setView('studio')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'studio'
                  ? 'border-[#FACC15] text-[#F5F5F4]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Studio
            </button>
            <button
              type="button"
              onClick={() => setView('audiobook')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'audiobook'
                  ? 'border-[#FACC15] text-[#F5F5F4]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Audiobook Lab
            </button>
            <button
              type="button"
              onClick={() => setView('archive')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'archive'
                  ? 'border-[#FACC15] text-[#F5F5F4]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Archive ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setView('methodology')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'methodology'
                  ? 'border-[#FACC15] text-[#F5F5F4]'
                  : 'border-transparent text-[#9CA3AF] hover:text-[#F5F5F4]'
              }`}
            >
              Methodology
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleStartNewTake}
              className="px-4 py-2 rounded-lg bg-[#FACC15] hover:bg-[#FDE047] text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Take
            </button>
          </div>
        </div>
      </header>

      {/* 5-Step Workflow Rail shown in Studio */}
      {view === 'studio' && (
        <StepRail
          activeStep={activeStep}
          completedSteps={activeSession?.completedSteps ?? []}
          hasSession={Boolean(activeSession)}
          isUnlocked={isUnlocked}
          onSelectStep={handleSelectStep}
        />
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        {!loaded ? (
          <div className="py-16 text-center text-sm text-[#9CA3AF]">
            Loading studio workspace...
          </div>
        ) : view === 'audiobook' ? (
          <AudiobookLab />
        ) : view === 'archive' ? (
          <ArchiveView
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSessionFromArchive}
            onDeleteSession={handleDeleteSession}
            onStartNewTake={handleStartNewTake}
          />
        ) : view === 'methodology' ? (
          <MethodologyView onStartNewTake={handleStartNewTake} />
        ) : (
          <>
            {/* Quiet Unboxed Session Context Strip when reviewing an active session */}
            {activeSession && activeStep > 1 && (
              <div className="mb-6 pb-4 border-b border-[#22262E] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                  <span className="text-sm font-semibold text-[#F5F5F4]">
                    {activeSession.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatSessionDate(activeSession.createdAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {formatClock(activeSession.durationSeconds)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.hasVideo ? 'Camera + Mic' : 'Audio Only'}</span>
                </div>

                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setView('archive')}
                    className="text-xs font-medium text-[#9CA3AF] hover:text-[#FACC15] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Switch Take
                  </button>
                )}
              </div>
            )}

            {activeStep === 1 || !activeSession ? (
              <RecordStage onSessionCreated={handleSessionCreated} />
            ) : activeStep === 2 ? (
              <WaitStage
                session={activeSession}
                onUnlockEarly={handleUnlockEarly}
                onProceedToListen={handleProceedToListen}
              />
            ) : activeStep === 3 ? (
              <ListenStage
                session={activeSession}
                audioBlob={audioBlob}
                audioUrl={audioUrl}
                onUpdateChecklist={handleUpdateListenChecklist}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onCompleteStep={() => handleCompleteStep(3, 4)}
              />
            ) : activeStep === 4 ? (
              <WatchStage
                session={activeSession}
                videoUrl={videoUrl}
                onUpdateChecklist={handleUpdateWatchChecklist}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
                onCompleteStep={() => handleCompleteStep(4, 5)}
              />
            ) : (
              <TranscriptStage
                session={activeSession}
                audioBlob={audioBlob}
                videoBlob={videoBlob}
                audioUrl={audioUrl}
                videoUrl={videoUrl}
                onSaveTranscript={handleSaveTranscript}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
