# README.md — SI TRANTIBUM v3.3.0 (Final)

```markdown
# SI TRANTIBUM — Satpol PP & Damkar Kab. Trenggalek

Aplikasi manajemen Surat Tugas, Laporan Kegiatan, dan Tindak Lanjut berbasis
**Google Apps Script + Google Spreadsheet**. Frontend single-file
(Vue 3 + Tailwind via CDN), backend Apps Script dengan otorisasi server-side ketat,
audit trail, upload Drive tervalidasi, dan seed otomatis.

**Status:** `v3.3.0` — production-ready (**90/90 test lulus**).

---

## Daftar Isi

1. [Arsitektur](#arsitektur)
2. [Deploy Cepat](#deploy-cepat)
3. [Konfigurasi](#konfigurasi)
4. [Database (Spreadsheet)](#database-spreadsheet)
5. [API Reference](#api-reference)
6. [Role & Workflow](#role--workflow)
7. [Fitur](#fitur)
8. [Keamanan](#keamanan)
9. [Development Roadmap](#development-roadmap)
10. [Troubleshooting](#troubleshooting)
11. [Changelog](#version-history)

---

## Arsitektur

| File | Peran |
|---|---|
| `Code.gs` | **Backend — Core** — `doGet`, lapisan database, auth, seed, upload, audit, lock, cache |
| `Workflow.gs` | **Backend — Workflow** — API ST, Laporan, Tindak Lanjut |
| `Master.gs` | **Backend — Master Data** — CRUD users/activity/regions/villages/signers/violations/assets/agencies |
| `Seed.gs` | **Backend — Seed & Template** — village seed, generator .docx template surat |
| `TestAll.gs` | **Test harness** — 90 assertions, cleanup otomatis |
| `Index.html` | **Frontend** — Vue 3 SPA single-file |
| `appsscript.json` | Manifest — timezone, runtime V8, scopes, config Web App |

**Data flow:**
```
Browser → Index.html (Vue) → google.script.run.apiBootstrap()
                            → google.script.run.apiCreateLetter(payload)
                            → google.script.run.apiUploadFile(base64, name, mime)
   ↓
GAS → withLock_() → resolveActor_() [SESSION-ONLY]
    → assertRole_() → readAll_/appendObject_ → Spreadsheet
   ↓
