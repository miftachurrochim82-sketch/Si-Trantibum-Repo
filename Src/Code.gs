/**
 * ============================================================================
 * SI TRANTIBUM — SATPOL PP & KEBAKARAN KAB. TRENGGALEK
 * Backend Google Apps Script — FILE 1: CORE (v3.2.0)
 * ============================================================================
 */

const SPREADSHEET_ID = "";              // opsional — isi kalau proyek mandiri
const DB_NAME        = "SI_TRANTIBUM_DB";
const APP_TITLE      = "SI TRANTIBUM — Satpol PPK Kab. Trenggalek";
const SCRIPT_VERSION = "3.2.0";
const DEFAULT_REGION_CODE = "406.02";
const DEFAULT_ROLE   = "PETUGAS";

/* ===========================================================================
 * SKEMA SHEET
 * =========================================================================== */
const SHEETS = {
  users:          ["id","name","nip","pangkatGol","jenisJabatan","jabatan","unit","email","noHp","role","canSign","createdAt","updatedAt"],
  activity_types: ["id","code","name","classification","stCode","reportCode","description","createdAt","updatedAt"],
  regions:        ["id","code","name","risk","createdAt","updatedAt"],
  villages:       ["id","code","name","regionCode","createdAt","updatedAt"],
  
  // UPDATE: Menambahkan pangkatGol untuk penandatangan
  signers:        ["id","name","position","pangkatGol","nip","createdAt","updatedAt"],
  
  violations:     ["id","code","perdaNo","article","description","category","sanction","createdAt","updatedAt"],
  assets:         ["id","code","name","category","spec","condition","createdAt","updatedAt"],
  agencies:       ["id","code","name","contact","createdAt","updatedAt"],
  
  letters:        ["id","code","draftNumber","officialNumber","activityCode","activityName","classification","unit",
                   "title","letterDate","startDate","startTime","endDate","endTime","location","village","locationName",
                   "notes","purpose","legalBasis","specificData","personnel","teamLeader",
                   "signerName","signerPosition","signerNip","signerRank","assetsUsed","agenciesInvolved",
                   "status","approvalNote","createdBy","createdAt","updatedAt"],
                   
  // UPDATE: Menambahkan 4 field dinamis dari Form Laporan
  reports:        ["id","code","letterId","stNumber","activityName","activityCode",
                   "actualTime","actualLocation","description","results","obstacles","recommendation",
                   "violationRef","violatorCount","actionTaken","evidenceList",
                   "status","createdBy","verifiedBy","verificationNote","createdAt","updatedAt",
                   "objectTarget","massEstimate","targetAudience","materialTopic"],
                   
  follow_ups:     ["id","code","reportId","reportCode","actionRequired","pic","picUnit","deadline","priority",
                   "status","progressNote","completionNote","createdAt","updatedAt"],
  audit_logs:     ["id","entity","entityCode","action","actorName","actorRole","detail","createdAt"],
};

const COLUMN_TYPES = {
  canSign: "bool",
  violatorCount: "number",
  specificData: "json", personnel: "json", assetsUsed: "json",
  agenciesInvolved: "json", evidenceList: "json",
};

const MASTER_SHEETS = {
  users: "users", activityTypes: "activity_types", regions: "regions", villages: "villages",
  signers: "signers", violations: "violations", assets: "assets", agencies: "agencies",
};

const UNIQUE_FIELDS = {
  users: ["email"], activity_types: ["code"], regions: ["code"], villages: ["code"],
  signers: [], violations: ["code"], assets: ["code"], agencies: ["code"],
};

const ROLE_RULES = {
  admin:      ["ADMIN"],
  manager:    ["ADMIN", "PIMPINAN", "KOORDINATOR"],
  pimpinan:   ["ADMIN", "PIMPINAN"],
  operational:["ADMIN", "PIMPINAN", "KOORDINATOR", "PETUGAS"],
};

/* ===========================================================================
 * PER-EXECUTION STATE
 * =========================================================================== */
let _tableCache = {};
let _lockDepth = 0;

function invalidateTable_(name) { _tableCache[name] = null; }
function invalidateAllTables_() { _tableCache = {}; }

