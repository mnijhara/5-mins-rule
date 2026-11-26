import React, { useEffect, useState } from 'react';
import { BookMarked, Plus, Trash2 } from 'lucide-react';

export interface StoryEntry {
  id: string;
  title: string;
  category: 'high-stakes' | 'vulnerable' | 'humorous';
  when: string;
  where: string;
  who: string;
  what: string;
  spark: string;
  point: string;
  link: string;
  createdAt: number;
}

const STORAGE_KEY = 'five_minute_mirror_story_bank_v1';

const CATEGORY_STYLES: Record<StoryEntry['category'], string> = {
  'high-stakes': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  vulnerable: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  humorous: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function StoryBankPanel() {
  const [stories, setStories] = useState<StoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StoryEntry['category']>('high-stakes');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const [spark, setSpark] = useState('');
  const [point, setPoint] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    } catch {
      // Ignore quota errors
    }
  }, [stories]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !point.trim()) return;
    setStories((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        category,
        when: when.trim(),
        where: where.trim(),
        who: who.trim(),
        what: what.trim(),
        spark: spark.trim(),
        point: point.trim(),
        link: link.trim(),
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setTitle('');
    setWhen('');
    setWhere('');
    setWho('');
    setWhat('');
    setSpark('');
    setPoint('');
    setLink('');
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-400">
            <BookMarked className="h-3.5 w-3.5" />
            <span>Your Story Bank · Spark → Point → Link</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Capture real moments you&apos;ve lived through. For vulnerable stories, share your scars—not your wounds.
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500">{stories.length} banked</span>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Working title (e.g., The Night Before Orlando)"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as StoryEntry['category'])}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-yellow-400 focus:outline-none"
        >
          <option value="high-stakes">High-Stakes (Inspire)</option>
          <option value="vulnerable">Vulnerable (Trust · Scars not wounds)</option>
          <option value="humorous">Humorous (Connect)</option>
        </select>

        <input
          type="text"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="When (e.g., 30 mins before the pitch)"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <input
          type="text"
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="Where (e.g., Backstage hallway)"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <input
          type="text"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="Who (specific character & voice)"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <input
          type="text"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="What happened (chain of events)"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <input
          type="text"
          value={spark}
          onChange={(e) => setSpark(e.target.value)}
          placeholder="The Spark (Peak emotion, action, or insight)"
          className="sm:col-span-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <input
          type="text"
          value={point}
          onChange={(e) => setPoint(e.target.value)}
          placeholder="The Point: The reason I'm telling you this is because..."
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="The Link (how it applies to the listener)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-400 focus:border-yellow-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!title.trim() || !point.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-yellow-300 disabled:bg-zinc-800 disabled:text-zinc-400 disabled:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
        </div>
      </form>

      {stories.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {stories.map((story) => (
            <div
              key={story.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      CATEGORY_STYLES[story.category]
                    }`}
                  >
                    {story.category}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-100">{story.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setStories((prev) => prev.filter((s) => s.id !== story.id))}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Delete story"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {story.spark && (
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-200">Spark:</strong> {story.spark}
                </p>
              )}
              <p className="text-xs text-zinc-300">
                <strong className="text-yellow-400">Point:</strong> {story.point}
              </p>
              {story.link && (
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-200">Link:</strong> {story.link}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