logAudit_() → sheet audit_logs
```

**Konkurensi & keamanan:**
- `LockService.getScriptLock()` 30 detik, reentrant
- Cache per-execution `_tableCache` — diinvalidate tiap write
- Counter `SEQ_*` & `OFFICIAL_SEQ_*` di Script Properties — atomik
- `resolveActor_` **wajib** Session — fallback hanya via flag dev

---

## Deploy Cepat

### Prasyarat

- Akun Google (Workspace dinas **sangat direkomendasikan**)
- Akses ke Google Spreadsheet + Drive

### Langkah

1. **Spreadsheet database** (disarankan tertaut):
   - Buat Spreadsheet baru di Drive dinas
   - Menu **Extensions → Apps Script** → proyek baru tertaut

2. **Isi 5 file `.gs`** (Code, Workflow, Master, Seed, TestAll):
   - Hapus isi editor bawaan
   - Untuk tiap file: **+ → Script** → nama persis → tempel isi → Save

3. **Buat file HTML `Index`**:
   - Klik **+ → HTML** → nama persis `Index`
   - Tempel seluruh isi `Index.html`

4. **Isi `appsscript.json`**:
   - Project Settings → centang *"Show appsscript.json"*
   - Tempel konfigurasi dari [bagian Konfigurasi](#konfigurasi)

5. **Jalankan `setupDatabase()`** sekali:
   - Dropdown fungsi → `setupDatabase` → **Run**
   - Setujui izin (Spreadsheet, Drive, email, URLfetch)
   - Idempotent — aman dijalankan berulang

6. **Daftarkan email setiap calon user** di sheet `users`:
   - Kolom `email` harus **persis** email Google yang dipakai login
   - Tanpa ini, user akan mendapat "Autentikasi gagal"

7. **Deploy Web App**:
   - **Deploy → New deployment → Web app**
   - Description: `v3.3.0 production`
   - **Execute as:** `User accessing the web app` ← **WAJIB**
   - **Who has access:** `Anyone within [domain dinas]` (ideal) / `Anyone` (fallback)
   - Klik **Deploy** → setujui otorisasi

8. **Verifikasi auth**:
   - Buka Spreadsheet → menu **SI Trantibum → Cek Status Auth (PENTING!)**
   - Pastikan: `ALLOW_INSECURE_AUTH: OFF` + sesi Anda terdeteksi

9. **Jalankan test** (sekali, sebelum UAT):
   - Di editor → pilih fungsi `runAllTests` → Run
   - Ekspektasi: **90 passed, 0 failed** (~2 menit)
   - Flag `ALLOW_INSECURE_AUTH` otomatis di-restore setelah test

### Setiap Kali Update Kode

- **Deploy → Manage deployments → Edit → New version → Deploy**
- URL `/exec` otomatis menyajikan versi terbaru

---

## Konfigurasi

### `appsscript.json`

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

**Kunci konfigurasi:**
- `executeAs: USER_ACCESSING` → **WAJIB**. Tanpa ini, `Session.getActiveUser().getEmail()` mengembalikan email pemilik script, seluruh otorisasi B1 rusak.
- `access: DOMAIN` → ideal untuk Workspace dinas
- `access: ANYONE` → fallback — siapapun bisa login, tapi hanya email terdaftar yang punya hak

### Script Properties

| Key | Nilai | Fungsi |
|---|---|---|
| `SPREADSHEET_ID` | `1oYsru-...` | ID Spreadsheet database |
| `FOLDER_UPLOAD` | `1Y_jX...` | Folder lampiran laporan (B7) |
| `FOLDER_TEMPLATE` | `1_BfAp5g...` | Folder template .docx |
| `SEQ_LETTERS` | `4` | Counter terakhir `ST-004` |
| `SEQ_REPORTS` | `2` | Counter terakhir `LP-002` |
| `SEQ_FOLLOW_UPS` | `3` | Counter terakhir `FU-003` |
| `OFFICIAL_SEQ_2026` | `160` | Nomor surat terakhir `800/160/406.02/2026` |
| `SEEDED_users` | `1` | Flag: users sudah di-seed |
| `SEEDED_villages` | `1` | Flag: villages sudah di-seed |
| `ALLOW_INSECURE_AUTH` | *(tidak ada di prod)* | ⚠️ Hanya untuk test — **HAPUS** sebelum deploy |

**Reset counter** (setelah wipe): jalankan `repairDatabase()` — otomatis reset `SEQ_*` dan `OFFICIAL_SEQ_*`.

---

## Database (Spreadsheet)

**12 sheet:**

| Sheet | Kegunaan |
|---|---|
| `users` | Pegawai & RBAC — id, name, nip, pangkatGol, jenisJabatan, jabatan, unit, email, noHp, role, canSign |
| `activity_types` | 7 jenis kegiatan (3 INTERNAL, 4 TERBATAS) |
| `regions` | 14 Kecamatan dengan risk level |
| `villages` | 135 Desa/Kelurahan |
| `signers` | Pejabat penandatangan (+ pangkatGol) |
| `violations` | Perda & pasal (5 record) |
| `assets` | Kendaraan & peralatan (6 record) |
| `agencies` | Instansi mitra (6 record) |
| `letters` | **34 kolom** — termasuk `signerRank` (baru v3.3.0) |
| `reports` | **26 kolom** — termasuk 4 field dinamis: `objectTarget`, `massEstimate`, `targetAudience`, `materialTopic` |
| `follow_ups` | 14 kolom |
| `audit_logs` | 8 kolom — actor dari Session (bukan payload) |

**Tipe data khusus** (`COLUMN_TYPES`):
- `bool`: `canSign` → `TRUE`/`FALSE`
- `number`: `violatorCount` → Number
- `json`: `specificData`, `personnel`, `assetsUsed`, `agenciesInvolved`, `evidenceList` → JSON string

**Perubahan skema v3.3.0:**
- `letters.signerRank` — **field baru** antara `signerNip` dan `assetsUsed`
- `reports`: 4 field dinamis ditambahkan di akhir
- Migration: jika sheet dibuat versi < 3.3.0, jalankan `repairDatabase({wipe: true, reseed: true})` — **backup dulu** karena wipe menghapus semua data

**Jangan mengubah:** nama sheet, urutan kolom header, nama kolom. **Boleh** menambah baris manual selama header match.

### Menu Spreadsheet

Menu **SI Trantibum** (icon gear):
- **Setup / Seed Database** → `setupDatabase()`
- **Cek Jumlah Data** → `cekDatabase()`
- **Generate Template .docx** → `setupTemplateDocuments()`
- **Cek Status Auth (PENTING!)** → `checkAuthStatus()`
- **⚠ Nonaktifkan Insecure Auth** → `disableInsecureAuth()`

---

## API Reference

Semua fungsi dipanggil dari FE via `google.script.run.*`.

### Auth & Bootstrap

| Fungsi | Return |
|---|---|
| `apiBootstrap()` | `{ version, currentUser, users[], activityTypes[], regions[], villages[], signers[], violations[], assets[], agencies[], letters[], reports[], followUps[], auditLogs[] }` |
| `checkAuthStatus()` | *(editor only)* — log status auth |
| `disableInsecureAuth()` | *(editor only)* — hapus flag dev |

### Surat Tugas

| Fungsi | Return |
|---|---|
| `apiCreateLetter(payload)` | `letter` — `officialNumber` **TIDAK** dari payload, server generate |
| `apiUpdateLetter(id, payload)` | `letter` — `action: 'approve'│'reject'│'issue'│'submit'` |
| `apiDeleteLetter(id, payload)` | `{ ok: true }` |

**Status yang didukung** (v3.3.0):
- `DRAFT` — dari FE "Simpan Draf" (Koordinator/Pimpinan)
- `PENDING_APPROVAL` — dari FE "Ajukan ke Pimpinan" (Koordinator)
- `ISSUED` — dari Pimpinan "Terbitkan" atau approve
- `REJECTED` — dari Pimpinan "Revisi"
- `CANCELLED`, `COMPLETED`

**Business rules:**
- Create: `KOORDINATOR`, `PIMPINAN`, `ADMIN`
- Approve/reject/issue: `PIMPINAN`, `ADMIN`
- `officialNumber` **hanya** dari server (`generateOfficialNumber_`) — payload client **diabaikan** (B2)
- `p.status === "DRAFT"` dihormati — Pimpinan bisa simpan draf tanpa langsung terbit (B3)

### Laporan

| Fungsi | Return |
|---|---|
| `apiCreateReport(payload)` | `report` — terima ST `ISSUED` **atau** `COMPLETED` (B4) |
| `apiUpdateReport(id, payload)` | `report` — `action: 'verify'│'return'│'close'` |
| `apiDeleteReport(id, payload)` | `{ ok: true }` — cascade hapus FU |

**Workflow verify:**
- `action:'verify'` auto-create **1** follow-up dari `recommendation` + `pic` + `deadline` + `priority` dari payload
- FE **tidak boleh** memanggil `apiCreateFollowUp` setelah verify — akan dobel

### Tindak Lanjut

| Fungsi | Guard (v3.3.0) |
|---|---|
| `apiCreateFollowUp(payload)` | `KOORDINATOR`, `PIMPINAN`, `ADMIN` |
| `apiUpdateFollowUp(id, payload)` | **`operational` role** + **PIC-only** untuk `action:'complete'` (B5) |
| `apiDeleteFollowUp(id, payload)` | `KOORDINATOR`, `PIMPINAN`, `ADMIN` |

**B5 rules:** `action:'complete'` hanya boleh oleh:
- PIC yang ditugaskan (`existing.pic === me.name`), ATAU
- Manager (`KOORDINATOR`, `PIMPINAN`, `ADMIN`)

PETUGAS yang bukan PIC akan mendapat error.

### Master Data

| Fungsi | Guard |
|---|---|
| `apiCreateMaster(resource, payload)` | `KOORDINATOR`, `PIMPINAN`, `ADMIN` |
| `apiUpdateMaster(resource, id, payload)` | sama |
| `apiDeleteMaster(resource, id, payload)` | **`PIMPINAN`, `ADMIN`** — **WAJIB payload** (B6) |

`resource` ∈ `users│activityTypes│regions│villages│signers│violations│assets│agencies`

**Reference guards (v3.3.0):**
- Asset yang dipakai ST → ditolak
- Region yang masih punya village → ditolak (**B8** — cegah orphan)
- Activity type yang dipakai → ditolak
- Village/agency yang dipakai → ditolak

### Upload File

| Fungsi | Return |
|---|---|
| `apiUploadFile(base64Data, fileName, mimeType)` | `{ success, url, fileId, shareMode, fileName }` atau `{ success: false, error }` |

**Validasi (B7):**
- MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`
- Max size: 3 MB (binary)
- Nama file disanitasi: karakter ilegal (`\/:*?"<>|`, control chars) → `_`, spasi → `_`, max 120 char
- Sharing: `DOMAIN_WITH_LINK` jika Workspace, fallback `ANYONE_WITH_LINK` dengan warning

