// STATE
let members = [];
let editingId = null;
const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzgO2pBzuuRRSvBS6kBQEL72I0qQJ0J37wt7mbmptec7tJSZGESbec0C3JVNAueDY8C/exec";
let scriptUrl = localStorage.getItem("gsheet_url") || DEFAULT_SCRIPT_URL;
let treeVP = { x: 0, y: 0, scale: 1 };
let treePan = null;

// Palet warna untuk garis generasi
const generationColors = [
  "#B87333",
  "#C0A080",
  "#7CB9E8",
  "#50C878",
  "#9966CC",
  "#F4A460",
  "#E34234",
  "#3B7A57",
  "#A95C68",
  "#5D8AA8",
];

// Palet warna untuk garis pasangan (akan dipilih secara unik per pasangan)
const coupleColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8C471",
  "#A3E4D7",
  "#F1948A",
  "#82E0AA",
  "#F5B7B1",
];

// Menyimpan warna pasangan yang sudah digunakan (key: pasanganId1|pasanganId2)
const coupleColorMap = new Map();

// Mendapatkan warna unik untuk sepasang suami-istri
function getCoupleColor(maleId, femaleId) {
  const key = [maleId, femaleId].sort().join("|");
  if (!coupleColorMap.has(key)) {
    const colorIndex = coupleColorMap.size % coupleColors.length;
    coupleColorMap.set(key, coupleColors[colorIndex]);
  }
  return coupleColorMap.get(key);
}

const NODE_W = 152,
  NODE_H = 96,
  H_GAP = 40,
  V_GAP = 70;

function getLineColor(generation) {
  if (!generation || generation <= 0) return "#4a5580";
  const idx = Math.min(generation - 1, generationColors.length - 1);
  return generationColors[idx];
}

function getBirthDateValue(member) {
  if (!member.tglLahir) return Number.MAX_SAFE_INTEGER;
  return new Date(member.tglLahir).getTime();
}

function getChildrenSorted(parentId, type = "both") {
  let children = [];
  if (type === "both" || type === "father") {
    children = children.concat(members.filter((m) => m.ayahId === parentId));
  }
  if (type === "both" || type === "mother") {
    children = children.concat(members.filter((m) => m.ibuId === parentId));
  }
  children = children.filter(
    (child, index, self) => self.findIndex((c) => c.id === child.id) === index,
  );
  children.sort((a, b) => getBirthDateValue(a) - getBirthDateValue(b));
  return children;
}

document.getElementById("script-url-input").value = scriptUrl;

async function init() {
  loadLocalData();
  if (scriptUrl) await fetchFromSheets();
  renderAll();
}

function loadLocalData() {
  const saved = localStorage.getItem("family_members");
  if (saved) members = JSON.parse(saved);
}
function saveLocalData() {
  localStorage.setItem("family_members", JSON.stringify(members));
}

async function fetchFromSheets() {
  if (!scriptUrl) return;
  setStatus("loading", "Mengambil data dari Google Sheets...");
  try {
    const res = await fetch(scriptUrl + "?action=getAll", { method: "GET" });
    const data = await res.json();
    if (data.status === "ok") {
      members = data.members;
      saveLocalData();
      setStatus("online", "Terhubung ke Google Sheets");
      toast("Data berhasil dimuat dari Google Sheets", "success");
    } else {
      setStatus("offline", "Gagal memuat data");
      toast("Gagal memuat data: " + data.message, "error");
    }
  } catch (e) {
    setStatus("offline", "Tidak dapat terhubung ke Google Sheets");
    toast("Tidak dapat terhubung. Menggunakan data lokal.", "error");
  }
  renderAll();
}

