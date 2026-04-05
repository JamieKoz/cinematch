import { TitleCard } from "./TitleCard";
import type { Title } from "../types";

export function ResultSection({
  winner,
  backup,
  onWatchNow,
  onPickAnother
}: {
  winner: Title;
  backup?: Title;
  onWatchNow: () => void;
  onPickAnother: () => void;
}) {
  return (
    <section className="rounded-3xl border border-white/20 bg-zinc-900/55 p-5 shadow-2xl backdrop-blur-xl">
      <TitleCard title={winner} />
      {backup ? <p className="mt-2 text-sm text-zinc-300">Backup option: {backup.name}</p> : null}
      <div className="mt-4 flex gap-3">
        <button
          className="rounded-full border border-emerald-300/55 bg-emerald-900/45 px-4 py-2 text-sm transition hover:bg-emerald-800/55"
          onClick={onWatchNow}
        >
          Watch now
        </button>
        <button
          className="rounded-full border border-white/30 bg-zinc-900/60 px-4 py-2 text-sm transition hover:border-white/50 hover:bg-zinc-800/75"
          onClick={onPickAnother}
        >
          Pick another
        </button>
      </div>
    </section>
  );
}