---

## Role & Workflow

### 4 Role

| Role | Hak |
|---|---|
| **ADMIN** | Semua aksi termasuk hapus master |
| **KOORDINATOR** | Buat ST (ajukan), verifikasi laporan, kelola FU, hapus master **tidak** |
| **PETUGAS** | Buat laporan, selesaikan FU **hanya jika PIC-nya** |
| **PIMPINAN** | Approve + issue ST, hapus master, semua aksi koordinator |

### Alur ST (v3.3.0)

```
KOORDINATOR / ADMIN
    │
    ├── "Simpan Draf" ──→ DRAFT   (bisa diedit kapan saja)
    │       │
    │       └── "Ajukan ke Pimpinan" ──→ PENDING_APPROVAL
    │                                          │
    │                                          └── PIMPINAN: Setujui & Terbitkan
    │                                                   │
    │                                                   └── ISSUED + nomor resmi
    │
    └── "Ajukan ke Pimpinan" ──→ PENDING_APPROVAL

PIMPINAN
    │
    ├── "Simpan Draf" ──→ DRAFT (tidak langsung terbit — B3)
    ├── "Tanda Tangani & Terbitkan" ──→ ISSUED + nomor server
    └── Approve ST Koordinator ──→ ISSUED + nomor server
```

**Perubahan v3.3.0:** Pimpinan bisa simpan ST sebagai `DRAFT` (patch B3) — sebelumnya Pimpinan selalu auto-`ISSUED`.