function withLock_(fn) {
  if (_lockDepth > 0) return fn();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  _lockDepth++;
  try { return fn(); }
  finally { _lockDepth--; lock.releaseLock(); }
}

/* ===========================================================================
 * ENTRY POINT
 * =========================================================================== */
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("SI Trantibum")
      .addItem("Setup / Seed Database", "setupDatabase")
      .addItem("Cek Jumlah Data", "cekDatabase")
      .addItem("Generate Template .docx", "setupTemplateDocuments")
      .addToUi();
  } catch (e) { /* bukan spreadsheet-bound */ }
}

function setupDatabase() {
  withLock_(function () { ensureSeed_(); });
  const ss = getDb_();
  Logger.log("Database siap: " + ss.getUrl());
  try { SpreadsheetApp.getUi().alert("Database SI TRANTIBUM siap.\n" + ss.getUrl()); } catch (e) {}
}

function cekDatabase() {
  const out = {};
  Object.keys(SHEETS).forEach(function (n) { out[n] = readAll_(n).length; });
  Logger.log(JSON.stringify(out, null, 2));
  try { SpreadsheetApp.getUi().alert(JSON.stringify(out, null, 2)); } catch (e) {}
}

/* ===========================================================================
 * API BOOTSTRAP
 * =========================================================================== */
function apiBootstrap() {
  return withLock_(function () {
    ensureSeed_();
    const me = tryResolveUser_();
    const canSeeAudit = !me || ROLE_RULES.pimpinan.indexOf(me.role) > -1;

    const letters = readAll_("letters").sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    const reports = readAll_("reports").sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    const followUps = readAll_("follow_ups").sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    const auditLogs = canSeeAudit
      ? readAll_("audit_logs").sort(function (a, b) {
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        }).slice(0, 60)
      : [];

    return {
      version: SCRIPT_VERSION,
      currentUser: me ? { 
        name: me.name, 
        role: me.role, 
        unit: me.unit, 
        canSign: me.canSign, 
        email: me.email,
        jabatan: me.jabatan,
        pangkatGol: me.pangkatGol,
        noHp: me.noHp
      } : null,
      users: readAll_("users"),
      activityTypes: readAll_("activity_types"),
      regions: readAll_("regions"),
      villages: readAll_("villages"),
      signers: readAll_("signers"),
      violations: readAll_("violations"),
      assets: readAll_("assets"),
      agencies: readAll_("agencies"),
      letters: letters,
      reports: reports,
      followUps: followUps,
      auditLogs: auditLogs,
    };
  });
}

/* ===========================================================================
 * AUTH LAYER
 * =========================================================================== */
function tryResolveUser_() {
  let email = "";
  try { email = String(Session.getActiveUser().getEmail() || "").toLowerCase(); } catch (e) { email = ""; }
  if (!email) return null;
  const u = readAll_("users").filter(function (x) {
    return String(x.email || "").toLowerCase() === email;
  })[0];
  if (!u) return null;
  return {
    id: u.id, 
    name: u.name, 
    email: u.email, 
    nip: u.nip,
    pangkatGol: u.pangkatGol || "",
    jenisJabatan: u.jenisJabatan || "",
    jabatan: u.jabatan || "",
    noHp: u.noHp || "",
    role: normalizeRole_(u.role), 
    unit: u.unit || "",
    canSign: u.canSign === true || normalizeRole_(u.role) === "PIMPINAN",
  };
}

function resolveActor_(payload) {
  const session = tryResolveUser_();
  if (session) return session;

  const p = payload || {};
  const name = String(p.actorName || p.createdBy || "Pengguna").trim() || "Pengguna";
  const role = normalizeRole_(p.actorRole || DEFAULT_ROLE);
  const users = readAll_("users");
  const u = users.filter(function (x) { return String(x.name) === name; })[0]
         || users.filter(function (x) { return normalizeRole_(x.role) === role; })[0]
         || {};
  return {
    id: u.id || "", name: name, role: role, unit: u.unit || "",
    canSign: role === "PIMPINAN" || u.canSign === true,
    email: u.email || "", nip: u.nip || "",
    _fallback: true,
  };
}

