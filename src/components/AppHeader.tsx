export function AppHeader({ onClearCache }: { onClearCache: () => void }) {
  return (
    <header className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">CineMatch</h1>
        <details className="group relative">
          <summary className="summary-no-marker list-none cursor-pointer rounded-full border border-white/30 bg-zinc-900/60 p-2 text-sm text-zinc-100 backdrop-blur-md transition hover:border-white/50 hover:bg-zinc-800/70">
            <span className="sr-only">Settings</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317a1.724 1.724 0 0 1 3.35 0 1.724 1.724 0 0 0 2.573 1.066 1.724 1.724 0 0 1 2.49 2.49 1.724 1.724 0 0 0 1.065 2.573 1.724 1.724 0 0 1 0 3.35 1.724 1.724 0 0 0-1.066 2.573 1.724 1.724 0 0 1-2.49 2.49 1.724 1.724 0 0 0-2.573 1.065 1.724 1.724 0 0 1-3.35 0 1.724 1.724 0 0 0-2.573-1.066 1.724 1.724 0 0 1-2.49-2.49 1.724 1.724 0 0 0-1.065-2.573 1.724 1.724 0 0 1 0-3.35 1.724 1.724 0 0 0 1.066-2.573 1.724 1.724 0 0 1 2.49-2.49 1.724 1.724 0 0 0 2.573-1.065Z"
              />
              <circle cx="12" cy="12" r="3.25" />
            </svg>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-white/20 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl">
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-zinc-800/80"
              onClick={onClearCache}
            >
              Clear cache
            </button>
          </div>
        </details>
      </div>
      <div>
        <p className="text-sm text-zinc-300 md:text-base">Find the match for your next film.</p>
      </div>
    </header>
  );
}
