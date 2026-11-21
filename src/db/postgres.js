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

  async testConnection() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
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

    // Align sequence counters with current data
    await this.pool.query(`
      SELECT setval('asset_id_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int) FROM assets), 0), 4) + 1, false);
      SELECT setval('reservation_id_seq', COALESCE((SELECT MAX(NULLIF(regexp_replace(id, '\\D', '', 'g'), '')::int) FROM reservations), 0) + 1, false);
    `);

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
    const duration = parseInt(assetData.maxDuration, 10) || 14;

    const query = `
      INSERT INTO assets (id, name, category, status, max_duration)
      VALUES ('A' || nextval('asset_id_seq'), $1, $2, 'AVAILABLE', $3)
      RETURNING id, name, category, status, max_duration AS "maxDuration"
    `;
    const { rows } = await this.pool.query(query, [assetData.name, assetData.category, duration]);
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
        AND status NOT IN ('CANCELLED', 'RETURNED', 'REJECTED')
        AND $2::timestamptz < end_date
        AND $3::timestamptz > start_date
      LIMIT 1
    `;
    const { rows } = await this.pool.query(query, [assetId, start.toISOString(), end.toISOString()]);
    return rows.length > 0;
  }

  /**
   * Concurrency-safe reservation creation using an ACID transaction,
   * row-level locking on the asset (FOR UPDATE), and database sequences.
   */
  async createReservation(reservation) {
    await this.init();
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const status = reservation.status || 'APPROVED';

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Row-level lock on the asset to serialize concurrent booking requests for the same asset
      const assetRes = await client.query('SELECT * FROM assets WHERE id = $1 FOR UPDATE', [reservation.assetId]);
      if (assetRes.rows.length === 0) {
        const notFoundErr = new Error('Asset not found.');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }

      if (assetRes.rows[0].status === 'MAINTENANCE') {
        const maintErr = new Error('Asset is currently in maintenance.');
        maintErr.statusCode = 400;
        throw maintErr;
      }

      // 2. Concurrency-safe overlap verification within the locked transaction
      const overlapRes = await client.query(
        `SELECT 1 FROM reservations
         WHERE asset_id = $1
           AND status NOT IN ('CANCELLED', 'RETURNED', 'REJECTED')
           AND $2::timestamptz < end_date
           AND $3::timestamptz > start_date
         LIMIT 1`,
        [reservation.assetId, start.toISOString(), end.toISOString()]
      );

      if (overlapRes.rows.length > 0) {
        const conflictErr = new Error('Asset is already reserved for the requested dates.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      // 3. Insert reservation using sequence-generated ID
      const query = `
        INSERT INTO reservations (id, asset_id, user_id, start_date, end_date, status, created_at)
        VALUES ('R' || nextval('reservation_id_seq'), $1, $2, $3, $4, $5, NOW())
        RETURNING id, asset_id AS "assetId", user_id AS "userId",
                  start_date AS "startDate", end_date AS "endDate",
                  status, created_at AS "createdAt"
      `;
      const { rows } = await client.query(query, [
        reservation.assetId,
        reservation.userId,
        start.toISOString(),
        end.toISOString(),
        status
      ]);

      await client.query('COMMIT');

      return {
        ...rows[0],
        startDate: new Date(rows[0].startDate),
        endDate: new Date(rows[0].endDate),
        createdAt: new Date(rows[0].createdAt)
      };
    } catch (err) {
      await client.query('ROLLBACK');

      // Handle PostgreSQL GiST exclusion constraint violation (code 23P01) or unique violation (23505)
      if (err.code === '23P01' || err.code === '23505') {
        const conflictErr = new Error('Asset is already reserved for the requested dates.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    } finally {
      client.release();
    }
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
