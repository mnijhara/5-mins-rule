# The 5-Minute Mirror

> *"Communication is not a gift reserved for the naturally charismatic. It is a skill—an instrument you were born with, and you can learn to play it."*  
> — Inspired by **Vinh Giang** (*Before We Forget: How to Connect*)

**The 5-Minute Mirror** is a 5-step communication self-review studio designed to eliminate emotional bias and help you audit your **Vocal**, **Visual**, and **Verbal** channels one pass at a time.

---

## The 5-Step Isolation Protocol

1. **01 · Record 5 Min (`First Take · No Plan`)**  
   Speak unscripted on camera (or audio-only) for up to 5 minutes. No scripts, no retakes—capture your natural baseline.
2. **02 · Wait 24 Hrs (`Then Review It`)**  
   Let your emotional attachment to the take fade. Distance turns self-criticism into objective coaching.
3. **03 · Listen Only (`Phone Face Down`)**  
   Audit your **5 Vocal Foundations** without visual distraction: *Rate of Speech, Volume, Pitch & Melody (88 Keys), Tonality, and The Pause*.
4. **04 · Watch on Mute (`Hands · Face · Posture`)**  
   Audit your physical presence without sound: descriptive hand gestures, facial congruence, grounded posture, and eye-line stability.
5. **05 · AI Transcript (`Verbal & Delivery Audit`)**  
   Review a verbatim transcript with filler-word counts, WPM pacing, timestamped delivery notes, and targeted next-take drills powered by Gemini.

---

## Core Features

- **5-Step Studio Workflow:** Guided progression with a 24-hour cooling-off timer (with optional early unlock), timestamped observation notes, and channel-specific checklists.
- **30-Day Mirror & Top 4 Habits Tracker:** Compare **Day 1 vs. Latest Take** (WPM & filler-word deltas) and commit to your **Top 4 Focus Habits** (*"Knowledge is power = WRONG. Applied knowledge is power = CORRECT."*).
- **Audiobook Lab:** Generate AI-narrated reference passages or upload reference clips, record your own take, and get a side-by-side 5-pillar vocal comparison.
- **Vocal Drills Deck:** Practice targeted micro-drills (*88 Keys*, *Reliving*, *Volume Dial*) with instant AI feedback.
- **Local-First Privacy:** Recordings and session history are stored locally in your browser's IndexedDB (`storage.ts`).

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide Icons, Motion
- **Backend:** Express 4, `@google/genai` (Gemini transcription, structured coaching, and TTS narration)

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   APP_URL=http://localhost:3000
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

4. **Typecheck & build for production:**
   ```bash
   npm run lint
   npm run build
   npm start
   ```
