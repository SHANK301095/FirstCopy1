"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600">{error.message}</p>
      <button
        className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white"
        onClick={() => reset()}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