async function pushToSheets(member, action) {
  if (!scriptUrl) return true;
  setStatus("loading", "Menyimpan ke Google Sheets...");
  try {
    const encoded = encodeURIComponent(JSON.stringify(member));
    const url = `${scriptUrl}?action=${action}&data=${encoded}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();
    if (data.status === "ok") {
      setStatus("online", "Tersimpan ke Google Sheets");
      return true;
    } else {
      setStatus("offline", "Gagal menyimpan");
      toast("Gagal: " + data.message, "error");
      return false;
    }
  } catch (e) {
    setStatus("offline", "Tidak dapat terhubung");
    toast("Disimpan lokal. Google Sheets tidak tersedia.", "info");
    return false;
  }
}

async function syncData() {
  if (!scriptUrl) {
    toast("Harap masukkan URL Google Apps Script di Pengaturan", "error");
    switchTab("settings");
    return;
  }
  await fetchFromSheets();
  renderAll();
}

function generateId() {
  return (
    "M" + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()
  );
}

async function saveMember() {
  const nama = document.getElementById("f-nama").value.trim();
  if (!nama) {
    toast("Nama wajib diisi!", "error");
    return;
  }

  const ayahId = document.getElementById("f-ayah").value;
  if (ayahId) {
    const ayah = members.find((m) => m.id === ayahId);
    if (ayah && ayah.jk !== "L") {
      toast("Ayah harus berjenis kelamin Laki-laki!", "error");
      return;
    }
  }

  const ibuId = document.getElementById("f-ibu").value;
  if (ibuId) {
    const ibu = members.find((m) => m.id === ibuId);
    if (ibu && ibu.jk !== "P") {
      toast("Ibu harus berjenis kelamin Perempuan!", "error");
      return;
    }
  }

  const member = {
    id: editingId || generateId(),
    nama,
    jk: document.getElementById("f-jk").value,
    tempatLahir: document.getElementById("f-tempat-lahir").value.trim(),
    tglLahir: document.getElementById("f-tgl-lahir").value,
    status: document.getElementById("f-status").value,
    tglWafat: document.getElementById("f-tgl-wafat").value,
    ayahId: ayahId,
    ibuId: ibuId,
    pasanganId: document.getElementById("f-pasangan").value,
    generasi:
      parseInt(document.getElementById("f-generasi").value) ||
      autoGenerasi(ayahId, ibuId),
    catatan: document.getElementById("f-catatan").value.trim(),
    foto: document.getElementById("foto-url").value.trim(),
  };
  if (editingId) {
    const idx = members.findIndex((m) => m.id === editingId);
    if (idx !== -1) members[idx] = member;
    await pushToSheets(member, "update");
    toast("Anggota berhasil diperbarui", "success");
  } else {
    members.push(member);
    await pushToSheets(member, "add");
    toast("Anggota berhasil ditambahkan", "success");
  }
  saveLocalData();
  closeModal("modal-member");
  // Reset couple color map karena data berubah
  coupleColorMap.clear();
  renderAll();
}

async function deleteMember() {
  if (!editingId) return;
  if (!confirm("Yakin ingin menghapus anggota ini?")) return;
  const member = members.find((m) => m.id === editingId);
  members = members.filter((m) => m.id !== editingId);
  members.forEach((m) => {
    if (m.ayahId === editingId) m.ayahId = "";
    if (m.ibuId === editingId) m.ibuId = "";
    if (m.pasanganId === editingId) m.pasanganId = "";
  });
  await pushToSheets(member, "delete");
  saveLocalData();
  closeModal("modal-member");
  coupleColorMap.clear();
  toast("Anggota berhasil dihapus", "success");
  renderAll();
}

function autoGenerasi(ayahId, ibuId) {
  const parentId = ayahId || ibuId;
  if (!parentId) return 1;
  const parent = members.find((m) => m.id === parentId);
  return parent ? (parent.generasi || 1) + 1 : 1;
}

function openAddModal() {
  editingId = null;
  document.getElementById("modal-title").textContent = "Tambah Anggota Baru";
  document.getElementById("btn-delete").style.display = "none";
  clearForm();
  populateDropdowns();
  openModal("modal-member");
}

function openEditModal(id) {
  editingId = id;
  const m = members.find((x) => x.id === id);
  if (!m) return;
  document.getElementById("modal-title").textContent = "Edit Anggota";
  document.getElementById("btn-delete").style.display = "inline-flex";
  populateDropdowns(id);
  document.getElementById("f-nama").value = m.nama || "";
  document.getElementById("f-jk").value = m.jk || "L";
  document.getElementById("f-tempat-lahir").value = m.tempatLahir || "";
  document.getElementById("f-tgl-lahir").value = m.tglLahir || "";
  document.getElementById("f-status").value = m.status || "Hidup";
  document.getElementById("f-tgl-wafat").value = m.tglWafat || "";
  document.getElementById("f-ayah").value = m.ayahId || "";
  document.getElementById("f-ibu").value = m.ibuId || "";
  document.getElementById("f-pasangan").value = m.pasanganId || "";
  document.getElementById("f-generasi").value = m.generasi || "";
  document.getElementById("f-catatan").value = m.catatan || "";
  document.getElementById("foto-url").value = m.foto || "";
  previewAvatar();
  openModal("modal-member");
}

function clearForm() {
  [
    "f-nama",
    "f-tempat-lahir",
    "f-tgl-lahir",
    "f-tgl-wafat",
    "f-catatan",
    "f-generasi",
    "foto-url",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("f-jk").value = "L";
  document.getElementById("f-status").value = "Hidup";
  document.getElementById("avatar-preview").innerHTML = "👤";
}

function populateDropdowns(excludeId = null) {
  const fatherOpts = members
    .filter((m) => m.id !== excludeId && m.jk === "L")
    .map((m) => `<option value="${m.id}">${m.nama} (♂)</option>`)
    .join("");
  document.getElementById("f-ayah").innerHTML =
    '<option value="">-- Pilih Ayah --</option>' + fatherOpts;

  const motherOpts = members
    .filter((m) => m.id !== excludeId && m.jk === "P")
    .map((m) => `<option value="${m.id}">${m.nama} (♀)</option>`)
    .join("");
  document.getElementById("f-ibu").innerHTML =
    '<option value="">-- Pilih Ibu --</option>' + motherOpts;

  const spouseOpts = members
    .filter((m) => m.id !== excludeId)
    .map(
      (m) =>
        `<option value="${m.id}">${m.nama} (${m.jk === "L" ? "♂" : "♀"})</option>`,
    )
    .join("");
  document.getElementById("f-pasangan").innerHTML =
    '<option value="">-- Pilih Pasangan --</option>' + spouseOpts;
}

function previewAvatar() {
  const url = document.getElementById("foto-url").value.trim();
  const preview = document.getElementById("avatar-preview");
  if (url) {
    const normalizedUrl = normalizePhotoUrl(url);
    const img = new Image();
    img.onload = () => {
      preview.innerHTML = `<img src="${normalizedUrl}" style="max-width:100%;max-height:100%;">`;
    };
    img.onerror = () => {
      preview.innerHTML = "👤";
    };
    img.src = normalizedUrl;
  } else {
    preview.innerHTML = "👤";
  }
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function openDetail(id) {
  const m = members.find((x) => x.id === id);
  if (!m) return;
  const ayah = members.find((x) => x.id === m.ayahId);
  const ibu = members.find((x) => x.id === m.ibuId);
  const pasangan = members.find((x) => x.id === m.pasanganId);
  const anak = getChildrenSorted(id, "both");
  const avatarHtml = m.foto
    ? `<img src="${normalizePhotoUrl(m.foto)}" onerror="this.parentElement.innerHTML='${m.jk === "L" ? "👨" : "👩"}'"/>`
    : m.jk === "L"
      ? "👨"
      : "👩";
  const body = `<div class="detail-header"><div class="detail-avatar" style="border:2px solid ${m.jk === "L" ? "var(--male)" : "var(--female)"}">${avatarHtml}</div><div><h2 style="font-family:'Playfair Display',serif;font-size:22px;color:var(--accent)">${m.nama}</h2><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;"><span class="badge ${m.jk === "L" ? "badge-male" : "badge-female"}">${m.jk === "L" ? "♂ Laki-laki" : "♀ Perempuan"}</span>${m.status === "Wafat" ? '<span class="badge" style="background:rgba(100,100,100,0.2);color:#888;border:1px solid #555">✝ Wafat</span>' : ""}${m.generasi ? `<span class="badge" style="background:var(--surface2);color:var(--accent);border:1px solid var(--border)">Gen ke-${m.generasi}</span>` : ""}</div></div></div>
  <div class="detail-grid"><div class="detail-item"><div class="label">Tempat Lahir</div><div class="value">${m.tempatLahir || "—"}</div></div><div class="detail-item"><div class="label">Tanggal Lahir</div><div class="value">${m.tglLahir ? formatDate(m.tglLahir) : "—"}</div></div>${m.tglWafat ? `<div class="detail-item"><div class="label">Tanggal Wafat</div><div class="value">${formatDate(m.tglWafat)}</div></div>` : ""}${m.catatan ? `<div class="detail-item" style="grid-column:1/-1"><div class="label">Catatan</div><div class="value">${m.catatan}</div></div>` : ""}</div>
  <div class="relations-section">${ayah || ibu ? `<h3>👴 Orang Tua</h3><div class="relation-chips" style="margin-bottom:16px">${ayah ? `<div class="relation-chip" onclick="openDetail('${ayah.id}')">👨 ${ayah.nama}</div>` : ""}${ibu ? `<div class="relation-chip" onclick="openDetail('${ibu.id}')">👩 ${ibu.nama}</div>` : ""}</div>` : ""}
  ${pasangan ? `<h3>💍 Pasangan</h3><div class="relation-chips" style="margin-bottom:16px"><div class="relation-chip" onclick="openDetail('${pasangan.id}')">${pasangan.jk === "L" ? "👨" : "👩"} ${pasangan.nama}</div></div>` : ""}
  ${anak.length ? `<h3>👶 Anak (${anak.length})</h3><div class="relation-chips">${anak.map((a) => `<div class="relation-chip" onclick="openDetail('${a.id}')">${a.jk === "L" ? "👦" : "👧"} ${a.nama}</div>`).join("")}</div>` : ""}</div>
  <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal('modal-detail');openEditModal('${m.id}')">✏️ Edit</button><button class="btn btn-ghost" onclick="setTreeRoot('${m.id}')">🌳 Tampilkan di Pohon</button></div>`;
  document.getElementById("detail-modal-title").textContent = m.nama;
  document.getElementById("detail-modal-body").innerHTML = body;
  openModal("modal-detail");
}

function setTreeRoot(id) {
  closeModal("modal-detail");
  document.getElementById("tree-root-select").value = id;
  switchTab("tree");
  renderTree();
}

function renderList() {
  const grid = document.getElementById("member-grid");
  const search = document.getElementById("search-input").value.toLowerCase();
  const genderFilter = document.getElementById("filter-gender").value;
  const genFilter = document.getElementById("filter-gen").value;
  let filtered = members.filter((m) => {
    const matchSearch =
      !search ||
      m.nama.toLowerCase().includes(search) ||
      (m.tempatLahir || "").toLowerCase().includes(search);
    const matchGender = !genderFilter || m.jk === genderFilter;
    const matchGen = !genFilter || String(m.generasi) === genFilter;
    return matchSearch && matchGender && matchGen;
  });
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">👥</div><h3>${members.length === 0 ? "Belum ada anggota" : "Tidak ditemukan"}</h3><p>${members.length === 0 ? "Tambahkan anggota keluarga pertama Anda." : "Coba kata kunci yang berbeda."}</p></div>`;
    return;
  }
  grid.innerHTML = filtered
    .map((m) => {
      const avatarHtml = m.foto
        ? `<img src="${normalizePhotoUrl(m.foto)}" onerror="this.parentElement.innerHTML='${m.jk === "L" ? "👨" : "👩"}'">`
        : m.jk === "L"
          ? "👨"
          : "👩";
      const ayah = members.find((x) => x.id === m.ayahId);
      const ibu = members.find((x) => x.id === m.ibuId);
      const anakCount = getChildrenSorted(m.id, "both").length;
      return `<div class="member-card ${m.jk === "L" ? "male" : "female"}" onclick="openDetail('${m.id}')"><div class="avatar-lg">${avatarHtml}</div><div class="member-info"><h3>${m.nama}</h3><div class="meta">${m.tempatLahir ? "📍 " + m.tempatLahir + "<br>" : ""}${m.tglLahir ? "🎂 " + formatDate(m.tglLahir) + "<br>" : ""}${ayah ? "👨 " + ayah.nama + "<br>" : ""}${ibu ? "👩 " + ibu.nama + "<br>" : ""}${anakCount ? "👶 " + anakCount + " anak" : ""}</div><span class="badge ${m.jk === "L" ? "badge-male" : "badge-female"}">${m.jk === "L" ? "♂ Laki-laki" : "♀ Perempuan"}</span>${m.generasi ? `<span class="badge" style="background:var(--surface2);color:var(--accent);border:1px solid var(--border);margin-left:4px">Gen ${m.generasi}</span>` : ""}</div></div>`;
    })
    .join("");
}

