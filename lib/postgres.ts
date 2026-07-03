import "server-only";
import { Pool } from "pg";
import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";

// Reutilizar el pool entre HMR reloads en desarrollo y entre invocaciones
// del mismo lambda en producción. En globalThis evita que cada `next dev`
// hot-reload cree un pool nuevo (otro fuente de connection leak).
const globalForPool = globalThis as unknown as { __pgPool?: Pool };
let pool: Pool | undefined = globalForPool.__pgPool;

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
  // Modo IAM (Cloud SQL Connector) si están las vars, sino fallback directo
  // por host+password (útil para `.env.local` y deploys sin IAM configurado).
  const useIam =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON &&
    !!process.env.INSTANCE_CONNECTION_NAME;

  if (useIam) {
    const auth = new GoogleAuth({
      credentials: getCredentials(),
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/sqlservice.login",
      ],
    });

    const connector = new Connector({ auth });

    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME!,
      ipType: IpAddressTypes.PUBLIC,
      authType: AuthTypes.IAM,
    });

    return new Pool({
      ...clientOpts,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: async () => {
        const client = await auth.getClient();
        const res = await client.getAccessToken();
        const t = typeof res === "string" ? res : res.token;
        if (!t) throw new Error("Failed to obtain IAM access token");
        return t;
      },
      // Serverless en Vercel: cada lambda corre con su propio pool.
      // max=3 permite que las 4 queries del Promise.all del home corran
      // 3 en paralelo (el otro espera ~500ms). Con N lambdas concurrentes
      // el total de conexiones sigue acotado (N × 3, típicamente 10-15
      // bajo carga normal de monitoreo).
      // Pool acotado: max alto saturaba Cloud SQL con queries lentas concurrentes.
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // CLAVE: corta cualquier query que se cuelgue a los 15s. Sin esto, una query
      // lenta corría hasta el límite de la función (300s) -> 504 y home caída.
      statement_timeout: 15_000,
    });
  }

  // Fallback: conexión directa por IP/host con password
  const host = process.env.DB_HOST;
  if (!host) {
    throw new Error(
      "Postgres no configurado: definí DB_HOST/DB_PASS o GOOGLE_APPLICATION_CREDENTIALS_JSON+INSTANCE_CONNECTION_NAME",
    );
  }
  return new Pool({
    host,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
  });
}

// Promesa única para evitar race condition: si dos requests llaman getPool()
// simultáneamente durante el cold start, ambos esperan el MISMO createPool en
// vez de crear dos pools independientes (que duplicarían conexiones).
let poolPromise: Promise<Pool> | undefined;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  if (poolPromise) return poolPromise;
  poolPromise = createPool().then((p) => {
    pool = p;
    globalForPool.__pgPool = p;
    poolPromise = undefined;
    return p;
  }).catch((e) => {
    poolPromise = undefined;
    throw e;
  });
  return poolPromise;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const p = await getPool();
  const res = await p.query(text, params);
  return res.rows as T[];
}
