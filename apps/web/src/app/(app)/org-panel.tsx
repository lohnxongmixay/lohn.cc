"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function OrgPanel() {
  const router = useRouter();
  const { data: organizations, isPending, refetch } = authClient.useListOrganizations();
  const { data: activeOrg, isPending: activePending } = authClient.useActiveOrganization();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isPending &&
      !activePending &&
      !activeOrg &&
      organizations &&
      organizations.length > 0
    ) {
      authClient.organization
        .setActive({ organizationId: organizations[0].id })
        .then(() => router.refresh());
    }
  }, [isPending, activePending, activeOrg, organizations, router]);

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
    router.refresh();
  }

  async function handleSwitch(organizationId: string) {
    setSwitching(organizationId);
    await authClient.organization.setActive({ organizationId });
    setSwitching(null);
    router.refresh();
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
          {organizations?.map((org) => {
            const isActive = activeOrg?.id === org.id;
            return (
              <li
                key={org.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>
                  {org.name}
                  {isActive && (
                    <span className="ml-2 text-xs text-green-600">(active)</span>
                  )}
                </span>
                {!isActive && (
                  <button
                    onClick={() => handleSwitch(org.id)}
                    disabled={switching === org.id}
                    className="text-xs underline disabled:opacity-50"
                  >
                    {switching === org.id ? "Switching…" : "Switch"}
                  </button>
                )}
              </li>
            );
          })}
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