function filterMembers() {
  renderList();
}

function normalizePhotoUrl(url) {
  if (!url) return "";
  url = url.trim();
  let fileId = null;
  let match = url.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/);
  if (match) fileId = match[1];
  if (!fileId) {
    match = url.match(/[?&]id=([^&]+)/);
    if (match && url.includes("drive.google.com")) fileId = match[1];
  }
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
  return url;
}

function renderTree() {
  const world = document.getElementById("tree-world");
  world.innerHTML = "";
  if (!members.length) {
    const svg = document.getElementById("tree-svg");
    const W = svg.clientWidth || 600,
      H = svg.clientHeight || 400;
    world.innerHTML = `<text x="${W / 2}" y="${H / 2 - 20}" text-anchor="middle" font-size="48" opacity="0.3">🌳</text><text x="${W / 2}" y="${H / 2 + 20}" text-anchor="middle" fill="var(--text)" font-size="16" font-family="Nunito,sans-serif">Pohon masih kosong</text><text x="${W / 2}" y="${H / 2 + 44}" text-anchor="middle" fill="var(--text-muted)" font-size="13" font-family="Nunito,sans-serif">Tambahkan anggota keluarga untuk memulai.</text>`;
    return;
  }

  const rootId = document.getElementById("tree-root-select").value;
  let roots = rootId
    ? [members.find((m) => m.id === rootId)].filter(Boolean)
    : members.filter((m) => !m.ayahId && !m.ibuId);
  roots.sort((a, b) => (a.generasi || 999) - (b.generasi || 999));
  if (!roots.length) roots = [members[0]];

  const positions = {};
  const visited = new Set();

  function subtreeWidth(id, depth = 0) {
    if (!id || visited.has(id)) return 0;
    visited.add(id);
    let children = getChildrenSorted(id, "both");
    children = children.filter((c) => !visited.has(c.id));
    if (!children.length) return NODE_W;
    let total =
      children.reduce((s, c) => s + subtreeWidth(c.id, depth + 1), 0) +
      H_GAP * (children.length - 1);
    return Math.max(total, NODE_W);
  }

  function placeNode(id, cx, y) {
    if (!id || positions[id]) return;
    const m = members.find((x) => x.id === id);
    if (!m) return;
    positions[id] = { x: cx - NODE_W / 2, y };
    let children = getChildrenSorted(id, "both");
    children = children.filter((c) => !positions[c.id]);
    if (!children.length) return;
    visited.clear();
    const widths = children.map((c) => Math.max(subtreeWidth(c.id), NODE_W));
    const total =
      widths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
    let lx = cx - total / 2;
    children.forEach((child, i) => {
      const cw = widths[i];
      placeNode(child.id, lx + cw / 2, y + NODE_H + V_GAP);
      lx += cw + H_GAP;
    });
  }

  let startCX = 0;
  roots.forEach((root) => {
    visited.clear();
    const w = Math.max(subtreeWidth(root.id), NODE_W);
    placeNode(root.id, startCX + w / 2, 40);
    startCX += w + H_GAP * 2;
  });

  if (!Object.keys(positions).length) return;

  const PAD = 40;
  const minX = Math.min(...Object.values(positions).map((p) => p.x));
  const minY = Math.min(...Object.values(positions).map((p) => p.y));
  Object.values(positions).forEach((p) => {
    p.x -= minX - PAD;
    p.y -= minY - PAD;
  });

  const maxX =
    Math.max(...Object.values(positions).map((p) => p.x)) + NODE_W + PAD;
  const maxY =
    Math.max(...Object.values(positions).map((p) => p.y)) + NODE_H + PAD;

  const linesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  linesG.setAttribute("id", "tree-lines");

  // Kumpulkan semua pasangan untuk digambar
  const couples = [];
  members.forEach((m) => {
    if (m.pasanganId && m.id < m.pasanganId) {
      const partner = members.find((p) => p.id === m.pasanganId);
      if (partner) {
        couples.push({
          husband: m.jk === "L" ? m : partner,
          wife: m.jk === "L" ? partner : m,
        });
      }
    }
  });

  Object.entries(positions).forEach(([id, pos]) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    const nodeGen = m.generasi || 1;
    const lineColor = getLineColor(nodeGen);
    const parentIds = [m.ayahId, m.ibuId].filter(
      (pid) => pid && positions[pid],
    );

    if (parentIds.length === 2 && positions[m.ayahId] && positions[m.ibuId]) {
      const ap = positions[m.ayahId],
        bp = positions[m.ibuId];
      const ax = ap.x + NODE_W / 2,
        ay = ap.y + NODE_H;
      const bx = bp.x + NODE_W / 2,
        by = bp.y + NODE_H;
      const midX = (ax + bx) / 2,
        midY = Math.max(ay, by);
      const cx2 = pos.x + NODE_W / 2,
        cy2 = pos.y;
      const junctionY = midY + (cy2 - midY) * 0.35;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        `M${ax},${ay} L${ax},${junctionY} L${bx},${junctionY} L${bx},${by} M${midX},${junctionY} L${cx2},${cy2}`,
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", lineColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linejoin", "round");
      linesG.appendChild(path);
    } else {
      parentIds.forEach((pid) => {
        const pp = positions[pid];
        const x1 = pp.x + NODE_W / 2,
          y1 = pp.y + NODE_H;
        const x2 = pos.x + NODE_W / 2,
          y2 = pos.y;
        const midY = (y1 + y2) / 2;
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute(
          "d",
          `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`,
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", lineColor);
        path.setAttribute("stroke-width", "2.5");
        linesG.appendChild(path);
      });
    }
  });

  // Gambar garis pasangan dengan warna unik dan posisi yang presisi
  couples.forEach((couple) => {
    if (positions[couple.husband.id] && positions[couple.wife.id]) {
      const husbandPos = positions[couple.husband.id];
      const wifePos = positions[couple.wife.id];
      const coupleColor = getCoupleColor(couple.husband.id, couple.wife.id);

      // Tentukan posisi garis berdasarkan posisi relatif
      // Jika suami di kanan istri, garis dari kanan suami ke kiri istri
      // Jika suami di kiri istri, garis dari kiri suami ke kanan istri
      let x1, y1, x2, y2;

      if (husbandPos.x > wifePos.x) {
        // Suami di kanan, istri di kiri
        // Garis dari sisi KIRI suami ke sisi KANAN istri
        x1 = husbandPos.x; // sisi kiri suami
        y1 = husbandPos.y + NODE_H / 2;
        x2 = wifePos.x + NODE_W; // sisi kanan istri
        y2 = wifePos.y + NODE_H / 2;
      } else {
        // Suami di kiri, istri di kanan
        // Garis dari sisi KANAN suami ke sisi KIRI istri
        x1 = husbandPos.x + NODE_W; // sisi kanan suami
        y1 = husbandPos.y + NODE_H / 2;
        x2 = wifePos.x; // sisi kiri istri
        y2 = wifePos.y + NODE_H / 2;
      }

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", coupleColor);
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-dasharray", "8,5");
      linesG.appendChild(line);
    }
  });

  world.appendChild(linesG);

  const nodesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodesG.setAttribute("id", "tree-nodes");

  Object.entries(positions).forEach(([id, pos]) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    const isMale = m.jk === "L";
    const borderColor = isMale ? "#4a7fa5" : "#c47d8e";
    const fillColor = isMale
      ? "rgba(74,127,165,0.18)"
      : "rgba(196,125,142,0.18)";
    const avatarBorder = isMale ? "#4a7fa5" : "#c47d8e";
    const emoji = isMale ? "👨" : "👩";

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
    g.style.cursor = "pointer";

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", NODE_W);
    rect.setAttribute("height", NODE_H);
    rect.setAttribute("rx", 12);
    rect.setAttribute("fill", fillColor);
    rect.setAttribute("stroke", borderColor);
    rect.setAttribute("stroke-width", 2);
    rect.setAttribute("filter", "url(#node-shadow)");
    g.appendChild(rect);

    const AVATAR_R = 22,
      AVATAR_CX = NODE_W / 2,
      AVATAR_CY = 30;
    const avatarBg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    avatarBg.setAttribute("cx", AVATAR_CX);
    avatarBg.setAttribute("cy", AVATAR_CY);
    avatarBg.setAttribute("r", AVATAR_R);
    avatarBg.setAttribute("fill", "#1e2335");
    avatarBg.setAttribute("stroke", avatarBorder);
    avatarBg.setAttribute("stroke-width", 2);
    g.appendChild(avatarBg);

    if (m.foto) {
      const safeId = id.replace(/[^a-zA-Z0-9]/g, "_");
      const clipId = "clip-" + safeId;
      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs",
      );
      const cp = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "clipPath",
      );
      cp.setAttribute("id", clipId);
      const cpC = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      cpC.setAttribute("cx", AVATAR_CX);
      cpC.setAttribute("cy", AVATAR_CY);
      cpC.setAttribute("r", AVATAR_R - 1);
      cp.appendChild(cpC);
      defs.appendChild(cp);
      g.appendChild(defs);
      const imgEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "image",
      );
      imgEl.setAttribute("x", AVATAR_CX - AVATAR_R);
      imgEl.setAttribute("y", AVATAR_CY - AVATAR_R);
      imgEl.setAttribute("width", AVATAR_R * 2);
      imgEl.setAttribute("height", AVATAR_R * 2);
      imgEl.setAttribute("clip-path", "url(#" + clipId + ")");
      imgEl.setAttribute("preserveAspectRatio", "xMidYMid slice");
      const fotoUrl = normalizePhotoUrl(m.foto);
      imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", fotoUrl);
      imgEl.setAttribute("href", fotoUrl);
      imgEl.addEventListener("error", function () {
        this.remove();
        const fb = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text",
        );
        fb.setAttribute("x", AVATAR_CX);
        fb.setAttribute("y", AVATAR_CY + 8);
        fb.setAttribute("text-anchor", "middle");
        fb.setAttribute("font-size", "22");
        fb.textContent = emoji;
        g.appendChild(fb);
      });
      g.appendChild(imgEl);
    } else {
      const txt = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      txt.setAttribute("x", AVATAR_CX);
      txt.setAttribute("y", AVATAR_CY + 8);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("font-size", "22");
      txt.textContent = emoji;
      g.appendChild(txt);
    }

    const nameParts = wrapText(m.nama, 17);
    nameParts.forEach((line, i) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", NODE_W / 2);
      t.setAttribute("y", NODE_H - 22 + i * 14 - (nameParts.length - 1) * 7);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "11");
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-family", "Nunito,sans-serif");
      t.setAttribute("fill", "#e8e4d8");
      t.textContent = line;
      g.appendChild(t);
    });

    const sub = m.tglLahir
      ? m.tglLahir.split("-")[0]
      : m.generasi
        ? "Gen " + m.generasi
        : "";
    if (sub) {
      const yt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      yt.setAttribute("x", NODE_W / 2);
      yt.setAttribute("y", NODE_H - 6);
      yt.setAttribute("text-anchor", "middle");
      yt.setAttribute("font-size", "9");
      yt.setAttribute("font-family", "Nunito,sans-serif");
      yt.setAttribute("fill", "#8890a8");
      yt.textContent = sub;
      g.appendChild(yt);
    }

    g.addEventListener("mouseenter", () =>
      rect.setAttribute("stroke-width", "3"),
    );
    g.addEventListener("mouseleave", () =>
      rect.setAttribute("stroke-width", "2"),
    );
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      openDetail(id);
    });
    nodesG.appendChild(g);
  });
  world.appendChild(nodesG);
  world._bounds = { w: maxX, h: maxY };
  treeFit();
}

