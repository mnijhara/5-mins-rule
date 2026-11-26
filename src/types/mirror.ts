export type MirrorStep = 1 | 2 | 3 | 4 | 5;

export type AppView = 'landing' | 'studio' | 'audiobook' | 'archive' | 'methodology';

export interface ObservationNote {
  id: string;
  step: 3 | 4;
  timestampSeconds: number;
  category: string;
  text: string;
  createdAt: number;
}

export interface ListenChecklist {
  vocalVariety: boolean; // Pitch & Melody (88-key range & authority finish)
  pacingAndPauses: boolean; // Rate of Speech & Strategic Pauses
  fillerAwareness: boolean; // Pauses vs. filler crutches
  sentenceEndings: boolean; // Authority finish (downward inflection)
  volumeAndProjection?: boolean; // Volume without flat-tone "Volume Trap"
  tonalityAndEmotion?: boolean; // Underlying emotional congruence
}

export interface WatchChecklist {
  handGestures: boolean;
  facialCongruence: boolean;
  postureAndStance: boolean;
  eyeLineStability: boolean;
}

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
  fillersFound: string[];
  deliveryNote?: string;
}

export interface FillerCount {
  word: string;
  count: number;
}

export interface VocalObservations {
  rateAndPauses: string;
  pitchAndMelody: string;
  volumeAndTonality: string;
  storytellingNote?: string;
}

export interface DrillEvaluation {
  generatedAt: number;
  whatWorked: string;
  missedOpportunity: string;
  nextRepCue: string;
}

export interface TranscriptAnalysis {
  verbatimTranscript: string;
  generatedAt: number;
  summary: string;
  totalWords: number;
  wordsPerMinute: number;
  pacingAssessment: string;
  vocalObservations?: VocalObservations;
  fillerBreakdown: FillerCount[];
  segments: TranscriptSegment[];
  strengths: string[];
  frictionPoints: string[];
  nextTakeDrills: string[];
}

export interface VisualAudit {
  generatedAt: number;
  handGestures: string;
  facialCongruence: string;
  postureAndStance: string;
  eyeLineStability: string;
  topVisualCue: string;
}

export interface MirrorSession {
  id: string;
  title: string;
  prompt: string;
  createdAt: number;
  unlockAt: number;
  bypassWait: boolean;
  durationSeconds: number;
  hasVideo: boolean;
  videoMimeType?: string;
  audioMimeType: string;
  currentStep: MirrorStep;
  completedSteps: MirrorStep[];
  listenChecklist: ListenChecklist;
  watchChecklist: WatchChecklist;
  notes: ObservationNote[];
  visualAudit?: VisualAudit;
  transcript?: TranscriptAnalysis;
}

export interface SessionMediaBlobs {
  sessionId: string;
  videoBlob?: Blob;
  audioBlob: Blob;
}

export interface AudiobookComparisonDimension {
  pillar: string;
  yourDelivery: string;
  audiobookDelivery: string;
  keyShift: string;
}

export interface AudiobookComparison {
  generatedAt: number;
  overallTakeaway: string;
  userWpm: number;
  audiobookWpm: number;
  dimensions: AudiobookComparisonDimension[];
  standoutMoments: string[];
  imitationDrills: string[];
}

export interface AudiobookSession {
  id: string;
  title: string;
  passageText: string;
  voiceName: string;
  styleLabel: string;
  referenceSource: 'ai-narrator' | 'uploaded-clip';
  createdAt: number;
  userDurationSeconds: number;
  refDurationSeconds: number;
  comparison?: AudiobookComparison;
}

export interface AudiobookMediaBlobs {
  sessionId: string;
  userAudioBlob?: Blob;
  refAudioBlob?: Blob;
}
