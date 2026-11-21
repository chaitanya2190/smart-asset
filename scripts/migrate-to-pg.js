require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const PostgresDatabase = require('../src/db/postgres');

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is required for migration.');
    process.exit(1);
  }

  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const assetsFile = path.join(dataDir, 'assets.csv');
  const reservationsFile = path.join(dataDir, 'reservations.csv');

  const db = new PostgresDatabase({ connectionString: dbUrl });

  try {
    console.log('🔄 Initializing PostgreSQL tables...');
    await db.init();

    // Migrate Assets
    if (fs.existsSync(assetsFile)) {
      const assetRecords = parse(fs.readFileSync(assetsFile, 'utf8'), { columns: true });
      console.log(`📦 Migrating ${assetRecords.length} assets from CSV...`);
      for (const a of assetRecords) {
        await db.query(
          `INSERT INTO assets (id, name, category, status, max_duration)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               category = EXCLUDED.category,
               status = EXCLUDED.status,
               max_duration = EXCLUDED.max_duration`,
          [a.id, a.name, a.category, a.status, parseInt(a.maxDuration, 10) || 14]
        );
      }
      console.log(`✅ Assets migrated.`);
    }

    // Migrate Reservations
    if (fs.existsSync(reservationsFile)) {
      const resRecords = parse(fs.readFileSync(reservationsFile, 'utf8'), { columns: true });
      console.log(`📋 Migrating ${resRecords.length} reservations from CSV...`);
      for (const r of resRecords) {
        await db.query(
          `INSERT INTO reservations (id, asset_id, user_id, start_date, end_date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE
           SET status = EXCLUDED.status,
               start_date = EXCLUDED.start_date,
               end_date = EXCLUDED.end_date`,
          [
            r.id,
            r.assetId,
            r.userId,
            new Date(r.startDate).toISOString(),
            new Date(r.endDate).toISOString(),
            r.status || 'APPROVED',
            r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
          ]
        );
      }
      console.log(`✅ Reservations migrated.`);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrate();
