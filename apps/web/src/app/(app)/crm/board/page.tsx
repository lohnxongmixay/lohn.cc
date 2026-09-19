import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { KanbanBoard } from "./kanban-board";

export default async function CrmBoardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500">
          No active organization yet.{" "}
          <Link href="/" className="underline">
            Create one
          </Link>{" "}
          first.
        </p>
      </main>
    );
  }

  const deals = await db.query.deal.findMany({
    where: (deal, { eq }) => eq(deal.organizationId, organizationId),
    with: { contact: true },
    orderBy: (deal, { desc }) => [desc(deal.createdAt)],
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">CRM — Deal Board</h1>

      <KanbanBoard
        deals={deals.map((d) => ({
          id: d.id,
          title: d.title,
          stage: d.stage,
          valueAmount: d.valueAmount,
          currency: d.currency,
          contactName: d.contact.name,
        }))}
      />
    </main>
  );
}
