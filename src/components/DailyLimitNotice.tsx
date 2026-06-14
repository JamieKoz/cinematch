export function DailyLimitNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-amber-300/35 bg-amber-950/35 px-4 py-3 text-left ${className}`.trim()}
      role="status"
    >
      <p className="text-sm font-medium text-amber-100">Daily limit reached</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/90">
        You&apos;ve used all your picks for today. Come back tomorrow for a fresh deck.
      </p>
    </div>
  );
}
