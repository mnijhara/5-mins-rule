export interface AcousticMetrics {
  durationSeconds: number;
  amplitudeEnvelope: number[];
  pitchContour: (number | null)[];
  pitchRangeSemitones: number;
  medianPitchHz: number | null;
  pauseCount: number;
  pauseRatioPct: number;
}

function estimatePitchHz(
  samples: Float32Array,
  startIdx: number,
  windowSize: number,
  sampleRate: number,
  silenceThreshold: number
): number | null {
  if (startIdx + windowSize > samples.length) return null;

  let energy = 0;
  for (let i = 0; i < windowSize; i++) {
    const s = samples[startIdx + i];
    energy += s * s;
  }
  const rms = Math.sqrt(energy / windowSize);
  if (rms < silenceThreshold) return null;

  const minLag = Math.max(16, Math.floor(sampleRate / 350)); // 350 Hz max
  const maxLag = Math.min(windowSize - 2, Math.floor(sampleRate / 75)); // 75 Hz min
  if (maxLag <= minLag) return null;

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0;
    let normA = 0;
    let normB = 0;
    const limit = windowSize - lag;
    for (let i = 0; i < limit; i++) {
      const a = samples[startIdx + i];
      const b = samples[startIdx + i + lag];
      cross += a * b;
      normA += a * a;
      normB += b * b;
    }
    const denom = Math.sqrt(normA * normB);
    if (denom > 0) {
      const corr = cross / denom;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
  }

  if (bestCorr < 0.58 || bestLag <= 0) return null;
  return sampleRate / bestLag;
}

export async function analyzeAudioAcoustics(
  blob: Blob,
  buckets = 72
): Promise<AcousticMetrics> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    const samples = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const durationSeconds = audioBuffer.duration;

    // 1. Scan 50ms RMS frames for adaptive silence floor & pause detection
    const frameSize = Math.max(256, Math.floor(sampleRate * 0.05));
    const frameRms: number[] = [];
    for (let offset = 0; offset + frameSize <= samples.length; offset += frameSize) {
      let sum = 0;
      for (let i = 0; i < frameSize; i++) {
        const s = samples[offset + i];
        sum += s * s;
      }
      frameRms.push(Math.sqrt(sum / frameSize));
    }

    const sortedRms = [...frameRms].sort((a, b) => a - b);
    const p90Rms = sortedRms[Math.floor(sortedRms.length * 0.9)] ?? 0.05;
    const silenceFloor = Math.max(0.008, p90Rms * 0.12);

    // Trim leading & trailing silence frames when counting mid-speech pauses
    let firstSpeech = 0;
    while (firstSpeech < frameRms.length && frameRms[firstSpeech] < silenceFloor) {
      firstSpeech++;
    }
    let lastSpeech = frameRms.length - 1;
    while (lastSpeech > firstSpeech && frameRms[lastSpeech] < silenceFloor) {
      lastSpeech--;
    }

    let silentFrames = 0;
    let totalActiveFrames = Math.max(1, lastSpeech - firstSpeech + 1);
    let pauseCount = 0;
    let currentSilenceRun = 0;

    for (let i = firstSpeech; i <= lastSpeech; i++) {
      if (frameRms[i] < silenceFloor) {
        silentFrames++;
        currentSilenceRun++;
      } else {
        if (currentSilenceRun >= 7) {
          // >= 350ms deliberate pause
          pauseCount++;
        }
        currentSilenceRun = 0;
      }
    }

    const pauseRatioPct = Math.min(
      95,
      Math.round((silentFrames / totalActiveFrames) * 100)
    );

    // 2. Amplitude envelope + pitch contour across `buckets` slices
    const blockSize = Math.max(1, Math.floor(samples.length / buckets));
    const pitchWindow = Math.min(2048, Math.floor(sampleRate * 0.04));
    const rawPeaks: number[] = [];
    const pitchContour: (number | null)[] = [];
    const voicedHz: number[] = [];
    let maxPeak = 0.001;

    for (let i = 0; i < buckets; i++) {
      const start = i * blockSize;
      const end = Math.min(samples.length, start + blockSize);
      let peak = 0;
      for (let j = start; j < end; j += 2) {
        const abs = Math.abs(samples[j]);
        if (abs > peak) peak = abs;
      }
      if (peak > maxPeak) maxPeak = peak;
      rawPeaks.push(peak);

      const midStart = Math.max(
        0,
        Math.min(samples.length - pitchWindow, start + Math.floor(blockSize / 2) - Math.floor(pitchWindow / 2))
      );
      const hz = estimatePitchHz(samples, midStart, pitchWindow, sampleRate, silenceFloor);
      pitchContour.push(hz);
      if (hz !== null) voicedHz.push(hz);
    }

    const amplitudeEnvelope = rawPeaks.map((p) => Math.max(0.06, p / maxPeak));

    let pitchRangeSemitones = 0;
    let medianPitchHz: number | null = null;
    if (voicedHz.length >= 4) {
      const sortedHz = [...voicedHz].sort((a, b) => a - b);
      const p10 = sortedHz[Math.floor(sortedHz.length * 0.1)];
      const p50 = sortedHz[Math.floor(sortedHz.length * 0.5)];
      const p90 = sortedHz[Math.floor(sortedHz.length * 0.9)];
      medianPitchHz = Math.round(p50);
      pitchRangeSemitones = Number(
        Math.max(0, 12 * Math.log2(p90 / Math.max(1, p10))).toFixed(1)
      );
    }

    return {
      durationSeconds,
      amplitudeEnvelope,
      pitchContour,
      pitchRangeSemitones,
      medianPitchHz,
      pauseCount,
      pauseRatioPct,
    };
  } catch {
    return {
      durationSeconds: 0,
      amplitudeEnvelope: Array.from({ length: buckets }, () => 0.12),
      pitchContour: Array.from({ length: buckets }, () => null),
      pitchRangeSemitones: 0,
      medianPitchHz: null,
      pauseCount: 0,
      pauseRatioPct: 0,
    };
  }
}
