import { pgTable, serial, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountStatusEnum = pgEnum("account_status", [
  "available",
  "in-use",
  "cooling-down",
  "archived",
]);

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  status: accountStatusEnum("status").notNull().default("available"),
  notes: text("notes"),
  tags: text("tags").array().notNull().default([]),
  cooldownDurationHours: real("cooldown_duration_hours"),
  cooldownStartedAt: timestamp("cooldown_started_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