### Alur Laporan (v3.3.0)

```
ST berstatus ISSUED atau COMPLETED ──→ PETUGAS buat laporan ──→ SUBMITTED
                                                                  │
                                                                  ├── KOORDINATOR verify → VERIFIED
                                                                  │                              │
                                                                  │                              ├── auto-create FU
                                                                  │                              └── close → CLOSED
                                                                  │
                                                                  └── KOORDINATOR return → RETURNED
                                                                                              │
                                                                                              └── PETUGAS edit & ajukan ulang
```

**B4:** Laporan bisa dibuat dari ST `COMPLETED` — sebelumnya backend menolak.

### Alur Tindak Lanjut

```
PROSES ──→ SELESAI (action:'complete' — PIC atau manager, B5)
   │
   └── OVERDUE jika deadline < hari ini dan status ≠ SELESAI
```

---

## Fitur

### Dashboard
- Hero "Selamat datang, [nama]" + role badge
- 4 metrik: Total ST, Total Laporan, ST TERBATAS, FU aktif + overdue
- Antrean "Tindakan Tertunda" berbasis role
- Bar chart ST per jenis kegiatan
- Agenda ST terdekat
- Timeline audit trail 12 log terakhir

### Surat Tugas
- Form 9 baris: jenis kegiatan, dasar surat, nama kegiatan (datalist usulan + manual), waktu mulai/selesai, kecamatan → desa → nama lokasi, multibox petugas, kendaraan/peralatan, catatan
- Detail pelengkap collapsible: penandatangan, maksud & tujuan
- Tabel + filter: search (debounced 250ms), status, klasifikasi, jenis kegiatan, tahun, bulan
- Aksi: Detail, Setujui, Tolak, Terbitkan, Edit, Cetak PDF, Hapus
- **Print ST** dengan kop resmi, A4 portrait
- **Ekspor CSV** dengan sanitasi formula injection

