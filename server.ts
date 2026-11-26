import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const aiRateBuckets = new Map<string, { count: number; resetAt: number }>();
const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_MAX_REQUESTS = 25;

function aiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = aiRateBuckets.get(ip);

  if (!entry || now > entry.resetAt) {
    aiRateBuckets.set(ip, { count: 1, resetAt: now + AI_WINDOW_MS });
    return next();
  }

  if (entry.count >= AI_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many AI analysis requests. Please wait a few minutes before trying again.',
    });
  }

  entry.count += 1;
  return next();
}

function requireGeminiKey(_req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'AI coaching is not configured yet. Add GEMINI_API_KEY in your server environment variables.',
    });
  }
  return next();
}

function getAiClient(apiVersion?: 'v1beta') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  const obj = err as { status?: number; message?: string };
  let status = obj?.status && obj.status >= 400 ? obj.status : 500;
  let message = obj?.message || 'Gemini API request failed.';

  try {
    const parsed = JSON.parse(message);
    if (parsed?.error?.message) {
      message = parsed.error.message;
      if (parsed.error.code >= 400) status = parsed.error.code;
    }
  } catch {
    // message is already plain text
  }
  return { status, message };
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const { status, message } = extractGeminiError(err);
      const isTransient =
        status === 429 ||
        status === 503 ||
        /high demand|unavailable|overloaded|timeout/i.test(message);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function generateWithHydrogenOrLite(
  ai: GoogleGenAI,
  params: {
    contents: unknown;
    responseSchema: Record<string, unknown>;
    thinkingLevel: ThinkingLevel;
  }
) {
  const runModel = async (model: string, timeoutMs: number) =>
    Promise.race([
      ai.models.generateContent({
        model,
        contents: params.contents as never,
        config: {
          thinkingConfig: { thinkingLevel: params.thinkingLevel },
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema as never,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${model} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

  try {
    return await runModel('gemini-4-hydrogen', 18000);
  } catch (primaryErr) {
    const { status, message } = extractGeminiError(primaryErr);
    const shouldFallback =
      status === 429 ||
      status === 503 ||
      status === 500 ||
      /high demand|unavailable|overloaded|timed out/i.test(message);
    if (!shouldFallback) {
      throw primaryErr;
    }
    console.warn(
      `gemini-4-hydrogen fallback triggered (${status}: ${message}). Routing to gemini-3.1-flash-lite.`
    );
    return await withGeminiRetry(() => runModel('gemini-3.1-flash-lite', 22000), 1);
  }
}

function normalizeMimeType(rawContentType: string | undefined): string {
  const base = (rawContentType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!base || base === 'application/octet-stream') {
    return 'audio/webm';
  }
  return base;
}

app.post(
  '/api/analyze-speech',
  aiRateLimiter,
  requireGeminiKey,
  express.raw({ type: '*/*', limit: '45mb' }),
  async (req, res) => {
    try {
      const mediaBuffer = req.body as Buffer;
      if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
        res.status(400).json({ error: 'No audio or video payload received.' });
        return;
      }

      const mimeType = normalizeMimeType(req.headers['content-type']);
      const durationSeconds = Math.max(1, Number(req.query.durationSeconds) || 60);
      const base64Data = mediaBuffer.toString('base64');
      const ai = getAiClient();
      const aiBeta = getAiClient('v1beta');

      let verbatimTranscript = '';

      // Step 1: Use gemini-3.5-transcribe for dedicated audio inputs (with timeout + clean fallback to single-pass gemini-4-hydrogen)
      if (mimeType.startsWith('audio/')) {
        try {
          const transcribeResponse = await Promise.race([
            withGeminiRetry(
              () =>
                aiBeta.models.generateContent({
                  model: 'gemini-3.5-transcribe',
                  contents: {
                    parts: [
                      {
                        inlineData: {
                          mimeType,
                          data: base64Data,
                        },
                      },
                      {
                        text: 'Transcribe this speech completely verbatim. Keep every filler word ("um", "uh", "like", "you know", "so", "actually", "basically", "right"), false start, repetition, and self-correction exactly as spoken without cleaning or polishing grammar.',
                      },
                    ],
                  },
                }),
              1
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Transcription step timed out')), 18000)
            ),
          ]);
          verbatimTranscript = (transcribeResponse.text ?? '').trim();
        } catch (transcribeErr) {
          console.warn(
            'gemini-3.5-transcribe unavailable or slow, proceeding with single-pass gemini-4-hydrogen audio audit:',
            extractGeminiError(transcribeErr).message
          );
        }
      }

      const coachingContext = `You are a communication coach trained in Vinh Giang's "5-Minute Mirror" and "Before We Forget: How to Connect" methodology.
Your philosophy: communication is an instrument across three channels—Vocal (rate of speech, pitch/melody across the "88 keys", downward authority finishes, volume without flatness, strategic pauses, and emotional tonality), Visual, and Verbal (clarity, storytelling hooks, cutting filler words and circular phrasing).`;

      // Step 2: Structured breakdown & coaching analysis with gemini-4-hydrogen
      const analysisPrompt = verbatimTranscript
        ? `${coachingContext}

Analyze this ${Math.round(durationSeconds)}-second unscripted speaking take.

Verbatim transcript:
"""
${verbatimTranscript}
"""

Using both the attached audio recording and the verbatim transcript above:
1. Break the speech into chronological timestamped segments (roughly 10–25 seconds each, spanning 0 to ${Math.round(durationSeconds)} seconds). Keep the segment text strictly verbatim (preserving filler words like "um", "uh", "like", "you know", "so", "actually", "right"). For deliveryNote, briefly note vocal or structural cues you hear (e.g., rushed clause, upward ending, strong pause, circular phrasing).
2. Identify every filler word used in each segment and compute exact total counts across the whole speech for fillerBreakdown.
3. Calculate totalWords and wordsPerMinute based on the spoken word count and ${Math.round(durationSeconds)} seconds duration.
4. Provide objective, non-judgmental feedback grounded in Vinh Giang's Vocal & Verbal foundations:
   - summary: 2-3 sentences capturing the core thesis, story arc, and overall connection.
   - pacingAssessment: 1-2 sentences describing rate variation and whether pauses gave the listener time to digest ideas.
   - vocalObservations:
     * rateAndPauses: How speed varied and whether silence replaced or lost out to filler sounds.
     * pitchAndMelody: Vocal range/melody (playing multiple "keys" vs. monotone) and whether sentences ended with downward authority or upward hesitation.
     * volumeAndTonality: Projection, warmth vs. flatness ("Volume Trap"), and emotional congruence beneath the words.
     * storytellingNote: Evaluate "Reliving vs. Reporting"—did the speaker transport the listener with sensory detail, direct dialogue, and pacing, or just report dry facts?
   - strengths: 2-3 concrete moments or habits that worked well.
   - frictionPoints: 2-3 specific verbal habits, circular tangents, filler clusters, or vocal flats noticed.
   - nextTakeDrills: 3 concrete, practical drills for the speaker's next 5-minute take (e.g., silent pause replacement, downward pitch authority finish, 88-key melody contrast, or single-hook storytelling).`
        : `${coachingContext}

Analyze this ${Math.round(durationSeconds)}-second unscripted speaking take from the attached media:
1. Transcribe the speech strictly verbatim in chronological timestamped segments (roughly 10–25 seconds each, spanning 0 to ${Math.round(durationSeconds)} seconds). Keep every filler word ("um", "uh", "like", "you know", "so", "actually", "right"), false start, and repetition exactly as spoken without polishing grammar.
2. Identify every filler word used in each segment and compute exact total counts across the whole speech for fillerBreakdown.
3. Calculate totalWords and wordsPerMinute based on the spoken word count and ${Math.round(durationSeconds)} seconds duration.
4. Provide objective, non-judgmental feedback grounded in Vinh Giang's Vocal & Verbal foundations:
   - summary: 2-3 sentences capturing the core thesis, story arc, and overall connection.
   - pacingAssessment: 1-2 sentences describing rate variation and whether pauses gave the listener time to digest ideas.
   - vocalObservations:
     * rateAndPauses: How speed varied and whether silence replaced or lost out to filler sounds.
     * pitchAndMelody: Vocal range/melody (playing multiple "keys" vs. monotone) and whether sentences ended with downward authority or upward hesitation.
     * volumeAndTonality: Projection, warmth vs. flatness ("Volume Trap"), and emotional congruence beneath the words.
     * storytellingNote: Evaluate "Reliving vs. Reporting"—did the speaker transport the listener with sensory detail, direct dialogue, and pacing, or just report dry facts?
   - strengths: 2-3 concrete moments or habits that worked well.
   - frictionPoints: 2-3 specific verbal habits, circular tangents, filler clusters, or vocal flats noticed.
   - nextTakeDrills: 3 concrete, practical drills for the speaker's next 5-minute take.`;

      const analysisResponse = await generateWithHydrogenOrLite(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: analysisPrompt },
          ],
        },
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            totalWords: { type: Type.INTEGER },
            wordsPerMinute: { type: Type.INTEGER },
            pacingAssessment: { type: Type.STRING },
            vocalObservations: {
              type: Type.OBJECT,
              properties: {
                rateAndPauses: { type: Type.STRING },
                pitchAndMelody: { type: Type.STRING },
                volumeAndTonality: { type: Type.STRING },
                storytellingNote: { type: Type.STRING },
              },
              required: [
                'rateAndPauses',
                'pitchAndMelody',
                'volumeAndTonality',
                'storytellingNote',
              ],
            },
            fillerBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                },
                required: ['word', 'count'],
              },
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startSeconds: { type: Type.NUMBER },
                  endSeconds: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  fillersFound: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  deliveryNote: { type: Type.STRING },
                },
                required: ['startSeconds', 'endSeconds', 'text', 'fillersFound'],
              },
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            frictionPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            nextTakeDrills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'summary',
            'totalWords',
            'wordsPerMinute',
            'pacingAssessment',
            'vocalObservations',
            'fillerBreakdown',
            'segments',
            'strengths',
            'frictionPoints',
            'nextTakeDrills',
          ],
        },
      });

      const rawJson = (analysisResponse.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      res.json({
        verbatimTranscript: verbatimTranscript || parsed.segments?.map((s: { text: string }) => s.text).join(' ') || '',
        generatedAt: Date.now(),
        ...parsed,
      });
    } catch (err: unknown) {
      const { status, message } = extractGeminiError(err);
      console.error('Speech analysis error:', status, message);
      res.status(status).json({ error: message });
    }
  }
);

