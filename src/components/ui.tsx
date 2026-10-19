import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-ink";
export const primaryButton =
  "rounded-md bg-ink px-4 py-2.5 text-base font-medium text-paper disabled:opacity-50";
export const ghostButton =
  "rounded-md border border-line px-4 py-2.5 text-base font-medium disabled:opacity-50";
export const linkButton = "text-base text-muted underline underline-offset-4 disabled:opacity-50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <p role="alert" className="text-base text-over">
      {message}
    </p>
  );
}

export function Loading({ text = "Loading" }: { text?: string }) {
  return <p className="py-6 text-base text-muted">{text}…</p>;
}

export const fmt = (n: number) => Math.round(n).toLocaleString();

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function Gauge({ value, max, tone }: { value: number; max: number; tone: "food" | "water" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full bg-line" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)}>
      <div className={tone === "food" ? "h-full bg-food" : "h-full bg-water"} style={{ width: `${pct}%` }} />
    </div>
  );
}

// USDA brand names arrive in ALL CAPS; show them in sentence case.
export const tidy = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);