### Laporan Kegiatan
- Form dinamis berdasarkan `FORM_TEMPLATES` (PATROLI, PENERTIBAN, PENGAMANAN, PEMBINAAN_PENYULUHAN)
- Field dinamis: `violatorCount`, `violationRef`, `actionTaken`, `objectTarget`, `massEstimate`, `targetAudience`, `materialTopic`
- Upload lampiran ke Drive (max 3MB, JPG/PNG/WEBP/PDF)
- Filter: search, status, tahun, bulan
- Aksi: Detail, Verifikasi, Kembalikan, Edit
- **Ekspor CSV & PDF**

### Tindak Lanjut
- Grid card per FU: PIC, prioritas, tenggat, progress, completion
- Filter: Semua, Proses, OVERDUE (merah), Selesai
- Aksi: Edit, Selesaikan (**PIC/manager only**), Tambah Manual

### Rekap & Statistik
- 4 KPI: % penerbitan ST, laporan terverifikasi, total pelanggar, % FU tuntas
- Rekap per jenis kegiatan (ST + Laporan)
- Rekap per wilayah (bar chart)
- ST terbit tanpa laporan

### Admin
- 8 master dengan CRUD penuh + unique check + reference guard
- Master `villages` menampilkan **nama kecamatan** di dropdown (bukan kode) — `options: {value, label}`
- Audit trail 60 log

### Aksesibilitas (patch v3.3.0)
- `aria-label` di tombol ikon
- `for`/`id` di field form ST
- Viewport tanpa `user-scalable=no`
- Esc untuk close modal teratas
- `@click.self` backdrop close
- Debounced search

---

## Keamanan

### Otorisasi Server-Side (B1)

```js
function resolveActor_(payload) {
  const allowInsecure = PropertiesService.getScriptProperties()
    .getProperty("ALLOW_INSECURE_AUTH") === "1";

  if (allowInsecure) {
    // MODE TEST — HANYA untuk TestAll di editor
    console.warn("[SECURITY] Fallback auth aktif");
    return { ...payload, _fallback: true };
  }

  const session = tryResolveUser_();
  if (session) return session;

  throw new Error("Autentikasi gagal: email tidak terdaftar di users");
}
```

**Aturan:**
- Produksi: `ALLOW_INSECURE_AUTH` **tidak boleh ada**
- TestAll: wrapper `runAllTests()` set flag sementara, restore setelah selesai
- Setiap aksi mutasi → `resolveActor_` → `assertRole_`

### Nomor Resmi Server-Side (B2)

```js
// apiCreateLetter — server otoritas tunggal
officialNumber = status === "ISSUED" ? generateOfficialNumber_(year) : "";
// p.officialNumber dari client → DIABAIKAN
```

`generateOfficialNumber_` pakai `LockService` + Script Property `OFFICIAL_SEQ_<tahun>` — atomik, tidak tabrakan.

### Upload Validasi (B7)

