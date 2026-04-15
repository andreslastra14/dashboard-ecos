import "server-only";
import { query } from "../postgres";

export interface ResetRecord {
  email: string;
  code_hash: string;
  expires_at: Date;
  used_at: Date | null;
}

export async function saveResetCode(email: string, codeHash: string, expiresAt: Date): Promise<void> {
  await query(
    `INSERT INTO password_resets (email, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [email.toLowerCase(), codeHash, expiresAt]
  );
}

export async function getLatestActiveReset(email: string): Promise<ResetRecord | null> {
  const rows = await query<{
    email: string;
    code_hash: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT email, code_hash, expires_at, used_at
     FROM password_resets
     WHERE LOWER(email) = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email.toLowerCase()]
  );
  return rows.length ? rows[0] : null;
}

export async function markResetUsed(email: string): Promise<void> {
  await query(
    `UPDATE password_resets SET used_at = NOW()
     WHERE LOWER(email) = $1 AND used_at IS NULL`,
    [email.toLowerCase()]
  );
}