app.post(
  '/api/narrate-passage',
  aiRateLimiter,
  requireGeminiKey,
  express.json({ limit: '2mb' }),
  async (req, res) => {
    try {
      const { passageText, voiceName, styleDescription } = req.body as {
        passageText?: string;
        voiceName?: string;
        styleDescription?: string;
      };

      const cleanedText = (passageText || '').trim();
      if (!cleanedText) {
        res.status(400).json({ error: 'Passage text is required for audiobook narration.' });
        return;
      }

      const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
      const safeVoice = allowedVoices.includes(voiceName || '') ? voiceName! : 'Charon';
      const safeStyle =
        (styleDescription || '').trim() ||
        'Warm, expressive, professional audiobook narrator with deliberate pauses, melodic pitch variety, and grounded downward sentence endings';

      const aiBeta = getAiClient('v1beta');
      let response;
      try {
        response = await withGeminiRetry(() =>
          aiBeta.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanedText,
                    speechMetadata: {
                      style: safeStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: safeVoice },
                },
              },
            },
          })
        );
      } catch (err1) {
        try {
          response = await withGeminiRetry(() =>
            aiBeta.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Read aloud in this style (${safeStyle}): ${cleanedText}`,
                    },
                  ],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: safeVoice },
                  },
                },
              },
            })
          );
        } catch (err2) {
          const msg1 = extractGeminiError(err1).message;
          const msg2 = extractGeminiError(err2).message;
          throw new Error(`TTS failed. Attempt1: ${msg1} | Attempt2: ${msg2}`);
        }
      }

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio track was returned by the TTS model.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err: unknown) {
      const { status, message } = extractGeminiError(err);
      console.error('Audiobook narration error:', status, message);
      res.status(status).json({ error: message });
    }
  }
);

app.post(
  '/api/compare-audiobook',
  aiRateLimiter,
  requireGeminiKey,
  express.json({ limit: '45mb' }),
  async (req, res) => {
    try {
      const {
        passageText,
        userAudioBase64,
        userMimeType,
        refAudioBase64,
        refMimeType,
        userDurationSeconds,
        refDurationSeconds,
      } = req.body as {
        passageText?: string;
        userAudioBase64?: string;
        userMimeType?: string;
        refAudioBase64?: string;
        refMimeType?: string;
        userDurationSeconds?: number;
        refDurationSeconds?: number;
      };

      if (!userAudioBase64 || !refAudioBase64) {
        res.status(400).json({
          error: 'Both your recorded reading and the audiobook reference track are required.',
        });
        return;
      }

      const ai = getAiClient();
      const safeUserMime = normalizeMimeType(userMimeType);
      const safeRefMime = normalizeMimeType(refMimeType);
      const wordCount = Math.max(
        1,
        (passageText || '').trim().split(/\s+/).filter(Boolean).length
      );

      const prompt = `You are a vocal communication coach trained in Vinh Giang's "Before We Forget: How to Connect" and "88-Key Piano" vocal methodology.

You have been given TWO audio recordings of the same book passage:
- Audio 1 (first inline audio): The USER reading the passage aloud (approx. ${Math.round(userDurationSeconds || 30)}s).
- Audio 2 (second inline audio): The PROFESSIONAL AUDIOBOOK REFERENCE narration (approx. ${Math.round(refDurationSeconds || 30)}s).

Passage text (${wordCount} words):
"""
${(passageText || '').trim() || '(Passage read from uploaded clip)'}
"""

Compare Audio 1 (User) directly against Audio 2 (Audiobook Reference) across Vinh Giang's Vocal Foundations:
1. Compute realistic userWpm and audiobookWpm based on words spoken and track durations.
2. Provide overallTakeaway: 2–3 sentences summarizing the clearest vocal contrast between the user's read and the audiobook narrator.
3. For dimensions, evaluate exactly these 5 pillars:
   - "Rate & Tempo"
   - "Strategic Pauses"
   - "Pitch & Melody (88 Keys)"
   - "Volume & Projection"
   - "Tonality & Emotion"
   For each pillar, provide:
   - yourDelivery: Specific observation from Audio 1.
   - audiobookDelivery: Specific technique heard in Audio 2.
   - keyShift: Concrete adjustment to bridge the gap.
4. Provide standoutMoments: 2–3 specific phrases or moments from the passage where the audiobook narrator created emphasis or contrast differently from the user.
5. Provide imitationDrills: 3 actionable practice drills for the user's next read-aloud take.`;

      const response = await generateWithHydrogenOrLite(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeUserMime,
                data: userAudioBase64,
              },
            },
            {
              inlineData: {
                mimeType: safeRefMime,
                data: refAudioBase64,
              },
            },
            { text: prompt },
          ],
        },
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallTakeaway: { type: Type.STRING },
            userWpm: { type: Type.INTEGER },
            audiobookWpm: { type: Type.INTEGER },
            dimensions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pillar: { type: Type.STRING },
                  yourDelivery: { type: Type.STRING },
                  audiobookDelivery: { type: Type.STRING },
                  keyShift: { type: Type.STRING },
                },
                required: ['pillar', 'yourDelivery', 'audiobookDelivery', 'keyShift'],
              },
            },
            standoutMoments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            imitationDrills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'overallTakeaway',
            'userWpm',
            'audiobookWpm',
            'dimensions',
            'standoutMoments',
            'imitationDrills',
          ],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        generatedAt: Date.now(),
        ...parsed,
      });
    } catch (err: unknown) {
      const { status, message } = extractGeminiError(err);
      console.error('Audiobook comparison error:', status, message);
      res.status(status).json({ error: message });
    }
  }
);

