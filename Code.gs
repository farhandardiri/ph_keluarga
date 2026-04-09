// ============================================================
// POHON KELUARGA - Google Apps Script Backend
// Salin seluruh kode ini ke Google Apps Script
// ============================================================

// Ganti dengan Spreadsheet ID Anda
// (ambil dari URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit)
const SPREADSHEET_ID = "masukkan_id";
const SHEET_NAME = "Anggota";

// ============================================================
// HANDLER UTAMA — doGet untuk semua operasi via URL parameter
// Solusi CORS: semua request dari browser pakai GET + ?action=&data=
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action || "";
    const rawData = e.parameter.data
      ? JSON.parse(decodeURIComponent(e.parameter.data))
      : null;

    let result;
    if (action === "getAll")
      result = { status: "ok", members: getAllMembers() };
    else if (action === "add") {
      addMember(rawData);
      result = { status: "ok", message: "Ditambahkan" };
    } else if (action === "update") {
      updateMember(rawData);
      result = { status: "ok", message: "Diperbarui" };
    } else if (action === "delete") {
      deleteMember(rawData.id);
      result = { status: "ok", message: "Dihapus" };
    } else
      result = { status: "error", message: "Action tidak dikenal: " + action };

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// doPost tetap ada sebagai fallback
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, member } = body;
    let result;
    if (action === "add") {
      addMember(member);
      result = { status: "ok", message: "Ditambahkan" };
    } else if (action === "update") {
      updateMember(member);
      result = { status: "ok", message: "Diperbarui" };
    } else if (action === "delete") {
      deleteMember(member.id);
      result = { status: "ok", message: "Dihapus" };
    } else if (action === "getAll")
      result = { status: "ok", members: getAllMembers() };
    else result = { status: "error", message: "Action tidak dikenal" };
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ============================================================
// CRUD
// ============================================================
function getAllMembers() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet
    .getRange(2, 1, lastRow - 1, 13)
    .getValues()
    .filter((r) => r[0] !== "")
    .map((r) => ({
      id: String(r[0] || ""),
      nama: String(r[1] || ""),
      jk: String(r[2] || ""),
      tempatLahir: String(r[3] || ""),
      tglLahir: fmtDate(r[4]),
      status: String(r[5] || ""),
      tglWafat: fmtDate(r[6]),
      ayahId: String(r[7] || ""),
      ibuId: String(r[8] || ""),
      pasanganId: String(r[9] || ""),
      generasi: r[10] ? Number(r[10]) : "",
      catatan: String(r[11] || ""),
      foto: String(r[12] || ""),
    }));
}

function addMember(m) {
  getOrCreateSheet().appendRow(toRow(m));
}

function updateMember(m) {
  const sheet = getOrCreateSheet();
  const row = findRow(sheet, m.id);
  if (row === -1) {
    addMember(m);
    return;
  }
  sheet.getRange(row, 1, 1, 13).setValues([toRow(m)]);
}

function deleteMember(id) {
  const sheet = getOrCreateSheet();
  const row = findRow(sheet, id);
  if (row !== -1) sheet.deleteRow(row);
}

// ============================================================
// HELPER
// ============================================================
function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      "ID",
      "Nama",
      "Jenis Kelamin",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Status",
      "Tanggal Wafat",
      "ID Ayah",
      "ID Ibu",
      "ID Pasangan",
      "Generasi",
      "Catatan",
      "URL Foto",
    ];
    const r = sheet.getRange(1, 1, 1, headers.length);
    r.setValues([headers]);
    r.setFontWeight("bold");
    r.setBackground("#1a1a2e");
    r.setFontColor("#c9a96e");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function toRow(m) {
  return [
    m.id || "",
    m.nama || "",
    m.jk || "",
    m.tempatLahir || "",
    m.tglLahir || "",
    m.status || "",
    m.tglWafat || "",
    m.ayahId || "",
    m.ibuId || "",
    m.pasanganId || "",
    m.generasi || "",
    m.catatan || "",
    m.foto || "",
  ];
}

function fmtDate(v) {
  if (!v) return "";
  if (v instanceof Date) {
    return (
      v.getFullYear() +
      "-" +
      String(v.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(v.getDate()).padStart(2, "0")
    );
  }
  return String(v);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ============================================================
// TEST — Jalankan testSemua() dari editor untuk verifikasi
// ============================================================
function testSemua() {
  const sheet = getOrCreateSheet();
  Logger.log("✅ Sheet OK: " + sheet.getName());

  const id = "TEST_" + Date.now();
  addMember({
    id,
    nama: "Uji Coba",
    jk: "L",
    tempatLahir: "Jakarta",
    tglLahir: "1980-01-01",
    status: "Hidup",
    tglWafat: "",
    ayahId: "",
    ibuId: "",
    pasanganId: "",
    generasi: 1,
    catatan: "Tes",
    foto: "",
  });
  Logger.log("✅ Tambah OK");

  const all = getAllMembers();
  Logger.log("✅ Baca OK — " + all.length + " anggota");

  updateMember({
    id,
    nama: "Uji Coba UPDATED",
    jk: "L",
    tempatLahir: "Bandung",
    tglLahir: "1980-01-01",
    status: "Hidup",
    tglWafat: "",
    ayahId: "",
    ibuId: "",
    pasanganId: "",
    generasi: 1,
    catatan: "Diupdate",
    foto: "",
  });
  Logger.log("✅ Update OK");

  deleteMember(id);
  Logger.log("✅ Hapus OK");
  Logger.log("🎉 Semua CRUD berjalan normal!");
}
