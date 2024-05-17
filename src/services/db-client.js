import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export async function dbClient() {
  const sql = neon(process.env.DATABASE_URL);
  return sql;
}
export async function getDrizzleDbClient() {
  const sql = await dbClient();
  return drizzle(sql);
}
