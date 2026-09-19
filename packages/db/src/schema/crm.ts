import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

export const dealStages = ["lead", "qualified", "proposal", "won", "lost"] as const;
export type DealStage = (typeof dealStages)[number];

export const contact = pgTable(
  "crm_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    notes: text("notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("crm_contact_org_idx").on(table.organizationId)],
);

export const deal = pgTable(
  "crm_deal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    stage: text("stage").notNull().default("lead"),
    valueAmount: integer("value_amount"),
    currency: text("currency").notNull().default("LAK"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("crm_deal_org_idx").on(table.organizationId),
    index("crm_deal_contact_idx").on(table.contactId),
  ],
);

export const contactRelations = relations(contact, ({ many }) => ({
  deals: many(deal),
}));

export const dealRelations = relations(deal, ({ one }) => ({
  contact: one(contact, {
    fields: [deal.contactId],
    references: [contact.id],
  }),
}));
