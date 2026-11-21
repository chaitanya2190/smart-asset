require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const PostgresDatabase = require('./db/postgres');

const isTest = process.env.NODE_ENV === 'test';
const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_FILE = path.join(DATA_DIR, isTest ? 'test-assets.csv' : 'assets.csv');
const RESERVATIONS_FILE = path.join(DATA_DIR, isTest ? 'test-reservations.csv' : 'reservations.csv');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class CsvDatabase {
  constructor() {
    this.assets = [];
    this.reservations = [];
    this.reservationCounter = 1;
    this.assetCounter = 1;
    this.writeQueue = Promise.resolve();

    this.load();
  }

  atomicWrite(filepath, data) {
    const tmpPath = `${filepath}.tmp`;
    fs.writeFileSync(tmpPath, data, 'utf8');
    fs.renameSync(tmpPath, filepath);
  }

  scheduleSave() {
    this.writeQueue = this.writeQueue.then(() => {
      try {
        const assetsCsv = stringify(this.assets, { header: true });
        this.atomicWrite(ASSETS_FILE, assetsCsv);

        const reservationsCsv = stringify(this.reservations, {
          header: true,
          cast: {
            date: (value) => value.toISOString()
          }
        });
        this.atomicWrite(RESERVATIONS_FILE, reservationsCsv);
      } catch (err) {
        console.error('Failed to save database:', err);
      }
    });
    return this.writeQueue;
  }

  load() {
    if (fs.existsSync(ASSETS_FILE)) {
      const records = parse(fs.readFileSync(ASSETS_FILE, 'utf8'), { columns: true });
      this.assets = records.map(r => ({
        ...r,
        maxDuration: Number(r.maxDuration)
      }));
      const maxId = this.assets.reduce((max, a) => {
        const idNum = parseInt(a.id.replace('A', ''), 10);
        return isNaN(idNum) ? max : (idNum > max ? idNum : max);
      }, 0);
      this.assetCounter = maxId + 1;
    } else {
      this.assets = [
        { id: 'A1', name: 'MacBook Pro 16"', category: 'Computing', status: 'AVAILABLE', maxDuration: 14 },
        { id: 'A2', name: 'Dell UltraSharp 27"', category: 'Displays', status: 'AVAILABLE', maxDuration: 30 },
        { id: 'A3', name: 'Sony A7III Camera', category: 'Photography', status: 'MAINTENANCE', maxDuration: 7 },
        { id: 'A4', name: 'iPad Pro', category: 'Computing', status: 'AVAILABLE', maxDuration: 14 }
      ];
      this.assetCounter = 5;
      this.scheduleSave();
    }

    if (fs.existsSync(RESERVATIONS_FILE)) {
      const records = parse(fs.readFileSync(RESERVATIONS_FILE, 'utf8'), { columns: true });
      this.reservations = records.map(r => ({
        ...r,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        createdAt: new Date(r.createdAt)
      }));
      const maxResId = this.reservations.reduce((max, r) => {
        const idNum = parseInt(r.id.replace('R', ''), 10);
        return isNaN(idNum) ? max : (idNum > max ? idNum : max);
      }, 0);
      this.reservationCounter = maxResId + 1;
    } else {
      this.reservations = [];
      this.scheduleSave();
    }
  }

  async getAssets() {
    return this.assets;
  }

  async getAssetById(id) {
    return this.assets.find(a => a.id === id) || null;
  }

  async addAsset(assetData) {
    const newAsset = {
      id: `A${this.assetCounter++}`,
      name: assetData.name,
      category: assetData.category,
      status: 'AVAILABLE',
      maxDuration: parseInt(assetData.maxDuration, 10) || 14
    };
    this.assets.push(newAsset);
    this.scheduleSave();
    return newAsset;
  }

  async removeAsset(id) {
    const initialLength = this.assets.length;
    this.assets = this.assets.filter(a => a.id !== id);
    if (this.assets.length < initialLength) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  async toggleMaintenance(id) {
    const asset = this.assets.find(a => a.id === id);
    if (asset) {
      asset.status = asset.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
      this.scheduleSave();
      return asset;
    }
    return null;
  }

  async getReservations() {
    return this.reservations;
  }

  async getReservationsByUser(userId) {
    return this.reservations.filter(r => r.userId === userId && r.status !== 'CANCELLED');
  }

  async getReservationsByAsset(assetId) {
    return this.reservations
      .filter(r => r.assetId === assetId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getReservationById(id) {
    return this.reservations.find(r => r.id === id) || null;
  }

  async createReservation(reservation) {
    const newReservation = {
      id: `R${this.reservationCounter++}`,
      ...reservation,
      startDate: new Date(reservation.startDate),
      endDate: new Date(reservation.endDate),
      status: reservation.status || 'APPROVED',
      createdAt: new Date()
    };
    this.reservations.push(newReservation);
    this.scheduleSave();
    return newReservation;
  }

  async cancelReservation(id) {
    const res = this.reservations.find(r => r.id === id);
    if (res) {
      res.status = 'CANCELLED';
      this.scheduleSave();
      return true;
    }
    return false;
  }

  async updateReservationStatus(id, status) {
    const res = this.reservations.find(r => r.id === id);
    if (res) {
      res.status = status;
      this.scheduleSave();
      return res;
    }
    return null;
  }

  async hasDateOverlap(assetId, startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return this.reservations.some(r => {
      if (r.assetId !== assetId) return false;
      if (r.status === 'CANCELLED' || r.status === 'RETURNED') return false;

      const rStart = r.startDate.getTime();
      const rEnd = r.endDate.getTime();

      return (start < rEnd && end > rStart);
    });
  }

  async reset() {
    this.reservations = [];
    this.reservationCounter = 1;
    this.assets = [
      { id: 'A1', name: 'MacBook Pro 16"', category: 'Computing', status: 'AVAILABLE', maxDuration: 14 },
      { id: 'A2', name: 'Dell UltraSharp 27"', category: 'Displays', status: 'AVAILABLE', maxDuration: 30 },
      { id: 'A3', name: 'Sony A7III Camera', category: 'Photography', status: 'MAINTENANCE', maxDuration: 7 },
      { id: 'A4', name: 'iPad Pro', category: 'Computing', status: 'AVAILABLE', maxDuration: 14 }
    ];
    this.assetCounter = 5;
    return this.scheduleSave();
  }
}

// Unified Database Provider Proxy
class DatabaseProvider {
  constructor() {
    this.usePostgres = Boolean(
      process.env.DATABASE_URL ||
      process.env.USE_POSTGRES === 'true'
    );

    if (this.usePostgres) {
      try {
        this.engine = new PostgresDatabase();
        this.engineType = 'POSTGRESQL';
      } catch (err) {
        console.warn('[Database] Failed to initialize PostgreSQL, falling back to CSV store:', err.message);
        this.engine = new CsvDatabase();
        this.engineType = 'CSV';
      }
    } else {
      this.engine = new CsvDatabase();
      this.engineType = 'CSV';
    }
  }

  getEngineType() {
    return this.engineType;
  }

  async getAssets() {
    return this.engine.getAssets();
  }

  async getAssetById(id) {
    return this.engine.getAssetById(id);
  }

  async addAsset(assetData) {
    return this.engine.addAsset(assetData);
  }

  async removeAsset(id) {
    return this.engine.removeAsset(id);
  }

  async toggleMaintenance(id) {
    return this.engine.toggleMaintenance(id);
  }

  async getReservations() {
    return this.engine.getReservations();
  }

  async getReservationsByUser(userId) {
    return this.engine.getReservationsByUser(userId);
  }

  async getReservationsByAsset(assetId) {
    return this.engine.getReservationsByAsset(assetId);
  }

  async getReservationById(id) {
    return this.engine.getReservationById(id);
  }

  async createReservation(reservation) {
    return this.engine.createReservation(reservation);
  }

  async cancelReservation(id) {
    return this.engine.cancelReservation(id);
  }

  async updateReservationStatus(id, status) {
    return this.engine.updateReservationStatus(id, status);
  }

  async hasDateOverlap(assetId, startDate, endDate) {
    return this.engine.hasDateOverlap(assetId, startDate, endDate);
  }

  async reset() {
    return this.engine.reset();
  }
}

module.exports = new DatabaseProvider();
