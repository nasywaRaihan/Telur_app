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

  if (!nama || !jumlah) {
    showToast('Isi semua data!', 'error');
    return;
  }

  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, jumlah }),
  });

  const result = await res.json();

  if (!res.ok) {
    showToast('Gagal simpan!', 'error');
    return;
  }

  // 🔥 INI YANG KURANG
  showToast('Pesanan berhasil ditambahkan');

  document.getElementById('nama').value = '';
  document.getElementById('jumlah').value = '';

  await loadOrders();
  await loadDashboard();
}

// PRODUKSI
async function tambahProduksi() {
  const jumlah = document.getElementById('produksi').value;

  if (!jumlah) return showToast('Isi jumlah dulu!');

  await fetch(`${API}/produksi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jumlah }),
  });

  showToast('Produksi berhasil!');
  document.getElementById('produksi').value = '';

  init();
}

// BAYAR
async function bayar(id) {
  const res = await fetch(`${API}/orders/${id}/bayar`, {
    method: 'PATCH',
  });

  const result = await res.json();

  // ❌ kalau gagal (stok tidak cukup)
  if (!res.ok) {
    showToast(result.error || 'Stok tidak cukup!');
    return;
  }

  // ✅ kalau sukses
  showToast('Pesanan berhasil diselesaikan');
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

  document.getElementById('pending').innerText = data.pending || 0;
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

          📅 ${new Date(o.tanggal).toLocaleDateString('id-ID')}<br>

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

  if (!harga) return showToast('Isi harga dulu!');

  await fetch(`${API}/harga`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ harga }),
  });

  showToast('Harga berhasil diupdate');

  init();
}

// EDIT ORDER
async function editOrder(id, jumlahLama) {
  showEditModal(jumlahLama, async (jumlahBaru) => {
    if (!jumlahBaru) return;

    await fetch(`${API}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jumlah: jumlahBaru }),
    });

    showToast('Data berhasil diupdate');
    init();
  });
}

// HAPUS ORDER
async function hapusOrder(id) {
  showConfirm('Yakin mau hapus?', async (ok) => {
    if (!ok) return;

    await fetch(`${API}/orders/${id}`, {
      method: 'DELETE',
    });

    showToast('Pesanan berhasil dihapus');
    init();
  });
}

// RESET UANG
async function resetUang() {
  showConfirm('Reset uang hari ini?', async (ok) => {
    if (!ok) return;

    await fetch(`${API}/penjualan/reset`, {
      method: 'PATCH',
    });

    showToast('Uang berhasil direset');
    init();
  });
}

// TOAST
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');

  const icons = {
    success: '✔',
    error: '✖',
    info: '⚠',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span>${message}</span>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let confirmCallback = null;

function showConfirm(message, callback) {
  document.getElementById('confirm-text').innerText = message;
  document.getElementById('confirm-modal').classList.remove('hidden');
  confirmCallback = callback;
}

function handleConfirm(result) {
  document.getElementById('confirm-modal').classList.add('hidden');

  if (confirmCallback) {
    confirmCallback(result);
    confirmCallback = null;
  }
}

let editCallback = null;

function showEditModal(jumlahLama, callback) {
  document.getElementById('edit-input').value = jumlahLama;
  document.getElementById('edit-modal').classList.remove('hidden');
  editCallback = callback;
}

function handleEdit(ok) {
  const modal = document.getElementById('edit-modal');
  modal.classList.add('hidden');

  if (!ok) return;

  const value = document.getElementById('edit-input').value;

  if (editCallback) {
    editCallback(value);
    editCallback = null;
  }
}

// 🔥 CLOSE MODAL kalau klik luar
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') {
    handleConfirm(false);
  }
});

// 🔥 ESC untuk cancel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    handleConfirm(false);
  }
});

// klik luar untuk close edit
document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target.id === 'edit-modal') {
    handleEdit(false);
  }
});

// INIT JALAN
init();
