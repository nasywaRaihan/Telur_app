const API = 'https://telurapp-production.up.railway.app';

let HARGA_GLOBAL = 0;
let SEMUA_ORDERS = [];

// FORMAT UANG
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka || 0);
}

// INIT YANG BENAR (🔥 penting)
async function init() {
  await loadHarga();
  await loadOrders();
  await loadDashboard();
}

// TAMBAH ORDER
async function tambahOrder() {
  const nama = document.getElementById('nama').value;
  const jumlah = document.getElementById('jumlah').value;

  if (!nama || !jumlah) return alert('Isi semua data!');

  await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, jumlah }),
  });

  document.getElementById('nama').value = '';
  document.getElementById('jumlah').value = '';

  init();
}

// PRODUKSI
async function tambahProduksi() {
  const jumlah = document.getElementById('produksi').value;

  if (!jumlah) return alert('Isi jumlah dulu!');

  await fetch(`${API}/produksi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jumlah }),
  });

  alert('Produksi berhasil!');
  document.getElementById('produksi').value = '';

  init();
}

// BAYAR
async function bayar(id) {
  await fetch(`${API}/orders/${id}/bayar`, {
    method: 'PATCH',
  });

  init();
}

// LOAD ORDERS
async function loadOrders() {
  const res = await fetch(`${API}/orders`);
  const data = await res.json();

  SEMUA_ORDERS = data; // 🔥 simpan global untuk search

  renderOrders(data); // 🔥 semua render lewat sini
}

// DASHBOARD
async function loadDashboard() {
  const res = await fetch(`${API}/dashboard`);
  const data = await res.json();

  document.getElementById('stok').innerText = (data.stok || 0) + ' kg';

  document.getElementById('stokInfo').innerText = '(pending: ' + (data.pendingKg || 0) + ' kg)';

  document.getElementById('uang').innerText = formatRupiah(data.uang || 0);

  document.getElementById('pending').innerText = Math.ceil(data.pendingKg || 0);
}

// HARGA
async function loadHarga() {
  const res = await fetch(`${API}/harga`);
  const data = await res.json();

  const harga = data?.harga_per_kg || 0;

  HARGA_GLOBAL = harga;

  document.getElementById('harga').value = harga;

  document.getElementById('hargaDisplay').innerText = 'Harga Saat Ini: ' + formatRupiah(harga) + ' / kg';
}

//RENDER ORDERS
function renderOrders(data) {
  const list = document.getElementById('list');
  list.innerHTML = '';

  if (!data || data.length === 0) {
    list.innerHTML = '<i>Belum ada pesanan</i>';
    return;
  }

  // 🔥 urutkan: selesai di bawah
  data.sort((a, b) => {
    if (a.status_order === 'selesai') return 1;
    if (b.status_order === 'selesai') return -1;
    return a.id - b.id;
  });

  data.forEach((o, index) => {
    const total = o.jumlah_pesan * HARGA_GLOBAL;

    const belumSelesai = o.status_order !== 'selesai';

    const tombolBayar = belumSelesai ? `<button onclick="bayar(${o.id})">Selesai</button>` : '';

    const tombolEdit = belumSelesai ? `<button onclick="editOrder(${o.id}, ${o.jumlah_pesan})">Edit</button>` : '';

    const li = document.createElement('li');
    if (o.status_order === 'selesai') {
      li.classList.add('done');
    }

    li.innerHTML = `
      <div class="order-item">

        <div class="order-left">
          <b>${index + 1}. ${o.nama}</b><br>

          📅 ${new Date(o.tanggal).toLocaleString()}<br>

          ${o.jumlah_pesan} kg<br>

          <span class="status ${o.status_order}">
            ${o.status_order}
          </span>

          <br>

          💰 ${formatRupiah(total)}
        </div>

        <div class="actions">
          ${tombolBayar}
          ${tombolEdit}
          <button onclick="hapusOrder(${o.id})">Hapus</button>
        </div>

      </div>
    `;

    list.appendChild(li);
  });
}

// FILTER ORDERS
function filterOrders() {
  const keyword = document.getElementById('search').value.toLowerCase();

  const hasil = SEMUA_ORDERS.filter((o) => o.nama.toLowerCase().includes(keyword));

  renderOrders(hasil);
}

// UPDATE HARGA
async function updateHarga() {
  const harga = document.getElementById('harga').value;

  if (!harga) return alert('Isi harga dulu!');

  await fetch(`${API}/harga`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ harga }),
  });

  alert('Harga berhasil diupdate');

  init();
}

// EDIT ORDER
async function editOrder(id, jumlahLama) {
  const jumlahBaru = prompt('Edit jumlah (kg):', jumlahLama);

  if (!jumlahBaru) return;

  await fetch(`${API}/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jumlah: jumlahBaru }),
  });

  init();
}

// HAPUS ORDER
async function hapusOrder(id) {
  const yakin = confirm('Yakin mau hapus?');
  if (!yakin) return;

  await fetch(`${API}/orders/${id}`, {
    method: 'DELETE',
  });

  init();
}

// RESET UANG
async function resetUang() {
  const yakin = confirm('Reset semua uang hari ini?');

  if (!yakin) return;

  await fetch(`${API}/penjualan/reset`, {
    method: 'DELETE',
  });

  init();
}

// INIT JALAN
init();
