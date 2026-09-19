import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { KanbanBoard } from "./kanban-board";

export default async function CrmBoardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500">
          Please{" "}
          <Link href="/sign-in" className="underline">
            sign in
          </Link>{" "}
          to view the board.
        </p>
      </main>
    );
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
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
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM — Deal Board</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/crm" className="rounded border px-3 py-1.5 underline">
            List view
          </Link>
          <Link href="/" className="text-gray-500 underline">
            Back home
          </Link>
        </nav>
      </header>

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
