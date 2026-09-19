"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { invoice, invoiceItem, invoiceStatuses } from "@lohn/db/schema";

async function requireActiveOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not signed in");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new Error("No active organization");
  return { session, organizationId };
}

export async function createInvoice(formData: FormData) {
  const { session, organizationId } = await requireActiveOrg();
  const contactId = String(formData.get("contactId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1) || 1;
  const unitPriceAmount = Number(formData.get("unitPriceAmount") ?? 0) || 0;
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  if (!contactId || !description) {
    throw new Error("Contact and description are required");
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(invoice)
    .where(eq(invoice.organizationId, organizationId));
  const invoiceNumber = `INV-${String(existingCount + 1).padStart(4, "0")}`;

  const [created] = await db
    .insert(invoice)
    .values({
      organizationId,
      contactId,
      invoiceNumber,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      createdBy: session.user.id,
    })
    .returning();

  await db.insert(invoiceItem).values({
    invoiceId: created.id,
    description,
    quantity,
    unitPriceAmount,
  });

  revalidatePath("/erp");
}

export async function addInvoiceItem(formData: FormData) {
  const { organizationId } = await requireActiveOrg();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1) || 1;
  const unitPriceAmount = Number(formData.get("unitPriceAmount") ?? 0) || 0;

  if (!invoiceId || !description) throw new Error("Description is required");

  const [existing] = await db
    .select({ id: invoice.id })
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.organizationId, organizationId)));
  if (!existing) throw new Error("Invoice not found");

  await db.insert(invoiceItem).values({ invoiceId, description, quantity, unitPriceAmount });

  revalidatePath("/erp");
}

export async function updateInvoiceStatus(formData: FormData) {
  const { organizationId } = await requireActiveOrg();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!invoiceId || !(invoiceStatuses as readonly string[]).includes(status)) {
    throw new Error("Invalid status");
  }

  await db
    .update(invoice)
    .set({ status })
    .where(and(eq(invoice.id, invoiceId), eq(invoice.organizationId, organizationId)));

  revalidatePath("/erp");
}
