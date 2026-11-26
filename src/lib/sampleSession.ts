import { MirrorSession } from '../types/mirror';

export function createSampleSession(): MirrorSession {
  const now = Date.now();
  const createdAt = now - 26 * 60 * 60 * 1000;
  return {
    id: `sample-${now}`,
    title: 'Sample Take · Why Stories Stick Better Than Slides',
    prompt: 'Explain a lesson you learned the hard way in under 5 minutes without notes.',
    createdAt,
    unlockAt: createdAt + 24 * 60 * 60 * 1000,
    bypassWait: true,
    durationSeconds: 184,
    hasVideo: false,
    audioMimeType: 'audio/webm',
    currentStep: 5,
    completedSteps: [1, 2, 3, 4, 5],
    listenChecklist: {
      vocalVariety: true,
      pacingAndPauses: true,
      fillerAwareness: true,
      sentenceEndings: true,
      volumeAndProjection: true,
      tonalityAndEmotion: true,
    },
    watchChecklist: {
      handGestures: true,
      facialCongruence: true,
      postureAndStance: true,
      eyeLineStability: true,
    },
    notes: [
      {
        id: 'sample-note-1',
        step: 3,
        timestampSeconds: 24,
        category: 'Filler',
        text: 'Used "you know" twice while transitioning into the main story.',
        createdAt,
      },
      {
        id: 'sample-note-2',
        step: 3,
        timestampSeconds: 78,
        category: 'Pause',
        text: 'Strong 2-second pause right before the punchline—landed with authority.',
        createdAt,
      },
      {
        id: 'sample-note-3',
        step: 4,
        timestampSeconds: 45,
        category: 'Hands',
        text: 'Descriptive open-palm gesture helped frame the contrast.',
        createdAt,
      },
    ],
    transcript: {
      generatedAt: now,
      verbatimTranscript:
        'Last year I walked into a quarterly review with forty slides and, um, zero stories. Within three minutes, you know, everyone was checking their phones instead of listening. So I closed my laptop, you know, took a breath, and told them about the one customer call that broke our assumption. The room went completely quiet—and we made the decision in five minutes.',
      summary:
        'Clear, engaging narrative arc with strong emotional contrast between the slide deck failure and the quiet customer story.',
      totalWords: 55,
      wordsPerMinute: 138,
      pacingAssessment:
        'Well-paced conversational cadence (138 WPM) with effective slowing on the turning point.',
      vocalObservations: {
        rateAndPauses: 'Good deceleration before "The room went completely quiet"; add a 2-second pause after "zero stories".',
        pitchAndMelody: 'Solid melodic lift on the contrast; explore lower pitch registers on the closing takeaway.',
        volumeAndTonality: 'Warm, grounded volume that draws listeners in during the quieter beat.',
        storytellingNote: 'Opening with a concrete mistake hooks attention immediately.',
      },
      fillerBreakdown: [
        { word: 'um', count: 1 },
        { word: 'you know', count: 2 },
      ],
      segments: [
        {
          startSeconds: 0,
          endSeconds: 18,
          text: 'Last year I walked into a quarterly review with forty slides and, um, zero stories.',
          fillersFound: ['um'],
          deliveryNote: 'Replace "um" with a silent half-second beat before "zero stories".',
        },
        { startSeconds: 19, endSeconds: 38, text: 'Within three minutes, you know, everyone was checking their phones instead of listening.', fillersFound: ['you know'], deliveryNote: 'Trim the "you know" filler after "three minutes" to keep momentum.' }, { startSeconds: 39, endSeconds: 64, text: 'So I closed my laptop, you know, took a breath, and told them about the one customer call that broke our assumption.', fillersFound: ['you know'], deliveryNote: 'Good narrative pivot; pause briefly instead of saying "you know" after "laptop".' }, {
          
          startSeconds: 65,
          endSeconds: 88,
          text: 'The room went completely quiet—and we made the decision in five minutes.',
          fillersFound: [],
          deliveryNote: 'Strong drop in volume and pace; great emotional congruence.',
        },
      ],
      strengths: [
        'Opened with a vivid, relatable mistake instead of abstract theory.',
        'Used volume contrast (dropping softer) to pull listeners into the key moment.',
      ],
      frictionPoints: [
        'Rushed slightly through the transition before the customer call.',
        'Two "you know" fillers appeared when bridging between scenes.',
      ],
      nextTakeDrills: [
        '88 Keys Drill: Re-record the opening sentence with a higher pitch on "forty slides" and a low, flat drop on "zero stories".',
        'Silence = Confidence: Hold a full 2-second silent pause after "completely quiet".',
      'Volume Dial (5/10 → 2/10): Drop your volume on the closing sentence to pull listeners in.',
      ],
    },
  };
}

export function exportSessionMarkdown(session: MirrorSession): void {
  const lines: string[] = [
    `# ${session.title}`,
    `- **Date:** ${new Date(session.createdAt).toLocaleString()}`,
    `- **Duration:** ${session.durationSeconds}s`,
    `- **Prompt:** ${session.prompt || 'Unscripted'}`,
    '',
  ];

  if (session.transcript) {
    const t = session.transcript;
    const totalFillers = t.fillerBreakdown.reduce((acc, f) => acc + f.count, 0);
    lines.push(
      '## AI Audit Summary',
      `- **Speaking Pace:** ${t.wordsPerMinute} WPM (${t.totalWords} words)`,
      `- **Total Fillers:** ${totalFillers}`,
      `- **Summary:** ${t.summary}`,
      '',
      '### Strengths',
      ...t.strengths.map((s) => `- ${s}`),
      '',
      '### Friction Points',
      ...t.frictionPoints.map((f) => `- ${f}`),
      '',
      '### Next-Take Drills',
      ...t.nextTakeDrills.map((d) => `- ${d}`),
      '',
      '## Verbatim Transcript',
      t.verbatimTranscript,
      ''
    );
  }

  if (session.visualAudit) {
    const v = session.visualAudit;
    lines.push(
      '## AI Body-Language Scan',
      `- **Top Cue:** ${v.topVisualCue}`,
      `- **Hand Gestures:** ${v.handGestures}`,
      `- **Facial Congruence:** ${v.facialCongruence}`,
      `- **Posture & Stance:** ${v.postureAndStance}`,
      `- **Eye-Line Stability:** ${v.eyeLineStability}`,
      ''
    );
  }

  if (session.notes.length > 0) {
    lines.push(
      '## Timestamped Self-Review Notes',
      ...session.notes.map(
        (n) => `- [${n.timestampSeconds}s · Step ${n.step} · ${n.category}] ${n.text}`
      ),
      ''
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
