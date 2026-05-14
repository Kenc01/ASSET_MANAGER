import { Router } from "express";
import { AccountModel } from "../lib/mongodb";
import { encryptPassword, decryptPassword } from "../lib/crypto";
import {
  ListAccountsQueryParams,
  CreateAccountBody,
  UpdateAccountBody,
  UpdateAccountStatusBody,
  StartCooldownBody,
  ImportAccountsBody,
} from "@workspace/api-zod";

const router = Router();

function computeCooldownEndsAt(
  cooldownStartedAt: Date | null | undefined,
  cooldownDurationHours: number | null | undefined
): Date | null {
  if (!cooldownStartedAt || !cooldownDurationHours) return null;
  return new Date(cooldownStartedAt.getTime() + cooldownDurationHours * 60 * 60 * 1000);
}

function formatAccount(acc: any) {
  const cooldownEndsAt = computeCooldownEndsAt(acc.cooldownStartedAt, acc.cooldownDurationHours);
  return {
    id: acc._id.toString(),
    email: acc.email,
    password: decryptPassword(acc.passwordEncrypted),
    useCount: acc.useCount ?? 0,
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
  const accounts = await AccountModel.find();
  const now = new Date();
  let available = 0, inUse = 0, coolingDown = 0, archived = 0, readySoon = 0;
  for (const acc of accounts) {
    if (acc.status === "available") available++;
    else if (acc.status === "in-use") inUse++;
    else if (acc.status === "cooling-down") {
      coolingDown++;
      const endsAt = computeCooldownEndsAt(acc.cooldownStartedAt, acc.cooldownDurationHours);
      if (endsAt && (endsAt.getTime() - now.getTime()) / 60000 <= 60) readySoon++;
    } else if (acc.status === "archived") archived++;
  }
  res.json({ total: accounts.length, available, inUse, coolingDown, archived, readySoon });
});

router.get("/accounts/export", async (req, res) => {
  const accounts = await AccountModel.find();
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
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const item of parsed.data.accounts) {
    try {
      const password =
        item.password && item.password !== "[encrypted]"
          ? item.password
          : Math.random().toString(36).slice(2);
      await AccountModel.create({
        email: item.email,
        passwordEncrypted: encryptPassword(password),
        status: item.status ?? "available",
        notes: item.notes ?? null,
        tags: item.tags ?? [],
        cooldownDurationHours: item.cooldownDurationHours ?? null,
      });
      imported++;
    } catch {
      skipped++;
      errors.push(`Failed to import ${item.email}`);
    }
  }
  res.json({ imported, skipped, errors });
});

router.get("/accounts/analytics", async (req, res) => {
  const accounts = await AccountModel.find();
  const totalUses = accounts.reduce((sum, a) => sum + (a.useCount ?? 0), 0);
  const statusCounts: Record<string, number> = {};
  for (const a of accounts) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }
  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const topAccounts = [...accounts]
    .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0))
    .slice(0, 8)
    .map((a) => ({ id: a._id.toString(), email: a.email, useCount: a.useCount ?? 0, status: a.status }));
  const tagCounts: Record<string, number> = {};
  for (const a of accounts) {
    for (const tag of a.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const tagDistribution = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const cooldownAccounts = accounts.filter((a) => a.cooldownDurationHours != null);
  const averageCooldownHours =
    cooldownAccounts.length > 0
      ? cooldownAccounts.reduce((sum, a) => sum + (a.cooldownDurationHours ?? 0), 0) / cooldownAccounts.length
      : null;
  res.json({ totalUses, totalAccounts: accounts.length, averageCooldownHours, statusDistribution, topAccounts, tagDistribution });
});

router.get("/accounts", async (req, res) => {
  const query = ListAccountsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;
  const statusFilter = query.success ? query.data.status : undefined;
  const tagFilter = query.success ? query.data.tag : undefined;
  const sort = query.success ? query.data.sort : undefined;

  const filter: Record<string, any> = {};
  if (statusFilter) filter.status = statusFilter;
  if (tagFilter) filter.tags = tagFilter;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  let accounts = await AccountModel.find(filter);

  if (sort === "recently-used") {
    accounts.sort((a, b) => (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0));
  } else if (sort === "ready-first") {
    const order: Record<string, number> = { available: 0, "in-use": 1, "cooling-down": 2, archived: 3 };
    accounts.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
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
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error }); return; }

  const { email, password, notes, tags, cooldownDurationHours } = parsed.data;
  const created = await AccountModel.create({
    email,
    passwordEncrypted: encryptPassword(password),
    status: "available",
    notes: notes ?? null,
    tags: tags ?? [],
    cooldownDurationHours: cooldownDurationHours ?? null,
  });
  res.status(201).json(formatAccount(created));
});

router.get("/accounts/:id", async (req, res) => {
  const acc = await AccountModel.findById(req.params.id).catch(() => null);
  if (!acc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(acc));
});

router.patch("/accounts/:id", async (req, res) => {
  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const { email, password, notes, tags, cooldownDurationHours } = parsed.data;
  const updates: Record<string, any> = {};
  if (email !== undefined) updates.email = email;
  if (password !== undefined) updates.passwordEncrypted = encryptPassword(password);
  if (notes !== undefined) updates.notes = notes;
  if (tags !== undefined) updates.tags = tags;
  if (cooldownDurationHours !== undefined) updates.cooldownDurationHours = cooldownDurationHours;

  const updated = await AccountModel.findByIdAndUpdate(req.params.id, updates, { new: true }).catch(() => null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.delete("/accounts/:id", async (req, res) => {
  const deleted = await AccountModel.findByIdAndDelete(req.params.id).catch(() => null);
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

router.patch("/accounts/:id/status", async (req, res) => {
  const parsed = UpdateAccountStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const updated = await AccountModel.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true }
  ).catch(() => null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.post("/accounts/:id/cooldown", async (req, res) => {
  const parsed = StartCooldownBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const updated = await AccountModel.findByIdAndUpdate(
    req.params.id,
    {
      status: "cooling-down",
      cooldownDurationHours: parsed.data.durationHours,
      cooldownStartedAt: new Date(),
    },
    { new: true }
  ).catch(() => null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.delete("/accounts/:id/cooldown", async (req, res) => {
  const updated = await AccountModel.findByIdAndUpdate(
    req.params.id,
    { status: "available", cooldownStartedAt: null },
    { new: true }
  ).catch(() => null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

router.post("/accounts/:id/use", async (req, res) => {
  const updated = await AccountModel.findByIdAndUpdate(
    req.params.id,
    { status: "in-use", lastUsedAt: new Date(), $inc: { useCount: 1 } },
    { new: true }
  ).catch(() => null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatAccount(updated));
});

export default router;