function wrapText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  words.forEach((w) => {
    if ((cur + " " + w).trim().length > maxLen) {
      lines.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function applyTransform() {
  const world = document.getElementById("tree-world");
  world.setAttribute(
    "transform",
    `translate(${treeVP.x},${treeVP.y}) scale(${treeVP.scale})`,
  );
  document.getElementById("zoom-label").textContent =
    Math.round(treeVP.scale * 100) + "%";
}

function treeZoom(delta, cx, cy) {
  const container = document.getElementById("tree-container");
  const rect = container.getBoundingClientRect();
  const pivotX = cx !== undefined ? cx : rect.width / 2;
  const pivotY = cy !== undefined ? cy : rect.height / 2;
  const oldScale = treeVP.scale;
  const newScale = Math.min(3, Math.max(0.15, oldScale + delta));
  const ratio = newScale / oldScale;
  treeVP.x = pivotX - ratio * (pivotX - treeVP.x);
  treeVP.y = pivotY - ratio * (pivotY - treeVP.y);
  treeVP.scale = newScale;
  applyTransform();
}

function treeFit() {
  const world = document.getElementById("tree-world");
  const bounds = world._bounds;
  if (!bounds) return;
  const container = document.getElementById("tree-container");
  const W = container.clientWidth || 800;
  const H = container.clientHeight || 500;
  const scale = Math.min(1, Math.min((W - 80) / bounds.w, (H - 60) / bounds.h));
  treeVP.scale = scale;
  treeVP.x = (W - bounds.w * scale) / 2;
  treeVP.y = 30;
  applyTransform();
}

function resetTreeView() {
  document.getElementById("tree-root-select").value = "";
  renderTree();
}

function initTreePan() {
  const container = document.getElementById("tree-container");
  container.addEventListener("mousedown", (e) => {
    if (e.target.closest("g[cursor]") || e.target.closest(".tree-controls"))
      return;
    treePan = { sx: e.clientX - treeVP.x, sy: e.clientY - treeVP.y };
    container.classList.add("panning");
  });
  window.addEventListener("mousemove", (e) => {
    if (!treePan) return;
    treeVP.x = e.clientX - treePan.sx;
    treeVP.y = e.clientY - treePan.sy;
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    treePan = null;
    container.classList.remove("panning");
  });
  container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left,
        cy = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      treeZoom(delta, cx, cy);
    },
    { passive: false },
  );
  let lastTouches = null;
  container.addEventListener(
    "touchstart",
    (e) => {
      lastTouches = e.touches;
    },
    { passive: true },
  );
  container.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouches && lastTouches.length === 1) {
        const dx = e.touches[0].clientX - lastTouches[0].clientX;
        const dy = e.touches[0].clientY - lastTouches[0].clientY;
        treeVP.x += dx;
        treeVP.y += dy;
        applyTransform();
      } else if (
        e.touches.length === 2 &&
        lastTouches &&
        lastTouches.length === 2
      ) {
        const oldDist = Math.hypot(
          lastTouches[0].clientX - lastTouches[1].clientX,
          lastTouches[0].clientY - lastTouches[1].clientY,
        );
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const rect = container.getBoundingClientRect();
        const cx =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        treeZoom((newDist - oldDist) * 0.005, cx, cy);
      }
      lastTouches = e.touches;
    },
    { passive: false },
  );
}