function assertRole_(user, allowed, message) {
  if (!user || allowed.indexOf(user.role) === -1) {
    throw new Error(message || ("Akses ditolak. Role " + (user && user.role) + " tidak diizinkan."));
  }
}

/* ===========================================================================
 * DATABASE LAYER
 * =========================================================================== */
function getDb_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);

  const props = PropertiesService.getScriptProperties();
  const propId = props.getProperty("SPREADSHEET_ID")
              || props.getProperty("SI_TRANTIBUM_SPREADSHEET_ID");
  if (propId) {
    try {
      const ss = SpreadsheetApp.openById(propId);
      if (!props.getProperty("SPREADSHEET_ID")) {
        props.setProperty("SPREADSHEET_ID", propId);
        Logger.log("ℹ Migrasi SPREADSHEET_ID: " + propId);
      }
      return ss;
    } catch (e) {
      Logger.log("⚠ SPREADSHEET_ID di properties tidak dapat dibuka: " + e.message);
    }
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty("SPREADSHEET_ID", active.getId());
    return active;
  }

  const files = DriveApp.getFilesByName(DB_NAME);
  if (files.hasNext()) {
    const ss = SpreadsheetApp.open(files.next());
    props.setProperty("SPREADSHEET_ID", ss.getId());
    return ss;
  }

  const created = SpreadsheetApp.create(DB_NAME);
  props.setProperty("SPREADSHEET_ID", created.getId());
  Logger.log("✓ DB baru dibuat: " + created.getUrl());
  return created;
}

function ensureSheets_() {
  const ss = getDb_();
  Object.keys(SHEETS).forEach(function (name) {
    try {
      let sh = ss.getSheetByName(name);
      if (!sh) sh = ss.insertSheet(name);

      // 1. Lepas merge
      try { sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart(); } catch(e) {}

      const headers = SHEETS[name];
      const lastRow = sh.getLastRow();
      const firstRow = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
      const isEmpty = lastRow === 0 || firstRow.join("") === "";

      // 2. Tulis Header & Format
      if (isEmpty) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
        try {
          sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#064e3b").setFontColor("#ffffff");
        } catch(e) { /* Abaikan error UI */ }
      } else {
        headers.forEach(function (h, i) {
          try {
            const cell = sh.getRange(1, i + 1);
            if (cell.getDisplayValue() !== h) {
              cell.setValue(h).setFontWeight("bold").setBackground("#064e3b").setFontColor("#ffffff");
            }
          } catch(e) { /* Abaikan error UI */ }
        });
      }

      // 3. Format Teks (@)
      try {
        for (let i = 1; i <= headers.length; i++) {
          sh.getRange(1, i, Math.max(sh.getMaxRows(), 2), 1).setNumberFormat("@");
        }
      } catch (e) { /* Abaikan error UI */ }
      
    } catch (err) {
      // Sembunyikan error 'sedang diketik' agar log bersih
      if (String(err.message).indexOf("sedang diketik") === -1) {
        Logger.log("Gagal memproses sheet " + name + ": " + err.message);
      }
    }
  });
  return ss;
}

function getSheet_(name) {
  const ss = getDb_();
  let sh = ss.getSheetByName(name);
  if (!sh) { ensureSheets_(); sh = ss.getSheetByName(name); }
  return sh;
}

function serialize_(field, value) {
  if (value === null || value === undefined) return "";
  const type = COLUMN_TYPES[field];
  if (type === "json") return typeof value === "string" ? value : JSON.stringify(value);
  if (type === "bool") return (value === true || value === "TRUE" || value === "true") ? "TRUE" : "FALSE";
  if (type === "number") { const n = Number(value); return isFinite(n) ? String(n) : "0"; }
  
  let strVal = String(value);
  
  // TRICK: Tambahkan apostrof jika berawalan 0 atau field tertentu
  if (strVal.startsWith("'")) strVal = strVal.substring(1);
  if (strVal.match(/^0\d+$/) || ["nip", "noHp", "nik", "contact", "code"].includes(field)) {
    return "'" + strVal;
  }
  
  return strVal;
}

