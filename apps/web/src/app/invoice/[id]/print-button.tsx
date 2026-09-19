"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded border px-3 py-1.5 text-sm underline"
    >
      Print / Save as PDF
    </button>
  );
}
