const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 🔥 path aman untuk server
const dbPath = path.join(__dirname, 'telur.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Gagal connect DB:', err);
  } else {
    console.log('✅ DB connected');
  }
});

db.serialize(() => {
  // PRODUKSI
  db.run(`
    CREATE TABLE IF NOT EXISTS produksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT,
      jumlah_telur INTEGER
    )
  `);

  // ORDERS
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT,
      jumlah_pesan INTEGER,
      jumlah_terpenuhi INTEGER DEFAULT 0,
      harga_per_butir INTEGER DEFAULT 2000,
      status_order TEXT DEFAULT 'menunggu',
      status_bayar TEXT DEFAULT 'belum',
      tanggal TEXT
    )
  `);

  // SETTINGS
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      harga_per_kg INTEGER
    )
  `);

  // DEFAULT HARGA
  db.get(`SELECT * FROM settings WHERE id = 1`, (err, row) => {
    if (err) {
      console.error('❌ Error settings:', err);
    }

    if (!row) {
      db.run(`
        INSERT INTO settings (id, harga_per_kg)
        VALUES (1, 25000)
      `);
    }
  });

  // PENJUALAN
  db.run(`
    CREATE TABLE IF NOT EXISTS penjualan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jumlah INTEGER,
      tanggal TEXT
    )
  `);
});

module.exports = db;
