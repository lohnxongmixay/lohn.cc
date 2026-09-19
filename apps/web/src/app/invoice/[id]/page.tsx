import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@lohn/db";
import { organization } from "@lohn/db/schema";
import { PrintButton } from "./print-button";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const inv = await db.query.invoice.findFirst({
    where: (invoice, { eq }) => eq(invoice.id, id),
    with: { items: true, contact: true },
  });

  if (!inv) notFound();

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, inv.organizationId));

  const total = inv.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceAmount,
    0,
  );

  return (
    <main className="mx-auto max-w-2xl p-8 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <header className="mb-8 flex items-start justify-between border-b pb-6">
        <h1 className="text-2xl font-semibold">{org?.name ?? "Invoice"}</h1>
        <div className="text-right">
          <p className="text-lg font-semibold">{inv.invoiceNumber}</p>
          <p className="text-sm capitalize text-gray-500">{inv.status}</p>
        </div>
      </header>

      <section className="mb-8 flex justify-between text-sm">
        <div>
          <p className="text-gray-500">Billed to</p>
          <p className="font-medium">{inv.contact.name}</p>
          {inv.contact.company && <p>{inv.contact.company}</p>}
          {inv.contact.email && <p>{inv.contact.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-gray-500">Issue date</p>
          <p>{new Date(inv.issueDate).toLocaleDateString()}</p>
          {inv.dueDate && (
            <>
              <p className="mt-2 text-gray-500">Due date</p>
              <p>{new Date(inv.dueDate).toLocaleDateString()}</p>
            </>
          )}
        </div>
      </section>

      <table className="mb-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">
                {item.unitPriceAmount.toLocaleString()}
              </td>
              <td className="py-2 text-right">
                {(item.quantity * item.unitPriceAmount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-48 text-right">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-xl font-semibold">
            {total.toLocaleString()} {inv.currency}
          </p>
        </div>
      </div>

      {inv.notes && <p className="mt-8 text-sm text-gray-500">{inv.notes}</p>}
    </main>
  );
}
