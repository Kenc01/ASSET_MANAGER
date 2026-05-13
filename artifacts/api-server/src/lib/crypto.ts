import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? "dev-fallback-secret-key-32chars!";
  return scryptSync(secret, "dev-account-manager-salt", 32) as Buffer;
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPassword(stored: string): string {
  try {
    const [ivHex, encryptedHex] = stored.split(":");
    if (!ivHex || !encryptedHex) return "[legacy — re-enter password]";
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "[legacy — re-enter password]";
  }
}
