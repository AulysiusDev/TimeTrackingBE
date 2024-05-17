require('dotenv').config();
const { drizzle } = require('drizzle-orm/neon-serverless');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const schema = require('../schema/schemas');
const ws = require('ws');
const { Pool, neonConfig } = require('@neondatabase/serverless');

async function performMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return;
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: dbUrl });
  pool.on('error', (err) => console.error(err));

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const db = await drizzle(client, { schema });
    await migrate(db, { migrationsFolder: 'src/migrations' });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  await pool.end();
}

if (require.main === module) {
  console.log('run Migrations!');
  performMigration()
    .then((val) => {
      console.log('Migrations done');
      process.exit(0);
    })
    .catch((err) => {
      console.log('Migrations error');
      console.error(err);
      process.exit(1);
    });
}
