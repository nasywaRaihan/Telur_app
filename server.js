const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 🔥 DISTRIBUSI TELUR
function distribusiTelur(stok) {
  return new Promise((resolve) => {
    db.all(
      `
      SELECT * FROM orders
      WHERE status_order != 'selesai'
      ORDER BY id ASC
    `,
      [],
      (err, orders) => {
        let sisa = stok;

        orders.forEach((order) => {
          if (sisa <= 0) return;

          let kurang = order.jumlah_pesan - order.jumlah_terpenuhi;
          let ambil = Math.min(kurang, sisa);

          let newJumlah = order.jumlah_terpenuhi + ambil;
          let status = newJumlah >= order.jumlah_pesan ? 'selesai' : 'sebagian';

          db.run(
            `
          UPDATE orders
          SET jumlah_terpenuhi = ?, status_order = ?
          WHERE id = ?
        `,
            [newJumlah, status, order.id],
          );

          sisa -= ambil;
        });

        resolve();
      },
    );
  });
}

// 📌 INPUT PRODUKSI
app.post('/produksi', async (req, res) => {
  const { jumlah } = req.body;
  const tanggal = new Date().toISOString().split('T')[0];

  db.run(
    `
    INSERT INTO produksi (tanggal, jumlah_telur)
    VALUES (?, ?)
  `,
    [tanggal, jumlah],
  );

  await distribusiTelur(jumlah);

  res.send({ message: 'Produksi disimpan & didistribusikan' });
});

// 📌 GET ORDERS
app.get('/orders', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY id ASC`, [], (err, rows) => {
    res.send(rows);
  });
});

// 💰 BAYAR
app.patch('/orders/:id/bayar', (req, res) => {
  db.get(`SELECT * FROM orders WHERE id = ?`, [req.params.id], (err, order) => {
    if (err || !order) {
      return res.status(404).send({ error: 'Order tidak ditemukan' });
    }

    // 🔥 simpan ke penjualan
    db.run(`INSERT INTO penjualan (jumlah, tanggal) VALUES (?, ?)`, [order.jumlah_pesan, new Date().toISOString()]);

    // 🔥 update order
    db.run(
      `
      UPDATE orders
      SET 
        status_bayar = 'lunas',
        status_order = 'selesai',
        jumlah_terpenuhi = jumlah_pesan
      WHERE id = ?
    `,
      [req.params.id],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).send({ error: 'Gagal update' });
        }

        res.send({ message: 'Sudah dibayar & tercatat sebagai penjualan' });
      },
    );
  });
});

app.get('/dashboard', (req, res) => {
  // 🔹 STOK PRODUKSI
  db.get(
    `
    SELECT SUM(jumlah_telur) as stok
    FROM produksi
    WHERE tanggal = DATE('now')
  `,
    [],
    (err, stok) => {
      // 🔹 SUDAH SELESAI (INI YANG MENGURANGI STOK)
      db.get(
        `
        SELECT SUM(jumlah) as terjual
        FROM penjualan
      `,
        [],
        (err, selesai) => {
          // 🔹 PENDING (INFO SAJA)
          db.get(
            `
        SELECT SUM(jumlah_pesan) as pending
        FROM orders
        WHERE status_order != 'selesai'
      `,
            [],
            (err, pending) => {
              // 🔹 UANG
              db.get(
                `
                SELECT SUM(jumlah * (
                  SELECT harga_per_kg FROM settings WHERE id = 1
                  )) as uang
                FROM penjualan
                `,
                [],
                (err, uang) => {
                  const stokAsli = stok?.stok || 0;
                  const terjual = selesai?.terjual || 0;
                  const pendingKg = pending?.pending || 0;

                  const stokTersisa = stokAsli - terjual;

                  res.send({
                    stok: stokTersisa,
                    pendingKg: pendingKg,
                    uang: uang?.uang || 0,
                  });
                },
              );
            },
          );
        },
      );
    },
  );
});

//GET HARGA
app.get('/harga', (req, res) => {
  db.get(`SELECT harga_per_kg FROM settings WHERE id = 1`, [], (err, row) => {
    res.send(row);
  });
});

//UPDATE HARGA
app.post('/harga', (req, res) => {
  const { harga } = req.body;

  db.run(
    `
    UPDATE settings
    SET harga_per_kg = ?
    WHERE id = 1
  `,
    [harga],
  );

  res.send({ message: 'Harga diperbarui' });
});

// EDIT ORDER
app.patch('/orders/:id', (req, res) => {
  const { jumlah } = req.body;

  db.run(`UPDATE orders SET jumlah_pesan = ? WHERE id = ?`, [jumlah, req.params.id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send({ error: 'Gagal edit' });
    }

    res.send({ message: 'Order diupdate' });
  });
});

app.post('/orders', (req, res) => {
  const { nama, jumlah } = req.body;
  const tanggal = new Date().toISOString();

  db.run(
    `
    INSERT INTO orders 
    (nama, jumlah_pesan, jumlah_terpenuhi, status_order, tanggal)
    VALUES (?, ?, 0, 'menunggu', ?)
  `,
    [nama, jumlah, tanggal],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send({ error: 'Gagal tambah' });
      }

      res.send({ message: 'Order ditambahkan' });
    },
  );
});

// HAPUS ORDER
app.delete('/orders/:id', (req, res) => {
  db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send({ error: 'Gagal hapus' });
    }

    res.send({ message: 'Order dihapus' });
  });
});

app.get('/debug', (req, res) => {
  db.all(`SELECT * FROM orders`, [], (err, rows) => {
    res.send(rows);
  });
});

app.get('/debug', (req, res) => {
  db.all(`SELECT * FROM orders`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.send('ERROR DB');
    }
    res.send(rows);
  });
});

app.delete('/penjualan/reset', (req, res) => {
  db.run(`DELETE FROM penjualan`, [], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send({ error: 'Gagal reset' });
    }

    res.send({ message: 'Uang berhasil direset' });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server jalan di port ' + PORT);
});
