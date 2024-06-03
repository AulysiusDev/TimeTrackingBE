import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import schema from "../schema/schemas.js";
import ws from "ws";
import { Pool, neonConfig } from "@neondatabase/serverless";

dotenv.config();

async function performMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not defined in the environment variables."
    );
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: dbUrl });
  pool.on("error", (err) => console.error("Pool error:", err));

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "migrations" });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.main || import.meta.main === undefined) {
  console.log("Running Migrations!");
  performMigration()
    .then(() => {
      console.log("Migrations done");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migrations error");
      process.exit(1);
    });
}

const migrators = {
  performMigration,
};

export default migrators;