app.post(
  '/api/evaluate-drill',
  aiRateLimiter,
  requireGeminiKey,
  express.json({ limit: '25mb' }),
  async (req, res) => {
    try {
      const {
        drillType,
        promptText,
        userAudioBase64,
        userMimeType,
        baselineAudioBase64,
        baselineMimeType,
        baselinePitchRangeSemitones,
        durationSeconds,
        pitchRangeSemitones,
        pauseCount,
      } = req.body as {
        drillType?: string;
        promptText?: string;
        userAudioBase64?: string;
        userMimeType?: string;
        baselineAudioBase64?: string;
        baselineMimeType?: string;
        baselinePitchRangeSemitones?: number;
        durationSeconds?: number;
        pitchRangeSemitones?: number;
        pauseCount?: number;
      };

      if (!userAudioBase64) {
        res.status(400).json({ error: 'Recorded drill audio is required.' });
        return;
      }

      const ai = getAiClient();
      const safeMime = normalizeMimeType(userMimeType);
      const hasBaseline = Boolean(baselineAudioBase64);

      const drillGuidance: Record<string, string> = {
        '88-keys': hasBaseline
          ? `Audio 1 is Take A (Baseline, pitch span ${baselinePitchRangeSemitones ?? 0} semitones). Audio 2 is Take B (88-Key Exaggerated target, pitch span ${pitchRangeSemitones ?? 0} semitones). Directly compare Take B against Take A: did the speaker genuinely widen their vocal melody across high/mid/low notes ("playing more of the 88 keys") and land the final words on a grounded downward pitch authority finish rather than trailing upward?`
          : 'Evaluate whether the speaker used genuine pitch melody across high/mid/low notes ("playing more of the 88 keys") and landed the final words with a grounded downward pitch authority finish rather than trailing upward.',
        reliving:
          'Evaluate "Reliving vs. Reporting": did the speaker transport the listener into the scene using direct dialogue, character voice shifts, sensory specifics, and dramatic pauses—or merely report a dry summary of facts?',
        'volume-dial':
          'Evaluate "Avoiding the Volume Trap": did the speaker project strongly (level 7–8 volume) while retaining warmth, relaxed tonality, and melodic variation—or did louder volume sound flat, tense, or aggressive?',
      };

      const rubric =
        drillGuidance[drillType || ''] ||
        'Evaluate vocal delivery across rate, pauses, pitch melody, and emotional tonality.';

      const prompt = `You are Vinh Giang's vocal coaching assistant evaluating a short targeted speaking drill.
Drill Focus: ${drillType || 'vocal-drill'}
Prompt / Sentence: "${(promptText || '').trim()}"
Measured Target Acoustics: Duration ${Math.round(durationSeconds || 10)}s, Pitch Span ${pitchRangeSemitones ?? 0} semitones, Pauses (>=0.35s) ${pauseCount ?? 0}.

Rubric: ${rubric}

Listen closely to the audio${hasBaseline ? ' pair' : ''} and return concise, honest, actionable coaching:
- whatWorked: 1-2 sentences on what specifically landed well in this take.
- missedOpportunity: 1-2 sentences on the clearest habit holding this take back.
- nextRepCue: 1 concrete physical/vocal cue to apply immediately on the next 15-second rep.`;

      const parts = hasBaseline
        ? [
            {
              inlineData: {
                mimeType: normalizeMimeType(baselineMimeType),
                data: baselineAudioBase64!,
              },
            },
            {
              inlineData: {
                mimeType: safeMime,
                data: userAudioBase64,
              },
            },
            { text: prompt },
          ]
        : [
            {
              inlineData: {
                mimeType: safeMime,
                data: userAudioBase64,
              },
            },
            { text: prompt },
          ];

      const response = await generateWithHydrogenOrLite(ai, {
        contents: { parts },
        thinkingLevel: ThinkingLevel.LOW,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatWorked: { type: Type.STRING },
            missedOpportunity: { type: Type.STRING },
            nextRepCue: { type: Type.STRING },
          },
          required: ['whatWorked', 'missedOpportunity', 'nextRepCue'],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        generatedAt: Date.now(),
        ...parsed,
      });
    } catch (err: unknown) {
      const { status, message } = extractGeminiError(err);
      console.error('Drill evaluation error:', status, message);
      res.status(status).json({ error: message });
    }
  }
);