function populateRootSelector() {
  const sel = document.getElementById("tree-root-select");
  const current = sel.value;
  sel.innerHTML = '<option value="">-- Semua (Urut Generasi) --</option>';
  members.forEach((m) => {
    sel.innerHTML += `<option value="${m.id}" ${m.id === current ? "selected" : ""}>${m.nama}</option>`;
  });
}

function populateGenFilter() {
  const gens = [
    ...new Set(members.map((m) => m.generasi).filter(Boolean)),
  ].sort((a, b) => a - b);
  const sel = document.getElementById("filter-gen");
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua Generasi</option>';
  gens.forEach((g) => {
    sel.innerHTML += `<option value="${g}" ${String(g) === current ? "selected" : ""}>Generasi ke-${g}</option>`;
  });
}

function renderStats() {
  const total = members.length,
    laki = members.filter((m) => m.jk === "L").length,
    perempuan = members.filter((m) => m.jk === "P").length,
    wafat = members.filter((m) => m.status === "Wafat").length,
    maxGen = Math.max(...members.map((m) => m.generasi || 0), 0);
  document.getElementById("stats-grid").innerHTML = [
    { label: "Total Anggota", val: total, icon: "👥" },
    { label: "Laki-laki", val: laki, icon: "♂" },
    { label: "Perempuan", val: perempuan, icon: "♀" },
    { label: "Sudah Wafat", val: wafat, icon: "✝" },
    { label: "Generasi Terbanyak", val: maxGen || "—", icon: "🌳" },
  ]
    .map(
      (s) =>
        `<div style="background:var(--surface2);border-radius:10px;padding:14px;border:1px solid var(--border);text-align:center"><div style="font-size:22px;margin-bottom:4px">${s.icon}</div><div style="font-size:22px;font-weight:700;color:var(--accent)">${s.val}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s.label}</div></div>`,
    )
    .join("");
  document.getElementById("member-count").textContent = total + " anggota";
}

