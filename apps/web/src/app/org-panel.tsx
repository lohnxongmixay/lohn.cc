"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function OrgPanel() {
  const { data: organizations, isPending, refetch } = authClient.useListOrganizations();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await authClient.organization.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    setCreating(false);
    setName("");
    refetch();
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Your organizations</h2>
        {isPending && <p className="text-sm text-gray-400">Loading…</p>}
        {!isPending && organizations?.length === 0 && (
          <p className="text-sm text-gray-400">No organizations yet — create one below.</p>
        )}
        <ul className="flex flex-col gap-2">
          {organizations?.map((org) => (
            <li key={org.id} className="rounded border px-3 py-2 text-sm">
              {org.name}
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="New organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>
    </section>
  );
}