Lihat [API Reference → Upload File](#upload-file).

### Cascade Guards
- Hapus ST yang sudah punya laporan → ditolak
- Hapus Laporan → cascade hapus FU terkait
- Hapus Asset/Region/Village/Activity yang direferensikan → ditolak

### XSS & CSV Injection (FE)
- `esc()` — escape HTML di `doPrint`, `exportLettersPdf`, `exportReportsPdf`
- `csvCell()` — prefix `'` untuk sel berawalan `=+-@`

### Audit Trail
Setiap tulis dicatat dengan `actorName` dari Session (bukan payload), `_fallback` tidak dapat bypass.

### Guard Matrix

| Aksi | ADMIN | PIMPINAN | KOORDINATOR | PETUGAS |
|---|---|---|---|---|
| Buat ST (draft) | ✅ | ✅ | ✅ | ❌ |
| Buat ST (submit) | ✅ | ✅ | ✅ | ❌ |
| Approve/reject/issue ST | ✅ | ✅ | ❌ | ❌ |
| Hapus ST | ✅ | ✅ | ✅ | ❌ |
| Buat Laporan | ✅ | ✅ | ✅ | ✅ |
| Verify/return/close Laporan | ✅ | ✅ | ✅ | ❌ |
| Buat FU | ✅ | ✅ | ✅ | ❌ |
| Selesaikan FU (complete) | ✅ | ✅ | ✅ | PIC only |
| CRUD master (create/update) | ✅ | ✅ | ✅ | ❌ |
| Hapus master | ✅ | ✅ | ❌ | ❌ |
| Upload file | ✅ | ✅ | ✅ | ✅ |

---

## Development Roadmap

### Status v3.3.0

| Komponen | Status |
|---|---|
| Backend GAS v3.3.0 (5 file) | ✅ Production-ready |
| Frontend Index.html v3.3.0 | ✅ Sync BE |
| Database seed 12 sheet | ✅ |
| Drive folder + properties | ✅ |
| Test harness | ✅ **90/90 PASS** (~2 menit) |
| Deployment `USER_ACCESSING` | ✅ |
| UAT end-to-end | 🟡 Perlu dijalankan |

### Fase 1 — Selesai ✅

- [x] Backend v3 merge + patch B1–B8
- [x] 12 sheet dengan header + format @
- [x] Action-based workflow
- [x] Cascade delete guard
- [x] Auto-create FollowUp saat verify
- [x] Counter atomik per tahun
- [x] Cache per-execution + lock reentrant
- [x] Audit trail dengan actor Session
- [x] Frontend Vue 3 single-file + 32 patch FE
- [x] Test harness 90 assertions
- [x] Otorisasi server-side ketat (B1)
- [x] Nomor resmi server-only (B2)
- [x] Upload Drive tervalidasi (B7)

### Fase 2 — Prioritas Tinggi (Sprint berikut)

- [ ] **Template cetak Laporan Kegiatan** (Level 2)
- [ ] **Whitelist email domain** di `tryResolveUser_` (defense-in-depth P2)
- [ ] **UAT end-to-end** — 10 skenario
- [ ] **Sosialisasi user** — pelatihan per role + dokumentasi PDF

### Fase 3 — Prioritas Sedang

- [ ] **Migrasi `access: DOMAIN`** (jika Workspace tersedia)
- [ ] **Trigger backup harian** — `backupDatabase()` + time-driven 02:00 WIB
- [ ] **Notifikasi email** — MailApp/GmailApp saat status berubah
- [ ] **Optimasi `ensureSheets_`** — cache per-execution (~40–60% lebih cepat)
- [ ] **Template laporan Level 3** — witnesses, signedBy, 3 kolom TTD

### Fase 4 — Nice-to-have

- [ ] **Auto-generate PDF ke Drive** — ST/LP otomatis setelah final status
- [ ] **Preview gambar lampiran** di detail laporan
- [ ] **Dashboard time-series** — ST per bulan, tren pelanggaran
- [ ] **Mobile PWA** — install to home screen, offline cache
- [ ] **Multi-bahasa** — i18n extract

### Fase 5 — Pemeliharaan Rutin

- [ ] Cek integritas bulanan — `runReadOnlyChecks()`
- [ ] Rotasi backup tahunan
- [ ] Review audit log — deteksi anomali
- [ ] Monitor kuota — GAS 6 menit/execution, 90 menit/day (Workspace)

---

## Troubleshooting

### "Autentikasi gagal: email tidak terdaftar"

**Penyebab:** email Anda tidak ada di sheet `users`, atau `executeAs` salah.

**Solusi:**
1. Buka Spreadsheet → sheet `users` → tambahkan baris dengan email **persis** email Google Anda
2. Cek deployment: **Manage deployments** → `Execute as: User accessing the web app`
3. Jika baru ubah email di sheet, tunggu 1–2 menit atau refresh

### `ALLOW_INSECURE_AUTH` masih aktif di produksi

**Bahaya:** siapa pun bisa kirim `actorRole: "PIMPINAN"` di payload.

**Solusi:**
```
Spreadsheet → menu SI Trantibum → "Cek Status Auth (PENTING!)"
Jika AKTIF: jalankan disableInsecureAuth() dari editor
```

### TestAll: 1 test fail "approvalNote kosong"

**Penyebab:** `apiCreateLetter` masih set `approvalNote = "Diterbitkan langsung..."`.

**Solusi:** cari di `Workflow.gs`:
```js
approvalNote: p.approvalNote || (status === "ISSUED" ? "Diterbitkan..." : ""),
```
ganti jadi:
```js
approvalNote: p.approvalNote || "",
```

### TestAll skip "tidak ada ST dengan asset"

**Penyebab:** data sheet `letters` bergeser 1 kolom (schema < v3.3.0 tanpa `signerRank`).

**Solusi:**
1. Backup Spreadsheet ke `.xlsx`
2. Jalankan `repairDatabase()` dari editor
3. Tunggu ~1 menit, sheet ter-wipe dan re-seed
4. Jalankan `debugLettersSchema()` untuk verifikasi

### Upload lampiran gagal "Tipe file tidak diizinkan"

Hanya JPG/PNG/WEBP/GIF/PDF yang diterima. Konversi dulu ke PDF jika perlu.

### Upload "File melebihi batas 3 MB"

Kompres dulu (image → resize, PDF → merge/compress). Backend menolak **setelah** decode base64, jadi file 3MB binary ≈ 4MB base64 request.

### "Laporan hanya dapat dibuat dari ST berstatus ISSUED atau COMPLETED"

Cek status ST di tabel — kalau `DRAFT` atau `PENDING_APPROVAL`, harus approve dulu.

### "Hanya PIC yang ditugaskan, Koordinator, atau Pimpinan yang dapat menandai tindak lanjut selesai"

Anda PETUGAS dan bukan PIC dari FU tersebut. Minta PIC asli atau Koordinator untuk menandai selesai.

### "Data tidak dapat dihapus, masih direferensikan"

Hapus referensi dulu: ST yang pakai asset, village yang pakai region, dsb.

### Counter nomor ST duplikat

```
Editor → jalankan repairDatabase({wipe: false, reseed: false}) // reset counter saja
ATAU
Cek Script Properties: SEQ_LETTERS, OFFICIAL_SEQ_<tahun>
```

### Kuota Apps Script habis

- Waktu eksekusi 6 menit → data terlalu banyak, pecah query
- Trigger limit / day → tunggu 24 jam
- Optimasi: cache `apiBootstrap` di `CacheService` (TTL 60 detik) — belum diimplementasi

### Durasi `runAllTests` lambat (~4 menit)

Normal untuk 90 assertions. `ensureSheets_` dipanggil tiap API. Optimasi Fase 3 bisa memotong ~60%.

---

## Version History

### v3.3.0 (Oktober 2026) — Current

**Backend patch B1–B8:**
- **B1** — `resolveActor_` tolak fallback role dari client (kecuali `ALLOW_INSECURE_AUTH=1`)
- **B2** — `officialNumber` server-otoritas; payload client diabaikan
- **B3** — Hormati `status: 'DRAFT'` dari Pimpinan/Koordinator
- **B4** — `apiCreateReport` terima ST `COMPLETED` (bukan hanya `ISSUED`)
- **B5** — `apiUpdateFollowUp` role check + PIC-only untuk `action:'complete'`
- **B6** — `apiDeleteMaster(resource, id, payload)` terima payload actor
- **B7** — `apiUploadFile` MIME whitelist + max 3MB + nama sanitasi + sharing terbatas
- **B8** — `countReferences_` region → cek villages (cegah orphan)
- Menu baru: `checkAuthStatus`, `disableInsecureAuth`
- Test harness **90 assertions**, 25 suite

**Frontend patch:**
- **A1–A3** — `submitLetter`/`approve`/`issue` tidak kirim `officialNumber`; toast pakai `res.officialNumber` dari server
- **A4** — hapus `genOfficial()` (fallback random dihapus)
- **B** — `runDelete` kirim `actor.value` ke `apiDeleteMaster`
- 27 patch review sebelumnya tetap (XSS, CSV, a11y, debounce, dll.)

**Schema:**
- `letters.signerRank` (field baru)
- `reports`: 4 field dinamis (`objectTarget`, `massEstimate`, `targetAudience`, `materialTopic`)

### v3.0.0 (Legacy)
- Merge BE v2 + Web App 2
- Otorisasi server-side dasar
- Action-based workflow
- Test harness 76 assertions

### v2.0.0 (Legacy)
- Rewrite dengan otorisasi server-side
- Idempotent seed
- Skema 11 sheet

### v1.0.0 (Legacy)
- Port dari Next.js + PostgreSQL
- Frontend Vue tanpa patch BE v3

---

## Lisensi & Kontak

Aplikasi internal Satpol PP & Damkar Kab. Trenggalek.

**Support:** Administrator Sistem Satpol PP Kab. Trenggalek

**Repository:** *(isi dengan URL GitHub/GitLab jika ada)*
```

---

## 📋 Ringkasan Perubahan README v3.0.0 → v3.3.0

| Area | Sebelum (v3.0.0) | Sesudah (v3.3.0) |
|---|---|---|
| **Version** | 3.0.0 | **3.3.0** |
| **Test assertions** | 76 | **90** (25 suite) |
| **Backend files** | 1 (`Code.gs`) | **5** (Core, Workflow, Master, Seed, TestAll) |
| **Auth security** | Otorisasi server-side dasar | **B1** — strict, tanpa fallback |
| **Nomor ST** | Client atau server | **B2** — server **hanya** |
| **Status DRAFT** | Tidak dihormati Pimpinan | **B3** — Pimpinan bisa simpan draf |
| **Laporan dari COMPLETED** | Ditolak | **B4** — Diterima |
| **FU complete guard** | Bebas | **B5** — PIC-only + manager |
| **Delete master payload** | Opsional | **B6** — Wajib |
| **Upload file** | Tanpa validasi | **B7** — MIME + size + sanitasi |
| **Hapus region** | Orphan villages mungkin | **B8** — Guard referensi |
| **FE `genOfficial()`** | Ada (random) | **Dihapus** (A4) |
| **Toast nomor ST** | Nomor FE (salah) | **Nomor server** (A1–A3) |
| **`ALLOW_INSECURE_AUTH`** | Tidak ada konsep | **Flag dev** dengan menu kontrol |
| **Schema letters** | 33 kolom | **34** (+ signerRank) |
| **Schema reports** | 22 kolom | **26** (+ 4 field dinamis) |
| **Menu Spreadsheet** | 3 item | **5** (+ Auth controls) |
| **Script Properties** | 9 kunci | **11** (+ FOLDER_UPLOAD, ALLOW_INSECURE_AUTH) |
| **Deploy checklist** | 7 langkah | **9** (+ verifikasi auth + test) |

---

## 🎯 State Final Proyek

| Layer | Item | Status |
|---|---|---|
| **Backend** | 5 file GAS v3.3.0 | ✅ B1–B8 terpasang |
| **Frontend** | `Index.html` v3.3.0 | ✅ A1–A4 + B terpasang |
| **Test** | `TestAll.gs` | ✅ **90/90 PASS** |
| **Schema** | 12 sheet + 4 field baru | ✅ Konsisten |
| **Seed** | Idempotent | ✅ |
| **Auth** | Server-side strict | ✅ |
| **Upload** | Validasi + sharing terbatas | ✅ |
| **Dokumentasi** | README v3.3.0 | ✅ ← **file ini** |

**Langkah berikutnya setelah README ini:**

1. **UAT end-to-end** — uji 10 skenario di browser dengan 4 role berbeda
2. **Daftarkan email** semua calon user di sheet `users`
3. **Deploy produksi** — pastikan `checkAuthStatus: OFF`
4. **Sosialisasi** — pelatihan per role + dokumentasi PDF
5. **Monitor** — cek audit log & backup trigger pertama minggu

**Opsional (Fase 3):**
- Optimasi `ensureSheets_` cache (test 4 menit → ~1.5 menit)
- Template cetak Laporan Level 2
- Whitelist email domain

Kalau Anda ingin saya lanjut ke **template cetak Laporan Kegiatan Level 2** (sesuai roadmap Fase 2), beri tahu — saya generate:
- Migration script `migrateReportsSchema()`
- Patch `Code.gs` Workflow (3 field baru: `reportDate`, `personnel`, `conclusion`)
- Patch `Index.html` (form + `doPrintReport()` + tombol Cetak)
- Test scenario baru
