require('dotenv').config();
const PostgresDatabase = require('../src/db/postgres');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not set in environment or .env file.');
    console.error('Example: DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/smart_asset');
    process.exit(1);
  }

  console.log('🔄 Connecting to PostgreSQL database...');
  const db = new PostgresDatabase({ connectionString: dbUrl });

  try {
    await db.init();
    const assets = await db.getAssets();
    const reservations = await db.getReservations();

    console.log('✅ PostgreSQL Schema initialized successfully!');
    console.log(`📦 Loaded Assets in DB: ${assets.length}`);
    console.log(`📋 Loaded Reservations in DB: ${reservations.length}`);
    assets.forEach(a => {
      console.log(`   - [${a.id}] ${a.name} (${a.category}) - ${a.status} (Max ${a.maxDuration}d)`);
    });
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