function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("view-" + name).classList.add("active");
  if (name === "tree") renderTree();
  if (name === "list") renderList();
  if (name === "settings") renderStats();
}

function renderAll() {
  populateRootSelector();
  populateGenFilter();
  renderList();
  renderStats();
  const activeTab = document.querySelector(".tab.active");
  if (activeTab && activeTab.id === "tab-tree") renderTree();
}

function saveScriptUrl() {
  scriptUrl = document.getElementById("script-url-input").value.trim();
  localStorage.setItem("gsheet_url", scriptUrl);
  toast("URL disimpan! Mencoba koneksi...", "info");
  fetchFromSheets();
}

function clearLocalData() {
  if (
    !confirm("Hapus semua data lokal? Data di Google Sheets tidak terpengaruh.")
  )
    return;
  members = [];
  saveLocalData();
  renderAll();
  toast("Data lokal dihapus", "success");
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(members, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "pohon-keluarga-" + new Date().toISOString().split("T")[0] + ".json";
  a.click();
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        members = data;
        saveLocalData();
        renderAll();
        toast("Data berhasil diimpor: " + data.length + " anggota", "success");
      } else toast("Format file tidak valid", "error");
    } catch {
      toast("Gagal membaca file JSON", "error");
    }
  };
  reader.readAsText(file);
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function setStatus(type, text) {
  const dot = document.getElementById("status-dot");
  const textEl = document.getElementById("status-text");
  dot.className = "status-dot";
  if (type === "loading") dot.classList.add("loading-dot");
  if (type === "offline") dot.classList.add("offline");
  textEl.textContent = text;
}

function toast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

initTreePan();
init();
