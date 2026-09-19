import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { contact, deal } from "@lohn/db/schema";
import { createContact, createDeal } from "./actions";

export default async function CrmPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-gray-500">
          Please{" "}
          <Link href="/sign-in" className="underline">
            sign in
          </Link>{" "}
          to view the CRM.
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

  const [contacts, deals] = await Promise.all([
    db
      .select()
      .from(contact)
      .where(eq(contact.organizationId, organizationId))
      .orderBy(contact.createdAt),
    db
      .select()
      .from(deal)
      .where(eq(deal.organizationId, organizationId))
      .orderBy(deal.createdAt),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/crm/board" className="rounded border px-3 py-1.5 underline">
            Board view
          </Link>
          <Link href="/" className="text-gray-500 underline">
            Back home
          </Link>
        </nav>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500">Contacts</h2>
        <ul className="flex flex-col gap-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded border px-3 py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              {c.company && <span className="text-gray-500"> — {c.company}</span>}
              {c.email && <span className="text-gray-500"> · {c.email}</span>}
            </li>
          ))}
          {contacts.length === 0 && (
            <p className="text-sm text-gray-400">No contacts yet.</p>
          )}
        </ul>
        <form action={createContact} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            name="company"
            placeholder="Company"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-black px-3 py-2 text-sm text-white"
          >
            Add contact
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-500">Deals</h2>
        <ul className="flex flex-col gap-2">
          {deals.map((d) => {
            const c = contacts.find((c) => c.id === d.contactId);
            return (
              <li key={d.id} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">{d.title}</span>
                <span className="text-gray-500"> · {c?.name ?? "unknown contact"}</span>
                <span className="text-gray-500"> · {d.stage}</span>
                {d.valueAmount != null && (
                  <span className="text-gray-500">
                    {" "}
                    · {d.valueAmount} {d.currency}
                  </span>
                )}
              </li>
            );
          })}
          {deals.length === 0 && (
            <p className="text-sm text-gray-400">No deals yet.</p>
          )}
        </ul>
        {contacts.length > 0 ? (
          <form action={createDeal} className="flex flex-wrap gap-2">
            <select
              name="contactId"
              required
              className="rounded border px-3 py-2 text-sm"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="title"
              placeholder="Deal title"
              required
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="valueAmount"
              type="number"
              placeholder="Value"
              className="w-28 rounded border px-3 py-2 text-sm"
            />
            <input
              name="currency"
              placeholder="LAK"
              defaultValue="LAK"
              className="w-20 rounded border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-black px-3 py-2 text-sm text-white"
            >
              Add deal
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">
            Add a contact first before creating a deal.
          </p>
        )}
      </section>
    </main>
  );
}