app.post(
  '/api/analyze-visual',
  aiRateLimiter,
  requireGeminiKey,
  express.json({ limit: '10mb' }),
  async (req, res) => {
    try {
      const { frames, durationSeconds } = req.body as {
        frames?: string[];
        durationSeconds?: number;
      };

      if (!Array.isArray(frames) || frames.length === 0) {
        res.status(400).json({ error: 'At least one video frame is required.' });
        return;
      }

      const ai = getAiClient();
      const selectedFrames = frames.slice(0, 6);

      const prompt = `You are Vinh Giang's communication and body-language coach analyzing ${selectedFrames.length} sampled video frames from a ${Math.round(durationSeconds || 15)}-second speaking take.
Evaluate the speaker's visual delivery across four dimensions and provide one top actionable cue:
- handGestures: Are hands visible, open, purposeful, and illustrative rather than hidden, fidgeting, or repetitive?
- facialCongruence: Does facial expression match and amplify the emotional tone of a confident speaker?
- postureAndStance: Is the speaker's posture upright, grounded, and open without slouching or swaying?
- eyeLineStability: Is eye contact steady and directed toward the camera/lens rather than darting or looking away?
- topVisualCue: 1 concrete physical adjustment to apply immediately on the next take.`;

      const parts = [
        ...selectedFrames.map((frame) => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.replace(/^data:image\/\w+;base64,/, ''),
          },
        })),
        { text: prompt },
      ];

      const response = await generateWithHydrogenOrLite(ai, {
        contents: { parts },
        thinkingLevel: ThinkingLevel.LOW,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            handGestures: { type: Type.STRING },
            facialCongruence: { type: Type.STRING },
            postureAndStance: { type: Type.STRING },
            eyeLineStability: { type: Type.STRING },
            topVisualCue: { type: Type.STRING },
          },
          required: [
            'handGestures',
            'facialCongruence',
            'postureAndStance',
            'eyeLineStability',
            'topVisualCue',
          ],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err: unknown) {
      const { status, message } = extractGeminiError(err);
      console.error('Visual analysis error:', status, message);
      res.status(status).json({ error: message });
    }
  }
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '30d',
        immutable: true,
      }),
    );
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The 5-Minute Mirror server listening on http://localhost:${PORT}`);
  });
}

startServer();
