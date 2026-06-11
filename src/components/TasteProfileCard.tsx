import { summarizeTasteProfile } from "../services/personalizationInsights";
import type { TasteProfile } from "../types";

export function TasteProfileCard({
  profile,
  savedCount,
  ratedCount,
  onClearSignal
}: {
  profile: TasteProfile;
  savedCount: number;
  ratedCount: number;
  onClearSignal?: (type: "genre" | "mood" | "provider", key: string) => void;
}) {
  const summary = summarizeTasteProfile(profile);
  const topGenres = topSignals(profile.genreAffinity);
  const topMoods = topSignals(profile.moodAffinity);
  const topProviders = topSignals(profile.providerAffinity);
  const hasSignals = topGenres.length + topMoods.length + topProviders.length > 0;
  return (
    <section className="profile-panel-enter rounded-2xl p-4">
      <div className="rounded-2xl border border-white/10 p-3">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">Taste summary</p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-100">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-300">
          Saved picks: {savedCount} | Seen: {ratedCount}
        </p>
      </div>
      {onClearSignal ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/35 p-3">
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Adjust taste signals</p>
          <p className="mt-1 text-xs text-zinc-400">Tap a chip to remove that preference from future picks.</p>
          <div className="mt-3 space-y-3">
            <SignalRow title="Top genres" items={topGenres} onClear={(key) => onClearSignal("genre", key)} />
            <SignalRow title="Top moods" items={topMoods} onClear={(key) => onClearSignal("mood", key)} />
            <SignalRow title="Top providers" items={topProviders} onClear={(key) => onClearSignal("provider", key)} />
            {!hasSignals ? <p className="text-xs text-zinc-400">Signals will appear after a few swipes and picks.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function topSignals(signals: Record<string, number>, max = 6): string[] {
  return Object.entries(signals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key]) => key);
}

function SignalRow({
  title,
  items,
  onClear
}: {
  title: string;
  items: string[];
  onClear: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full border border-violet-300/35 bg-violet-500/20 px-2.5 py-1 text-xs text-violet-100 transition hover:bg-violet-500/35 hover:border-violet-300/55 active:scale-90"
            onClick={() => onClear(item)}
            title="Remove this signal"
          >
            {item} ✕
          </button>
        ))}
      </div>
    </div>
  );
}
