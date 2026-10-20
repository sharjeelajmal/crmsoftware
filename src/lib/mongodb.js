import { MongoClient } from "mongodb";
import dns from "dns";

/**
 * Single MongoDB client for the whole app.
 *
 *   import { getDb, withTransaction } from "@/lib/mongodb";
 *   const db = await getDb();
 *
 * - Client is cached on `globalThis` so Next.js hot reloads don't open new connections.
 * - DB name comes from MONGODB_DB (fallback below) so no route hardcodes it.
 * - mongodb+srv URIs are resolved manually because some networks block SRV lookups.
 */

const DEFAULT_DB_NAME = "crm-software-copy";
const DNS_TIMEOUT_MS = 3000;

export const dbName = () => process.env.MONGODB_DB || DEFAULT_DB_NAME;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);

const resolveSrv = (name) =>
  new Promise((resolve, reject) => dns.resolveSrv(name, (err, addrs) => (err ? reject(err) : resolve(addrs))));

const resolveTxt = (name) =>
  new Promise((resolve, reject) => dns.resolveTxt(name, (err, records) => (err ? reject(err) : resolve(records))));

/** Converts mongodb+srv:// to a plain mongodb:// URI using explicit SRV/TXT lookups. */
async function resolveMongoUri(uri) {
  if (!uri?.startsWith("mongodb+srv://")) return uri;

  const servers = dns.getServers();
  if (servers.length === 0 || (servers.length === 1 && servers[0] === "127.0.0.1")) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }

  const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
  if (!match) return uri;
  const [, user, pass, host, db = "", queryParams = ""] = match;

  try {
    const addresses = await withTimeout(resolveSrv(`_mongodb._tcp.${host}`), DNS_TIMEOUT_MS, "SRV lookup");
    let txtOptions = "authSource=admin";
    try {
      const txt = await withTimeout(resolveTxt(host), DNS_TIMEOUT_MS, "TXT lookup");
      if (txt?.[0]?.[0]) txtOptions = txt[0][0];
    } catch {
      /* keep default authSource */
    }
    const hosts = addresses.map((a) => `${a.name}:${a.port}`).join(",");
    const options = ["ssl=true", txtOptions, queryParams].filter(Boolean).join("&");
    return `mongodb://${user}:${pass}@${hosts}/${db}?${options}`;
  } catch (err) {
    console.error("[mongodb] SRV resolution failed, using original URI:", err.message);
    return uri;
  }
}

async function createClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing environment variable "MONGODB_URI"');
  const client = new MongoClient(await resolveMongoUri(uri));
  return client.connect();
}

/** @returns {Promise<MongoClient>} */
export function getClient() {
  if (!globalThis.__ajCrmMongoClient) {
    globalThis.__ajCrmMongoClient = createClient().catch((err) => {
      globalThis.__ajCrmMongoClient = undefined; // allow retry on next request
      throw err;
    });
  }
  return globalThis.__ajCrmMongoClient;
}

/** @returns {Promise<import("mongodb").Db>} */
export async function getDb() {
  const client = await getClient();
  return client.db(dbName());
}

const TRANSACTIONS_UNSUPPORTED_CODE = 20; // IllegalOperation: standalone server

/**
 * Runs `work(db, session)` inside a transaction when the server supports it
 * (replica set / Atlas). On a standalone server it falls back to running
 * without a session so local development still works.
 */
export async function withTransaction(work) {
  const client = await getClient();
  const db = client.db(dbName());
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(db, session);
    });
    return result;
  } catch (err) {
    if (
      err?.code === TRANSACTIONS_UNSUPPORTED_CODE ||
      /Transaction numbers are only allowed/.test(err?.message || "")
    ) {
      return work(db, undefined);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