function deserialize_(field, raw) {
  const type = COLUMN_TYPES[field];
  if (type === "bool") return raw === "TRUE" || raw === "true";
  if (type === "number") { const n = Number(raw); return isFinite(n) ? n : 0; }
  if (type === "json") {
    if (!raw) return field === "specificData" ? {} : [];
    try { return JSON.parse(raw); } catch (e) { return field === "specificData" ? {} : []; }
  }
  
  let str = raw === undefined || raw === null ? "" : String(raw);
  if (str.startsWith("'")) str = str.substring(1); // Bersihkan apostrof jika terbaca
  return str;
}

function readAll_(name) {
  if (_tableCache[name]) return _tableCache[name];

  const sh = getSheet_(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) { _tableCache[name] = []; return []; }

  const headers = SHEETS[name];
  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const out = [];
  values.forEach(function (r) {
    if (r.join("").trim() === "") return;
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = deserialize_(h, r[i]); });
    out.push(obj);
  });
  _tableCache[name] = out;
  return out;
}

function appendObject_(name, obj) {
  const sh = getSheet_(name);
  const headers = SHEETS[name];
  const rowValues = headers.map(function (h) { return serialize_(h, obj[h]); });
  
  // Tambahkan baris baru
  sh.appendRow(rowValues);
  
  // Tulis ulang nilainya untuk mencegah auto-parse Google Sheets
  const lastRow = sh.getLastRow();
  try {
    sh.getRange(lastRow, 1, 1, headers.length).setValues([rowValues]);
  } catch (e) {
    Logger.log("⚠ Gagal overwrite row di " + name + ": " + e.message);
  }
  
  invalidateTable_(name);
  return obj;
}

