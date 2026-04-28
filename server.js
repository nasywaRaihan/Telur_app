const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();

// ✅ middleware (cukup sekali)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ===============================
// ERROR HANDLER
// ===============================
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT ERROR:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED PROMISE:', err);
});

// ===============================
// 📦 TAMBAH ORDER
// ===============================
app.post('/orders', async (req, res) => {
  const { nama, jumlah } = req.body;

  const { error } = await supabase.from('orders').insert([
    {
      nama,
      jumlah_pesan: parseInt(jumlah),
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
// 💰 BAYAR
// ===============================
app.patch('/orders/:id/bayar', async (req, res) => {
  const { id } = req.params;

  const { data: order, error: err1 } = await supabase.from('orders').select('*').eq('id', id).single();

  if (err1 || !order) {
    return res.status(404).send({ error: 'Order tidak ditemukan' });
  }

  await supabase.from('penjualan').insert([
    {
      jumlah: order.jumlah_pesan,
      tanggal: new Date().toISOString(),
    },
  ]);

  const { error } = await supabase
    .from('orders')
    .update({
      status_bayar: 'lunas',
      status_order: 'selesai',
      jumlah_terpenuhi: order.jumlah_pesan,
    })
    .eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Sudah dibayar' });
});

// ===============================
// PRODUKSI
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
// DASHBOARD
// ===============================
app.get('/dashboard', async (req, res) => {
  const { data: produksi } = await supabase.from('produksi').select('jumlah_telur');
  const stokAsli = produksi?.reduce((s, p) => s + p.jumlah_telur, 0) || 0;

  const { data: penjualan } = await supabase.from('penjualan').select('jumlah');
  const terjual = penjualan?.reduce((s, p) => s + p.jumlah, 0) || 0;

  const { data: orders } = await supabase.from('orders').select('jumlah_pesan, status_order');

  const { data: hargaRow } = await supabase.from('settings').select('harga_per_kg').eq('id', 1).single();

  const harga = hargaRow?.harga_per_kg || 0;

  const pendingKg = orders?.filter((o) => o.status_order !== 'selesai').reduce((s, o) => s + o.jumlah_pesan, 0) || 0;

  const pending = orders?.filter((o) => o.status_order === 'menunggu').length || 0;

  res.send({
    stok: stokAsli - terjual,
    pendingKg, // 🔴 kg (buat tulisan merah)
    pending, // 🟡 jumlah orang (buat card)
    uang: terjual * harga,
  });
});

// ===============================
app.get('/harga', async (req, res) => {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  res.send(data);
});

app.post('/harga', async (req, res) => {
  const { harga } = req.body;
  await supabase.from('settings').update({ harga_per_kg: harga }).eq('id', 1);
  res.send({ message: 'ok' });
});

app.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('orders').delete().eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Order dihapus' });
});

app.patch('/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { jumlah } = req.body;

  const { error } = await supabase
    .from('orders')
    .update({ jumlah_pesan: parseInt(jumlah) })
    .eq('id', id);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Order diupdate' });
});

app.delete('/penjualan/reset', async (req, res) => {
  const { error } = await supabase.from('penjualan').delete().neq('id', 0);

  if (error) return res.status(500).send(error);

  res.send({ message: 'Reset berhasil' });
});

// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Server jalan di port ' + PORT);
});
