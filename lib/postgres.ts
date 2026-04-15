import "server-only";
import { Pool } from "pg";
import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";

let pool: Pool | undefined;

function getCredentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON");
  }
}

async function createPool(): Promise<Pool> {
  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  if (!instanceConnectionName) {
    throw new Error("INSTANCE_CONNECTION_NAME is not set");
  }

  const auth = new GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const loginAuth = new GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/sqlservice.login"],
  });

  const connector = new Connector({ auth });

  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });

  const authClient = await loginAuth.getClient();
  const tokenRes = await authClient.getAccessToken();
  const token = typeof tokenRes === "string" ? tokenRes : tokenRes.token;
  if (!token) throw new Error("Failed to obtain IAM access token");

  return new Pool({
    ...clientOpts,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: token,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  pool = await createPool();
  return pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const p = await getPool();
  const res = await p.query(text, params);
  return res.rows as T[];
}
