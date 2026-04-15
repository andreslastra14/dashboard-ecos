import "server-only";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export const CODE_TTL_MINUTES = 15;
