const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const supabase = require('./supabase');

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT ERROR:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED PROMISE:', err);
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ===============================
// 📦 TAMBAH ORDER
// ===============================
app.post('/orders', async (req, res) => {
  const { nama, jumlah } = req.body;

  const { error } = await supabase.from('orders').insert([
    {
      nama,
      jumlah_pesan: jumlah,
      jumlah_terpenuhi: 0,
      status_order: 'menunggu',
      status_bayar: 'belum',
      tanggal: new Date().toISOString(),
    },
  ]);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Order ditambahkan' });
});

// ===============================
// 📦 GET ORDERS
// ===============================
app.get('/orders', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*').order('id', { ascending: true });

  if (error) return res.status(500).send(error);

  res.send(data);
});

// ===============================
// 💰 BAYAR (SELESAI)
// ===============================
app.patch('/orders/:id/bayar', async (req, res) => {
  const { id } = req.params;

  // ambil order
  const { data: order, error: err1 } = await supabase.from('orders').select('*').eq('id', id).single();

  if (err1 || !order) {
    return res.status(404).send({ error: 'Order tidak ditemukan' });
  }

  // simpan ke penjualan
  await supabase.from('penjualan').insert([
    {
      jumlah: order.jumlah_pesan,
      tanggal: new Date().toISOString(),
    },
  ]);

  // update order
  const { error } = await supabase
    .from('orders')
    .update({
      status_bayar: 'lunas',
      status_order: 'selesai',
      jumlah_terpenuhi: order.jumlah_pesan,
    })
    .eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Sudah dibayar & tercatat' });
});

// ===============================
// ✏️ EDIT ORDER
// ===============================
app.patch('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { jumlah } = req.body;

  const { error } = await supabase.from('orders').update({ jumlah_pesan: jumlah }).eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Order diupdate' });
});

// ===============================
// 🗑️ HAPUS ORDER
// ===============================
app.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('orders').delete().eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Order dihapus' });
});

// ===============================
// 🥚 PRODUKSI
// ===============================
app.post('/produksi', async (req, res) => {
  const { jumlah } = req.body;

  const { error } = await supabase.from('produksi').insert([
    {
      jumlah_telur: jumlah,
      tanggal: new Date().toISOString(),
    },
  ]);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Produksi disimpan' });
});

// ===============================
// 📊 DASHBOARD
// ===============================
app.get('/dashboard', async (req, res) => {
  // produksi
  const { data: produksi } = await supabase.from('produksi').select('jumlah_telur');

  const stokAsli = produksi?.reduce((sum, p) => sum + p.jumlah_telur, 0) || 0;

  // penjualan
  const { data: penjualan } = await supabase.from('penjualan').select('jumlah');

  const terjual = penjualan?.reduce((sum, p) => sum + p.jumlah, 0) || 0;

  // pending
  const { data: orders } = await supabase.from('orders').select('jumlah_pesan, status_order');

  const pendingKg = orders?.filter((o) => o.status_order !== 'selesai').reduce((sum, o) => sum + o.jumlah_pesan, 0) || 0;

  // harga
  const { data: hargaRow } = await supabase.from('settings').select('harga_per_kg').eq('id', 1).single();

  const harga = hargaRow?.harga_per_kg || 0;

  const uang = terjual * harga;

  const stokTersisa = stokAsli - terjual;

  res.send({
    stok: stokTersisa,
    pendingKg,
    uang,
  });
});

// ===============================
// 💰 GET HARGA
// ===============================
app.get('/harga', async (req, res) => {
  const { data, error } = await supabase.from('settings').select('harga_per_kg').eq('id', 1).single();

  if (error) return res.status(500).send(error);

  res.send(data);
});

// ===============================
// 💰 UPDATE HARGA
// ===============================
app.post('/harga', async (req, res) => {
  const { harga } = req.body;

  const { error } = await supabase.from('settings').update({ harga_per_kg: harga }).eq('id', 1);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Harga diperbarui' });
});

// ===============================
// 🧪 DEBUG
// ===============================
app.get('/debug', async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*');

  if (error) return res.send(error);

  res.send(data);
});

// ===============================
// 🔄 RESET PENJUALAN
// ===============================
app.delete('/penjualan/reset', async (req, res) => {
  const { error } = await supabase.from('penjualan').delete().neq('id', 0);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Uang berhasil direset' });
});

// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server jalan di port ' + PORT);
});
