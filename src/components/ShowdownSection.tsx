import { ShowdownChoiceCard } from "./ShowdownChoiceCard";
import type { Title } from "../types";

export function ShowdownSection({
  left,
  right,
  onPickLeft,
  onPickRight,
  onShowMoreLeft,
  onShowMoreRight
}: {
  left: Title;
  right: Title;
  onPickLeft: () => void;
  onPickRight: () => void;
  onShowMoreLeft: () => void;
  onShowMoreRight: () => void;
}) {
  return (
    <section className="rounded-3xl border border-white/20 bg-zinc-900/55 p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="text-xl font-semibold">Final showdown</h2>
      <p className="mt-2 text-sm text-zinc-300">Pick one. Use “Show more” for description and full details.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ShowdownChoiceCard title={left} onPick={onPickLeft} onShowMore={onShowMoreLeft} />
        <ShowdownChoiceCard title={right} onPick={onPickRight} onShowMore={onShowMoreRight} />
      </div>
    </section>
  );
}
