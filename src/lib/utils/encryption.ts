import crypto from "crypto";

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || "dev-secret-key-32-chars-minimum-for-nexus-ai";
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

// Standard AES-256-CBC encryption
export function encrypt(text: string): string {
  // Enforce 32 byte key length
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(text: string): string {
  const parts = text.split(":");
  const ivHex = parts.shift();
  const encryptedHex = parts.join(":");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted format");

  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
