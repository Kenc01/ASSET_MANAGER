import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  ListAccountsQueryParams,
  CreateAccountBody,
  UpdateAccountBody,
  UpdateAccountStatusBody,
  StartCooldownBody,
  ImportAccountsBody,
} from "@workspace/api-zod";

const router = Router();

function encryptPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function computeCooldownEndsAt(
  cooldownStartedAt: Date | null | undefined,
  cooldownDurationHours: number | null | undefined
): Date | null {
  if (!cooldownStartedAt || !cooldownDurationHours) return null;
  return new Date(cooldownStartedAt.getTime() + cooldownDurationHours * 60 * 60 * 1000);
}

function formatAccount(acc: typeof accountsTable.$inferSelect) {
  const cooldownEndsAt = computeCooldownEndsAt(
    acc.cooldownStartedAt,
    acc.cooldownDurationHours
  );

  return {
    id: acc.id,
    email: acc.email,
    status: acc.status,
    notes: acc.notes ?? null,
    tags: acc.tags ?? [],
    cooldownDurationHours: acc.cooldownDurationHours ?? null,
    cooldownStartedAt: acc.cooldownStartedAt?.toISOString() ?? null,
    cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
    lastUsedAt: acc.lastUsedAt?.toISOString() ?? null,
    createdAt: acc.createdAt.toISOString(),
    updatedAt: acc.updatedAt.toISOString(),
  };
}

router.get("/accounts/stats", async (req, res) => {
  const accounts = await db.select().from(accountsTable);
  const now = new Date();

  let available = 0, inUse = 0, coolingDown = 0, archived = 0, readySoon = 0;

  for (const acc of accounts) {
    if (acc.status === "available") available++;
    else if (acc.status === "in-use") inUse++;
    else if (acc.status === "cooling-down") {
      coolingDown++;
      const endsAt = computeCooldownEndsAt(acc.cooldownStartedAt, acc.cooldownDurationHours);
      if (endsAt) {
        const minutesLeft = (endsAt.getTime() - now.getTime()) / 60000;
        if (minutesLeft <= 60) readySoon++;
      }
    } else if (acc.status === "archived") archived++;
  }

  res.json({ total: accounts.length, available, inUse, coolingDown, archived, readySoon });
});

router.get("/accounts/export", async (req, res) => {
  const accounts = await db.select().from(accountsTable);
  const exported = accounts.map((acc) => ({
    email: acc.email,
    password: "[encrypted]",
    notes: acc.notes ?? null,
    tags: acc.tags ?? [],
    cooldownDurationHours: acc.cooldownDurationHours ?? null,
    status: acc.status,
  }));
  res.json(exported);
});

router.post("/accounts/import", async (req, res) => {
  const parsed = ImportAccountsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of parsed.data.accounts) {
    try {
      const password =
        item.password && item.password !== "[encrypted]"
          ? item.password
          : Math.random().toString(36).slice(2);
      await db.insert(accountsTable).values({
        email: item.email,
        passwordEncrypted: encryptPassword(password),
        status: (item.status as typeof accountsTable.$inferInsert["status"]) ?? "available",
        notes: item.notes ?? null,
        tags: item.tags ?? [],
        cooldownDurationHours: item.cooldownDurationHours ?? null,
        updatedAt: new Date(),
      });
      imported++;
    } catch {
      skipped++;
      errors.push(`Failed to import ${item.email}`);
    }
  }

  res.json({ imported, skipped, errors });
});

router.get("/accounts", async (req, res) => {
  const query = ListAccountsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;
  const statusFilter = query.success ? query.data.status : undefined;
  const tagFilter = query.success ? query.data.tag : undefined;
  const sort = query.success ? query.data.sort : undefined;

  let accounts = await db.select().from(accountsTable);

  if (search) {
    const lower = search.toLowerCase();
    accounts = accounts.filter(
      (a) =>
        a.email.toLowerCase().includes(lower) ||
        (a.tags ?? []).some((t: string) => t.toLowerCase().includes(lower))
    );
  }

  if (statusFilter) {
    accounts = accounts.filter((a) => a.status === statusFilter);
  }

  if (tagFilter) {
    accounts = accounts.filter((a) => (a.tags ?? []).includes(tagFilter));
  }

  if (sort === "recently-used") {
    accounts.sort((a, b) => {
      const ta = a.lastUsedAt?.getTime() ?? 0;
      const tb = b.lastUsedAt?.getTime() ?? 0;
      return tb - ta;
    });
  } else if (sort === "ready-first") {
    const statusOrder: Record<string, number> = {
      available: 0,
      "in-use": 1,
      "cooling-down": 2,
      archived: 3,
    };
    accounts.sort(
      (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    );
  } else if (sort === "cooldown-ending-soon") {
    accounts.sort((a, b) => {
      const ea = computeCooldownEndsAt(a.cooldownStartedAt, a.cooldownDurationHours);
      const eb = computeCooldownEndsAt(b.cooldownStartedAt, b.cooldownDurationHours);
      return (ea?.getTime() ?? Infinity) - (eb?.getTime() ?? Infinity);
    });
  } else {
    accounts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  res.json(accounts.map(formatAccount));
});

router.post("/accounts", async (req, res) => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error });
    return;
  }

  const { email, password, notes, tags, cooldownDurationHours } = parsed.data;

  const [created] = await db
    .insert(accountsTable)
    .values({
      email,
      passwordEncrypted: encryptPassword(password),
      status: "available",
      notes: notes ?? null,
      tags: tags ?? [],
      cooldownDurationHours: cooldownDurationHours ?? null,
      updatedAt: new Date(),
    })
    .returning();

  res.status(201).json(formatAccount(created!));
});

router.get("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!acc) { res.status(404).json({ error: "Not found" }); return; }

  res.json(formatAccount(acc));
});

router.patch("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { email, password, notes, tags, cooldownDurationHours } = parsed.data;

  const updates: Partial<typeof accountsTable.$inferInsert> = { updatedAt: new Date() };
  if (email !== undefined) updates.email = email;
  if (password !== undefined) updates.passwordEncrypted = encryptPassword(password);
  if (notes !== undefined) updates.notes = notes;
  if (tags !== undefined) updates.tags = tags;
  if (cooldownDurationHours !== undefined) updates.cooldownDurationHours = cooldownDurationHours;

  const [updated] = await db
    .update(accountsTable)
    .set(updates)
    .where(eq(accountsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.delete("/accounts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(accountsTable)
    .where(eq(accountsTable.id, id))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).send();
});

router.patch("/accounts/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateAccountStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const [updated] = await db
    .update(accountsTable)
    .set({ status: parsed.data.status as typeof accountsTable.$inferInsert["status"], updatedAt: new Date() })
    .where(eq(accountsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.post("/accounts/:id/cooldown", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = StartCooldownBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(accountsTable)
    .set({
      status: "cooling-down",
      cooldownDurationHours: parsed.data.durationHours,
      cooldownStartedAt: now,
      updatedAt: now,
    })
    .where(eq(accountsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.delete("/accounts/:id/cooldown", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(accountsTable)
    .set({
      status: "available",
      cooldownStartedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(accountsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.post("/accounts/:id/use", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const now = new Date();
  const [updated] = await db
    .update(accountsTable)
    .set({ status: "in-use", lastUsedAt: now, updatedAt: now })
    .where(eq(accountsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

export default router;
