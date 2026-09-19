import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { contact } from "@lohn/db/schema";
import { createInvoice, addInvoiceItem, updateInvoiceStatus } from "./actions";

export default async function ErpPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500">
          Please{" "}
          <Link href="/sign-in" className="underline">
            sign in
          </Link>{" "}
          to view the ERP.
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

  const [invoices, contacts] = await Promise.all([
    db.query.invoice.findMany({
      where: (invoice, { eq }) => eq(invoice.organizationId, organizationId),
      with: { items: true, contact: true },
      orderBy: (invoice, { desc }) => [desc(invoice.createdAt)],
    }),
    db
      .select()
      .from(contact)
      .where(eq(contact.organizationId, organizationId))
      .orderBy(contact.name),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ERP — Invoices</h1>
        <Link href="/" className="text-sm text-gray-500 underline">
          Back home
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        {invoices.length === 0 && (
          <p className="text-sm text-gray-400">No invoices yet.</p>
        )}
        {invoices.map((inv) => {
          const total = inv.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPriceAmount,
            0,
          );
          return (
            <div key={inv.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{inv.invoiceNumber}</span>
                  <span className="text-gray-500"> · {inv.contact.name}</span>
                  <span className="text-gray-500"> · {inv.status}</span>
                </div>
                <span className="font-medium">
                  {total.toLocaleString()} {inv.currency}
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                {inv.items.map((item) => (
                  <li key={item.id}>
                    {item.description} — {item.quantity} ×{" "}
                    {item.unitPriceAmount.toLocaleString()} {inv.currency}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={addInvoiceItem} className="flex flex-wrap gap-2">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input
                    name="description"
                    placeholder="Item description"
                    required
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    name="quantity"
                    type="number"
                    defaultValue={1}
                    className="w-16 rounded border px-2 py-1 text-sm"
                  />
                  <input
                    name="unitPriceAmount"
                    type="number"
                    placeholder="Unit price"
                    className="w-28 rounded border px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded border px-2 py-1 text-sm">
                    Add item
                  </button>
                </form>
                <form action={updateInvoiceStatus} className="flex gap-2">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <select
                    name="status"
                    defaultValue={inv.status}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="draft">draft</option>
                    <option value="sent">sent</option>
                    <option value="paid">paid</option>
                    <option value="void">void</option>
                  </select>
                  <button type="submit" className="rounded border px-2 py-1 text-sm">
                    Update status
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500">New invoice</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400">
            Add a{" "}
            <Link href="/crm" className="underline">
              contact
            </Link>{" "}
            first before creating an invoice.
          </p>
        ) : (
          <form action={createInvoice} className="flex flex-wrap gap-2">
            <select name="contactId" required className="rounded border px-3 py-2 text-sm">
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="description"
              placeholder="First line item"
              required
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="quantity"
              type="number"
              defaultValue={1}
              className="w-20 rounded border px-3 py-2 text-sm"
            />
            <input
              name="unitPriceAmount"
              type="number"
              placeholder="Unit price"
              className="w-28 rounded border px-3 py-2 text-sm"
            />
            <input name="dueDate" type="date" className="rounded border px-3 py-2 text-sm" />
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white"
            >
              Create invoice
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
