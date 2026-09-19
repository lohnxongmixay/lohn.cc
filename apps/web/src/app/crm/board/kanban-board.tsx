"use client";

import { useState, useTransition } from "react";
import { updateDealStage } from "../actions";

const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

type DealCard = {
  id: string;
  title: string;
  stage: string;
  valueAmount: number | null;
  currency: string;
  contactName: string;
};

export function KanbanBoard({ deals }: { deals: DealCard[] }) {
  const [items, setItems] = useState(deals);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(stage: string) {
    if (!draggingId) return;
    const dealId = draggingId;
    const previousStage = items.find((d) => d.id === dealId)?.stage;
    setDraggingId(null);

    if (previousStage === stage) return;

    setItems((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage } : d)));

    startTransition(() => {
      updateDealStage(dealId, stage).catch(() => {
        setItems((prev) =>
          prev.map((d) =>
            d.id === dealId && previousStage ? { ...d, stage: previousStage } : d,
          ),
        );
      });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {STAGES.map((s) => {
        const columnDeals = items.filter((d) => d.stage === s.key);
        const columnTotal = columnDeals.reduce(
          (sum, d) => sum + (d.valueAmount ?? 0),
          0,
        );
        return (
          <div
            key={s.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(s.key)}
            className="flex min-h-[220px] flex-col gap-2 rounded border bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">{s.label}</h2>
              <span className="text-xs text-gray-400">{columnDeals.length}</span>
            </div>
            {columnTotal > 0 && (
              <p className="text-xs text-gray-400">
                {columnTotal.toLocaleString()} total
              </p>
            )}
            <div className="flex flex-col gap-2">
              {columnDeals.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDraggingId(d.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className="cursor-grab rounded border bg-white p-2 text-sm shadow-sm active:cursor-grabbing"
                >
                  <div className="font-medium">{d.title}</div>
                  <div className="text-gray-500">{d.contactName}</div>
                  {d.valueAmount != null && (
                    <div className="text-gray-500">
                      {d.valueAmount.toLocaleString()} {d.currency}
                    </div>
                  )}
                </div>
              ))}
              {columnDeals.length === 0 && (
                <p className="text-xs text-gray-300">No deals</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
