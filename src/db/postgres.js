const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class PostgresDatabase {
  constructor(options = {}) {
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.pool = new Pool(
      this.connectionString
        ? { connectionString: this.connectionString }
        : {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432', 10),
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
            database: process.env.PGDATABASE || 'smart_asset'
          }
    );
    this.initialized = false;
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async init() {
    if (this.initialized) return;

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const ddl = fs.readFileSync(schemaPath, 'utf8');
      await this.pool.query(ddl);
    }

    // Seed initial assets if table is empty
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS count FROM assets');
    if (rows[0].count === 0) {
      const defaultAssets = [
        ['A1', 'MacBook Pro 16"', 'Computing', 'AVAILABLE', 14],
        ['A2', 'Dell UltraSharp 27"', 'Displays', 'AVAILABLE', 30],
        ['A3', 'Sony A7III Camera', 'Photography', 'MAINTENANCE', 7],
        ['A4', 'iPad Pro', 'Computing', 'AVAILABLE', 14]
      ];
      for (const [id, name, category, status, maxDuration] of defaultAssets) {
        await this.pool.query(
          `INSERT INTO assets (id, name, category, status, max_duration)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [id, name, category, status, maxDuration]
        );
      }
    }

    this.initialized = true;
  }

  async getAssets() {
    await this.init();
    const query = `
      SELECT id, name, category, status, max_duration AS "maxDuration"
      FROM assets
      ORDER BY NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int ASC, id ASC
    `;
    const { rows } = await this.pool.query(query);
    return rows;
  }

  async getAssetById(id) {
    await this.init();
    const query = `
      SELECT id, name, category, status, max_duration AS "maxDuration"
      FROM assets
      WHERE id = $1
    `;
    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async addAsset(assetData) {
    await this.init();
    const nextIdRes = await this.pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int), 0) + 1 AS next_id FROM assets`
    );
    const newId = `A${nextIdRes.rows[0].next_id}`;
    const duration = parseInt(assetData.maxDuration, 10) || 14;

    const query = `
      INSERT INTO assets (id, name, category, status, max_duration)
      VALUES ($1, $2, $3, 'AVAILABLE', $4)
      RETURNING id, name, category, status, max_duration AS "maxDuration"
    `;
    const { rows } = await this.pool.query(query, [newId, assetData.name, assetData.category, duration]);
    return rows[0];
  }

  async removeAsset(id) {
    await this.init();
    const result = await this.pool.query('DELETE FROM assets WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async toggleMaintenance(id) {
    await this.init();
    const query = `
      UPDATE assets
      SET status = CASE WHEN status = 'MAINTENANCE' THEN 'AVAILABLE' ELSE 'MAINTENANCE' END
      WHERE id = $1
      RETURNING id, name, category, status, max_duration AS "maxDuration"
    `;
    const { rows } = await this.pool.query(query, [id]);
    return rows[0] || null;
  }

  async getReservations() {
    await this.init();
    const query = `
      SELECT id, asset_id AS "assetId", user_id AS "userId",
             start_date AS "startDate", end_date AS "endDate",
             status, created_at AS "createdAt"
      FROM reservations
      ORDER BY created_at DESC
    `;
    const { rows } = await this.pool.query(query);
    return rows.map(r => ({
      ...r,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      createdAt: new Date(r.createdAt)
    }));
  }

  async getReservationsByUser(userId) {
    await this.init();
    const query = `
      SELECT id, asset_id AS "assetId", user_id AS "userId",
             start_date AS "startDate", end_date AS "endDate",
             status, created_at AS "createdAt"
      FROM reservations
      WHERE user_id = $1 AND status != 'CANCELLED'
      ORDER BY created_at DESC
    `;
    const { rows } = await this.pool.query(query, [userId]);
    return rows.map(r => ({
      ...r,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      createdAt: new Date(r.createdAt)
    }));
  }

  async getReservationsByAsset(assetId) {
    await this.init();
    const query = `
      SELECT id, asset_id AS "assetId", user_id AS "userId",
             start_date AS "startDate", end_date AS "endDate",
             status, created_at AS "createdAt"
      FROM reservations
      WHERE asset_id = $1
      ORDER BY created_at DESC
    `;
    const { rows } = await this.pool.query(query, [assetId]);
    return rows.map(r => ({
      ...r,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      createdAt: new Date(r.createdAt)
    }));
  }

  async getReservationById(id) {
    await this.init();
    const query = `
      SELECT id, asset_id AS "assetId", user_id AS "userId",
             start_date AS "startDate", end_date AS "endDate",
             status, created_at AS "createdAt"
      FROM reservations
      WHERE id = $1
    `;
    const { rows } = await this.pool.query(query, [id]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      startDate: new Date(rows[0].startDate),
      endDate: new Date(rows[0].endDate),
      createdAt: new Date(rows[0].createdAt)
    };
  }

  async hasDateOverlap(assetId, startDate, endDate) {
    await this.init();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const query = `
      SELECT 1 FROM reservations
      WHERE asset_id = $1
        AND status NOT IN ('CANCELLED', 'RETURNED')
        AND $2::timestamptz < end_date
        AND $3::timestamptz > start_date
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [assetId, start.toISOString(), end.toISOString()]);
    return rows.length > 0;
  }

  async createReservation(reservation) {
    await this.init();
    const nextIdRes = await this.pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int), 0) + 1 AS next_id FROM reservations`
    );
    const newId = `R${nextIdRes.rows[0].next_id}`;
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const status = reservation.status || 'APPROVED';

    const query = `
      INSERT INTO reservations (id, asset_id, user_id, start_date, end_date, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, asset_id AS "assetId", user_id AS "userId",
                start_date AS "startDate", end_date AS "endDate",
                status, created_at AS "createdAt"
    `;
    const { rows } = await this.pool.query(query, [
      newId,
      reservation.assetId,
      reservation.userId,
      start.toISOString(),
      end.toISOString(),
      status
    ]);

    return {
      ...rows[0],
      startDate: new Date(rows[0].startDate),
      endDate: new Date(rows[0].endDate),
      createdAt: new Date(rows[0].createdAt)
    };
  }

  async cancelReservation(id) {
    await this.init();
    const result = await this.pool.query(
      `UPDATE reservations SET status = 'CANCELLED' WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  async updateReservationStatus(id, status) {
    await this.init();
    const query = `
      UPDATE reservations
      SET status = $2
      WHERE id = $1
      RETURNING id, asset_id AS "assetId", user_id AS "userId",
                start_date AS "startDate", end_date AS "endDate",
                status, created_at AS "createdAt"
    `;
    const { rows } = await this.pool.query(query, [id, status]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      startDate: new Date(rows[0].startDate),
      endDate: new Date(rows[0].endDate),
      createdAt: new Date(rows[0].createdAt)
    };
  }

  async reset() {
    await this.init();
    await this.pool.query('TRUNCATE reservations CASCADE');
    await this.pool.query('DELETE FROM assets');
    this.initialized = false;
    await this.init();
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = PostgresDatabase;
