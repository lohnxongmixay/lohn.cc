"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@lohn/auth";
import { db } from "@lohn/db";
import { contact, deal, dealStages } from "@lohn/db/schema";

async function requireActiveOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not signed in");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new Error("No active organization");
  return { session, organizationId };
}

export async function createContact(formData: FormData) {
  const { session, organizationId } = await requireActiveOrg();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  await db.insert(contact).values({
    organizationId,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    company: String(formData.get("company") ?? "").trim() || null,
    createdBy: session.user.id,
  });

  revalidatePath("/crm");
}

export async function updateDealStage(dealId: string, stage: string) {
  const { organizationId } = await requireActiveOrg();

  if (!(dealStages as readonly string[]).includes(stage)) {
    throw new Error("Invalid stage");
  }

  await db
    .update(deal)
    .set({ stage })
    .where(and(eq(deal.id, dealId), eq(deal.organizationId, organizationId)));

  revalidatePath("/crm/board");
}

export async function createDeal(formData: FormData) {
  const { session, organizationId } = await requireActiveOrg();
  const contactId = String(formData.get("contactId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!contactId || !title) throw new Error("Contact and title are required");

  const valueRaw = formData.get("valueAmount");
  const valueAmount =
    valueRaw && String(valueRaw).trim() !== "" ? Number(valueRaw) : null;

  await db.insert(deal).values({
    organizationId,
    contactId,
    title,
    valueAmount,
    currency: String(formData.get("currency") ?? "LAK").trim() || "LAK",
    createdBy: session.user.id,
  });

  revalidatePath("/crm");
}