function findRowIndexById_(name, id) {
  const sh = getSheet_(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return -1;
}

function findObjectById_(name, id) {
  const rowIdx = findRowIndexById_(name, id);
  if (rowIdx < 0) return null;
  const headers = SHEETS[name];
  const raw = getSheet_(name).getRange(rowIdx, 1, 1, headers.length).getDisplayValues()[0];
  const obj = {};
  headers.forEach(function (h, i) { obj[h] = deserialize_(h, raw[i]); });
  return obj;
}

function updateById_(name, id, patch) {
  const headers = SHEETS[name];
  const rowIdx = findRowIndexById_(name, id);
  if (rowIdx < 0) return null;
  const sh = getSheet_(name);
  const currentRaw = sh.getRange(rowIdx, 1, 1, headers.length).getDisplayValues()[0];
  const current = {};
  headers.forEach(function (h, i) { current[h] = deserialize_(h, currentRaw[i]); });
  
  const merged = Object.assign({}, current, patch || {});
  merged.id = current.id;
  
  const rowValues = headers.map(function (h) { return serialize_(h, merged[h]); });
  
  try {
    sh.getRange(rowIdx, 1, 1, headers.length).setValues([rowValues]);
  } catch (e) {
    Logger.log("⚠ Gagal update row di " + name + ": " + e.message);
  }
  
  invalidateTable_(name);
  return merged;
}

function deleteById_(name, id) {
  const rowIdx = findRowIndexById_(name, id);
  if (rowIdx > 0) {
    getSheet_(name).deleteRow(rowIdx);
    invalidateTable_(name);
  }
}

function nextSeq_(name) {
  const props = PropertiesService.getScriptProperties();
  const key = "SEQ_" + name.toUpperCase();
  let current = Number(props.getProperty(key) || 0);
  if (!current) {
    current = readAll_(name).reduce(function (max, r) {
      const m = String(r.code || "").match(/(\d+)\s*$/);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
  }
  const next = current + 1;
  props.setProperty(key, String(next));
  return next;
}

function generateOfficialNumber_(year) {
  const y = String(year || new Date().getFullYear());
  const props = PropertiesService.getScriptProperties();
  const key = "OFFICIAL_SEQ_" + y;
  let current = Number(props.getProperty(key) || 0);
  if (!current) {
    current = readAll_("letters").reduce(function (max, l) {
      const num = String(l.officialNumber || "");
      const m = num.match(/^800\/(\d+)\//);
      if (!m) return max;
      if (num.indexOf("/" + y) === -1) return max;
      return Math.max(max, Number(m[1]));
    }, 120);
  }
  const next = current + 1;
  props.setProperty(key, String(next));
  return "800/" + next + "/" + DEFAULT_REGION_CODE + "/" + y;
}

/* ===========================================================================
 * UTILITAS
 * =========================================================================== */
function logAudit_(entity, entityCode, action, actorName, actorRole, detail) {
  try {
    appendObject_("audit_logs", {
      id: Utilities.getUuid(),
      entity: entity || "",
      entityCode: entityCode || "",
      action: action || "",
      actorName: actorName || "",
      actorRole: normalizeRole_(actorRole || DEFAULT_ROLE),
      detail: detail || "",
      createdAt: nowIso_(),
    });
  } catch (e) { /* audit tidak boleh memblok aksi utama */ }
}

function normalizeRole_(role) {
  const r = String(role || DEFAULT_ROLE).toUpperCase();
  return r === "OPERATOR" ? "KOORDINATOR" : r;
}

function resolveYear_(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})/);
  return m ? m[1] : String(new Date().getFullYear());
}

function nowIso_() { return new Date().toISOString(); }
function pad_(n, len) { let s = String(n); while (s.length < len) s = "0" + s; return s; }

function dateOffset_(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/** Ambil folder dari Script Properties berdasarkan key (mis. FOLDER_TEMPLATE). */
function getFolder_(key) {
  const id = PropertiesService.getScriptProperties().getProperty(key);
  if (!id) throw new Error("Property " + key + " belum diset. Jalankan setDriveFolderIds().");
  return DriveApp.getFolderById(id);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ===========================================================================
 * UPLOAD FILE (BASE64 KE GOOGLE DRIVE)
 * =========================================================================== */
function apiUploadFile(base64Data, fileName, mimeType) {
  try {
    // Ambil ID Folder dari Script Properties
    const folderId = PropertiesService.getScriptProperties().getProperty("FOLDER_UPLOAD");
    if (!folderId) {
      throw new Error("Folder ID belum diset. Jalankan setDriveFolderUploadId() dari editor GAS terlebih dahulu.");
    }
    
    const folder = DriveApp.getFolderById(folderId);
    
    // Pisahkan header Base64 (data:image/png;base64,) dengan datanya
    const splitData = base64Data.split(',');
    const actualBase64 = splitData.length > 1 ? splitData[1] : splitData[0];
    
    // Buat file di Google Drive
    const blob = Utilities.newBlob(Utilities.base64Decode(actualBase64), mimeType, fileName);
    const file = folder.createFile(blob);
    
    // Atur izin file agar bisa dilihat oleh siapa saja yang memiliki link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Kembalikan URL file
    return { success: true, url: file.getUrl() };
  } catch (e) {
    Logger.log("Upload Error: " + e.message);
    return { success: false, error: e.message };
  }
}

/* ===========================================================================
 * SETUP FOLDER DRIVE
 * =========================================================================== */
/** 
 * Jalankan fungsi ini SATU KALI dari editor GAS untuk mengatur folder penyimpanan file.
 * Ganti 'ID_FOLDER_DRIVE_ANDA' dengan ID folder yang ada di URL Google Drive Anda.
 * (Contoh URL: https://drive.google.com/drive/folders/1A2b3C4d5E6f...)
 */
function setDriveFolderUploadId() {
  const folderId = "1Y_jXJHF7C0ahVAGYcV4KH9fCY_ybAqDD"; // <--- GANTI DENGAN ID FOLDER ANDA
  
  if (folderId === "ID_FOLDER_DRIVE_ANDA") {
    Logger.log("⚠ Anda belum mengganti 'ID_FOLDER_DRIVE_ANDA' dengan ID folder asli.");
    return;
  }
  
  PropertiesService.getScriptProperties().setProperty("FOLDER_UPLOAD", folderId);
  Logger.log("Folder Upload berhasil diset: " + folderId);
}
