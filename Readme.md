# README.md — SI TRANTIBUM v3.0.0 (Merged)

Berikut README hasil merge kedua versi, disesuaikan dengan state aktual v3.0.0, plus roadmap pengembangan.

---

```markdown
# SI TRANTIBUM — Satpol PP & Damkar Kab. Trenggalek

Aplikasi manajemen Surat Tugas, Laporan Kegiatan, dan Tindak Lanjut berbasis
**Google Apps Script + Google Spreadsheet**. Frontend single-file
(Vue 3 + Tailwind via CDN), backend Apps Script dengan otorisasi server-side,
audit trail, dan seed otomatis.

**Status:** `v3.0.0` — production-ready (76/76 test lulus, UAT siap).

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

---

## Arsitektur

| File | Peran |
|---|---|
| `Code.gs` | **Backend** — `doGet`, lapisan database, seed, API CRUD + audit + lock + cache |
| `Index.html` | **Frontend** — Vue 3 SPA single-file, dashboard, ST, laporan, tindak lanjut, 8 master data, cetak ST |
| `TestAll.gs` | Test harness (76 assertions, cleanup otomatis) |
| `appsscript.json` | Manifest — timezone, runtime V8, scope, config Web App |

**Data flow:**
```
Browser → Index.html (Vue) → google.script.run.apiBootstrap()
                            → google.script.run.apiCreateLetter(payload)
   ↓
Code.gs → withLock_() → readAll_() / appendObject_() → Spreadsheet
   ↓
logAudit_() → sheet audit_logs
```

**Konkurensi:**
- `LockService.getScriptLock()` 30 detik, reentrant
- Cache per-execution `_tableCache` — diinvalidate tiap write
- Counter `SEQ_*` di Script Properties — deterministik

---

## Deploy Cepat

### Prasyarat

- Akun Google (Workspace dinas **direkomendasikan**, Gmail pribadi juga bisa)
- Akses ke Google Spreadsheet + Drive

### Langkah

1. **Spreadsheet database** (disarankan tertaut):
   - Buat Spreadsheet baru di Drive dinas
   - Menu **Extensions → Apps Script** → proyek baru tertaut

2. **Isi `Code.gs`**:
   - Hapus isi editor bawaan
   - Tempel seluruh isi `Code.gs`
   - Simpan (Ctrl+S)

3. **Buat file HTML `Index`**:
   - Klik **+** → **HTML** → nama persis `Index`
   - Tempel seluruh isi `Index.html`

4. **Isi `appsscript.json`** (opsional tapi penting):
   - Project Settings → centang *"Show appsscript.json manifest file"*
   - Edit file `appsscript.json`
   - Tempel konfigurasi dari [bagian Konfigurasi](#konfigurasi)

5. **Jalankan `setupDatabase()`** sekali:
   - Dropdown fungsi → pilih `setupDatabase` → **Run**
   - Setujui izin Spreadsheet + Drive + email
   - Sheet otomatis dibuat dan di-seed
   - Seed juga idempotent — aman dijalankan berulang

6. **Deploy Web App**:
   - **Deploy → New deployment → Web app**
   - Description: `v3.0.0 auth server-side`
   - **Execute as:** `User accessing the web app`
   - **Who has access:** `Anyone within [domain dinas]` (ideal) / `Anyone` (fallback)
   - Klik **Deploy** → setujui otorisasi

7. **Salin URL** Web App (`https://script.google.com/macros/s/…/exec`) dan sebarkan ke petugas.

### Setiap Kali Update Kode

- **Deploy → Manage deployments → Edit → Version: New version → Deploy**
- URL `/exec` otomatis menyajikan versi terbaru
- URL `/dev` untuk testing cepat (hanya akun pemilik)

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
- `executeAs: USER_ACCESSING` → **WAJIB** agar `Session.getActiveUser().getEmail()` mengembalikan email petugas yang login (bukan email pemilik script). Tanpa ini, seluruh otorisasi server-side lumpuh.
- `access: DOMAIN` → ideal untuk Workspace dinas (hanya akun `@trenggalekkab.go.id`)
- `access: ANYONE` → fallback (siapapun bisa login Google, tapi hanya email terdaftar di sheet `users` yang punya hak)

### Script Properties

Setelah setup berjalan, Script Properties berisi:

| Key | Nilai | Fungsi |
|---|---|---|
| `SPREADSHEET_ID` | `1oYsru-...` | ID Spreadsheet database |
| `ROOT_FOLDER_ID` | `1AfuyXe5...` | Root folder `SI-TRANTIBUM` |
| `FOLDER_DATABASE` | `1AzYFAxx...` | Folder `01-Database` |
| `FOLDER_BACKUP` | `1N6eihZt...` | Folder `02-Backup` |
| `FOLDER_BACKUP_ARSIP` | `1iXsYfta...` | Folder `02-Backup/arsip` |
| `FOLDER_BUKTI` | `1YdAyJv5...` | Folder `03-Bukti-Kegiatan` |
| `FOLDER_ST_PDF` | `1P05hNdp...` | Folder `04-Surat-Tugas-PDF` |
| `FOLDER_LP_PDF` | `1GWogWKS...` | Folder `05-Laporan-PDF` |
| `FOLDER_TEMPLATE` | `1_BfAp5g...` | Folder `06-Template` |
| `SEQ_LETTERS` | `4` | Counter terakhir `ST-004` |
| `SEQ_REPORTS` | `2` | Counter terakhir `LP-002` |
| `SEQ_FOLLOW_UPS` | `3` | Counter terakhir `FU-003` |
| `OFFICIAL_SEQ_2026` | `144` | Nomor resmi surat terakhir `800/144/...` |
| `SEEDED_users` | `1` | Flag: users sudah di-seed |
| `SEEDED_villages` | `1` | Flag: villages sudah di-seed |

### Struktur Folder Drive

```
SI-TRANTIBUM/
├── 01-Database/          ← Spreadsheet utama
├── 02-Backup/            ← Backup JSON harian
│   └── arsip/            ← Backup > 30 hari
├── 03-Bukti-Kegiatan/    ← Upload evidence (future)
├── 04-Surat-Tugas-PDF/   ← Arsip cetak ST
├── 05-Laporan-PDF/       ← Arsip cetak LP
└── 06-Template/          ← Template dokumen
```

---

## Database (Spreadsheet)

**12 sheet, 1 sheet = 1 tabel:**

| Sheet | Kegunaan | Kolom |
|---|---|---|
| `users` | Pegawai & RBAC | id, name, nip, email, role, unit, canSign, createdAt, updatedAt |
| `activity_types` | 7 jenis kegiatan | id, code, name, classification, stCode, reportCode, description, timestamps |
| `regions` | Kecamatan | id, code, name, risk, timestamps |
| `villages` | Desa/kelurahan (135 desa, 14 kecamatan) | id, code, name, regionCode, timestamps |
| `signers` | Pejabat penandatangan | id, name, position, nip, timestamps |
| `violations` | Perda & pasal | id, code, perdaNo, article, description, category, sanction, timestamps |
| `assets` | Kendaraan & peralatan | id, code, name, category, spec, condition, timestamps |
| `agencies` | Instansi mitra | id, code, name, contact, timestamps |
| `letters` | Surat Tugas | 33 kolom — lihat `SHEETS.letters` di Code.gs |
| `reports` | Laporan kegiatan | 22 kolom |
| `follow_ups` | Tindak lanjut | 14 kolom |
| `audit_logs` | Jejak aktivitas | id, entity, entityCode, action, actorName, actorRole, detail, createdAt |

**Format kolom:**
- Semua kolom diformat **plain text (`@`)** — mencegah Google Sheets auto-parse tanggal `2026-10-20`, jam `19:00`, atau JSON
- Tipe data khusus di `COLUMN_TYPES`:
  - `bool`: `canSign` → `TRUE`/`FALSE`
  - `number`: `violatorCount` → `Number`
  - `json`: `specificData`, `personnel`, `assetsUsed`, `agenciesInvolved`, `evidenceList` → JSON string

**Jangan mengubah:**
- Nama sheet
- Urutan kolom (header baris 1)
- Nama kolom (baca berdasarkan header)

**Boleh menambah baris manual** selama mengikuti header.

### Menu Spreadsheet

Menu **SI Trantibum** di Spreadsheet (icon gear di toolbar):
- **Setup / Seed Database** — panggil `setupDatabase()`
- **Cek Jumlah Data** — panggil `cekDatabase()`

---

## API Reference

Semua fungsi dipanggil dari frontend via `google.script.run.*`.

### Bootstrap

| Fungsi | Argumen | Return |
|---|---|---|
| `apiBootstrap()` | — | `{ version, currentUser, users[], activityTypes[], regions[], villages[], signers[], violations[], assets[], agencies[], letters[], reports[], followUps[], auditLogs[] }` |

### Surat Tugas

| Fungsi | Argumen | Return |
|---|---|---|
| `apiCreateLetter(payload)` | `{ title, legalBasis, letterDate, startDate, startTime, endDate, endTime, location, village, locationName, activityCode, activityName, classification, unit, purpose, specificData{}, personnel[], teamLeader, signerName, signerPosition, signerNip, assetsUsed[], agenciesInvolved[], notes }` | `letter` objek |
| `apiUpdateLetter(id, payload)` | payload dengan `action: 'approve'│'reject'│'issue'│'submit'` ATAU field langsung | `letter` objek |
| `apiDeleteLetter(id, payload)` | `payload: { actorName?, actorRole? }` (opsional, override Session) | `{ ok: true }` |

**Guard:**
- Create ST: `KOORDINATOR`, `PIMPINAN`, `ADMIN`
- Approve/reject/issue: `PIMPINAN`, `ADMIN`
- Delete: `KOORDINATOR`, `PIMPINAN`, `ADMIN` — **tidak bisa hapus ST yang sudah punya laporan**

### Laporan

| Fungsi | Argumen | Return |
|---|---|---|
| `apiCreateReport(payload)` | `{ letterId, actualTime, actualLocation, description, results, obstacles, recommendation, violationRef, violatorCount, actionTaken, evidenceList[] }` | `report` |
| `apiUpdateReport(id, payload)` | payload dengan `action: 'verify'│'return'│'close'` (+ `pic`, `picUnit`, `deadline`, `priority` saat verify untuk auto-FU) | `report` |
| `apiDeleteReport(id, payload)` | sama | `{ ok: true }` |

**Workflow verify:** `action:'verify'` otomatis membuat **1 follow-up** dari `recommendation` + `pic`/`deadline` yang dikirim. Jika FE juga memanggil `apiCreateFollowUp` manual → **double FU**.

### Tindak Lanjut

| Fungsi | Argumen |
|---|---|
| `apiCreateFollowUp(payload)` | `{ reportId, actionRequired, pic, picUnit, deadline, priority, progressNote }` |
| `apiUpdateFollowUp(id, payload)` | `{ action?: 'complete', completionNote?, progressNote?, priority?, deadline? }` |
| `apiDeleteFollowUp(id, payload)` | — |

### Master Data

| Fungsi | Argumen |
|---|---|
| `apiCreateMaster(resource, payload)` | `resource` ∈ `users│activityTypes│regions│villages│signers│violations│assets│agencies` |
| `apiUpdateMaster(resource, id, payload)` | sama |
| `apiDeleteMaster(resource, id)` | — |

**Guard:**
- Create/update master: `ADMIN`, `KOORDINATOR`, `PIMPINAN`
- Delete master: **hanya `ADMIN` dan `PIMPINAN`**
- Reference check: tidak bisa hapus `assets` yang dipakai ST, `activity_types` yang dipakai, dst.

### Audit & Utility

Fungsi internal (tidak dipanggil langsung dari FE):
- `cekDatabase()` — print count per sheet
- `setupDatabase()` — seed manual
- `backupDatabase()` — backup JSON ke Drive (rencana: trigger harian)
- `initCounters()`, `cleanupLegacyProperties()` — utility setup

---

## Role & Workflow

### 4 Role

| Role | Hak |
|---|---|
| **ADMIN** | Kelola master data + pengguna, lihat semua, hapus master |
| **KOORDINATOR** | Buat ST (ajukan ke Pimpinan), verifikasi laporan, tindak lanjut |
| **PETUGAS** | Laksanakan ST terbit, buat laporan lapangan |
| **PIMPINAN** | Buat ST langsung terbit (can_sign), setujui ST Koordinator |

Role `OPERATOR` dan **Master Regu Ops** sudah dihapus.

### Alur ST

```
KOORDINATOR/PIMPINAN/ADMIN
    │
    ├── Buat ST ──→ PENDING_APPROVAL
    │                    │
    │                    └── PIMPINAN: Setujui & Terbitkan
    │                            │
    │                            └── ISSUED + nomor resmi (800/145/...)
    │
    └── PIMPINAN buat ST ──→ ISSUED langsung
                                │
                                └── PETUGAS: Buat Laporan

PIMPINAN reject → REJECTED (perlu revisi) ──→ KOORDINATOR edit & ajukan ulang
```

### Alur Laporan

```
PETUGAS buat laporan ──→ SUBMITTED
                             │
                             ├── KOORDINATOR verify ──→ VERIFIED
                             │                              │
                             │                              └── auto-create FollowUp
                             │                              └── KOORDINATOR close ──→ CLOSED
                             │
                             └── KOORDINATOR return ──→ RETURNED
                                                            │
                                                            └── PETUGAS edit & ajukan ulang
```

### Alur Tindak Lanjut

```
PROSES ──→ SELESAI (via action:'complete')
   │
   └── overdue jika deadline < hari ini
```

---

## Fitur

### Dashboard
- Hero "Selamat datang, [nama]"
- 4 metrik: Total ST, Total Laporan, ST TERBATAS, FU aktif + overdue
- Antrean "Tindakan Tertunda untuk Anda" berdasarkan role
- Bar chart ST per jenis kegiatan
- Agenda ST terdekat (kalender)
- Timeline audit trail terakhir (12 log)

### Surat Tugas
- Form 9 baris:
  1. Jenis kegiatan (dropdown 7 jenis)
  2. Dasar & tanggal surat
  3. Nama kegiatan (datalist usulan + input bebas)
  4. Tanggal & waktu mulai
  5. Tanggal & waktu selesai
  6. Kecamatan → Desa/Kelurahan (bertingkat, 135 desa) → Nama lokasi
  7. Multibox petugas + pilih ketua tim
  8. Multibox kendaraan + peralatan
  9. Catatan
- Detail pelengkap (collapsible): unit, penandatangan, parameter khusus per jenis kegiatan, maksud & tujuan, instansi mitra
- Tabel 7 kolom: Tanggal, Waktu, Jenis Kegiatan, Nama Kegiatan, Petugas, Status, Aksi
- Filter: search, status, klasifikasi (INTERNAL/TERBATAS), jenis kegiatan
- Aksi sesuai role: Detail, Setujui & Terbitkan, Tolak, Terbitkan, Edit, Cetak, Hapus
- **Cetak ST** dengan kop resmi, TTE placeholder
- **Ekspor CSV** rekap ST

### Laporan Kegiatan
- Form: pilih ST terbit, waktu aktual, lokasi temuan, uraian, hasil, kendala, rekomendasi, acuan Perda, jumlah pelanggar, tindakan diambil, lampiran
- Filter status: SUBMITTED, VERIFIED, RETURNED, CLOSED
- Aksi: Detail, Verifikasi (→ auto-FU), Kembalikan, Edit
- **⚠️ Cetak laporan belum tersedia** — lihat [roadmap](#roadmap-fase-2)

### Tindak Lanjut
- Grid card per FU dengan PIC, prioritas, tenggat, progress, completion
- Filter: Semua, Proses, **OVERDUE** (merah), Selesai
- Aksi: Edit, Selesaikan, Tambah Manual

### Rekap & Statistik
- 4 KPI: % penerbitan ST, laporan terverifikasi, total pelanggar, % penyelesaian FU
- Rekap per jenis kegiatan (ST + Laporan)
- Rekap per wilayah (Kecamatan) — bar chart
- **ST terbit tanpa laporan** — daftar untuk atensi

### Admin (khusus ADMIN)
- 8 master data dengan CRUD penuh:
  - users, activity_types, regions, villages, signers, violations, assets, agencies
- Unique check: email (users), code (activity_types, regions, villages, violations, assets, agencies)
- Reference check: tidak bisa hapus asset yang dipakai ST
- Audit trail 60 log terakhir

### Sidebar & Header
- Sidebar desktop minimize/maximize (localStorage)
- Mobile nav bottom bar
- Role simulation dropdown di kanan atas (untuk UAT)
- Badge notifikasi: pending ST, pending Laporan, overdue FU

---

## Keamanan

### Otorisasi Server-Side

Setiap aksi ditentukan oleh `Session.getActiveUser().getEmail()` yang dicocokkan ke sheet `users`:

```js
function tryResolveUser_() {
  const email = Session.getActiveUser().getEmail().toLowerCase();
  const u = readAll_("users").find(x => x.email.toLowerCase() === email);
  if (!u) return null;
  return { ..., role: u.role, canSign: ... };
}
```

**Fallback** (hanya jika Session kosong — deploy anonim / dev editor):
- Pakai `actorName`/`actorRole` dari payload
- Dicatat `_fallback: true` di object user
- **Tidak untuk produksi**

### Guard Matrix

| Aksi | ADMIN | PIMPINAN | KOORDINATOR | PETUGAS |
|---|---|---|---|---|
| Buat ST | ✅ | ✅ | ✅ | ❌ |
| Approve/reject ST | ✅ | ✅ | ❌ | ❌ |
| Hapus ST | ✅ | ✅ | ✅ | ❌ |
| Buat Laporan | ✅ | ✅ | ✅ | ✅ |
| Verify/return laporan | ✅ | ✅ | ✅ | ❌ |
| Close laporan | ✅ | ✅ | ✅ | ❌ |
| Buat FU | ✅ | ✅ | ✅ | ❌ |
| Selesaikan FU | ✅ | ✅ | ✅ | ✅ |
| CRUD master (create/update) | ✅ | ✅ | ✅ | ❌ |
| Hapus master | ✅ | ✅ | ❌ | ❌ |

### Cascade Guards
- **Hapus ST** yang sudah punya laporan → ditolak
- **Hapus Laporan** → otomatis hapus FU terkait (cascade delete)
- **Hapus asset** yang dipakai ST aktif → ditolak

### Audit Trail
Setiap aksi tulis dicatat di `audit_logs`:
```json
{
  "id": "uuid",
  "entity": "Surat Tugas",
  "entityCode": "ST-005",
  "action": "ISSUED",
  "actorName": "Budi Santoso, S.Sos",   // ← dari Session, bukan payload
  "actorRole": "PIMPINAN",
  "detail": "Diterbitkan langsung oleh Pimpinan dengan nomor 800/145/406.02/2026",
  "createdAt": "2026-10-17T..."
}
```

### Rekomendasi Tambahan
- **Whitelist email** di `tryResolveUser_` untuk mencegah Gmail luar akses baca — lihat [roadmap P2](#fase-3--prioritas-sedang)
- **Migrasi `access: DOMAIN`** jika dinas punya Workspace — lihat [roadmap P2](#fase-3--prioritas-sedang)

---

## Development Roadmap

### Status Keseluruhan

| Komponen | Status |
|---|---|
| Backend `Code.gs` v3.0.0 | ✅ Production-ready (76/76 test) |
| Frontend `Index.html` patched | ✅ Console bersih, semua API sinkron |
| Database seed | ✅ 12 sheet + data awal |
| Drive folder | ✅ 7 subfolder |
| Script Properties | ✅ 15 keys |
| Deployment config | ✅ `USER_ACCESSING` + `ANYONE` |
| Test harness | ✅ 76 assertions |
| UAT end-to-end | 🟡 Perlu dijalankan |

### Fase 1 — Selesai ✅

- [x] Backend v3 merge (skema kaya + otorisasi server-side)
- [x] Skema 12 sheet dengan header & format @
- [x] Action-based workflow (approve/reject/issue/submit/verify/return/close)
- [x] Cascade delete guard
- [x] Auto-create FollowUp saat verify
- [x] Counter deterministik per tahun
- [x] Cache per-execution + lock reentrant
- [x] Audit trail dengan actor dari Session
- [x] Frontend Vue 3 single-file
- [x] 76 assertions test harness
- [x] Drive folder + properties setup
- [x] Deployment `USER_ACCESSING`

### Fase 2 — Prioritas Tinggi (Sprint berikut)

- [ ] **Template cetak Laporan Kegiatan** (Level 2 — standard)
  - Tambah kolom `reportDate`, `personnel` (hadir), `conclusion`
  - Migration script otomatis
  - Print template dengan kop resmi
  - Field baru di form laporan
  - Auto-fill petugas dari ST (bisa diedit)
  - Tanda tangan: Pelapor + Mengetahui (2 kolom)

- [ ] **Whitelist email** di `tryResolveUser_`
  - Tolak email luar domain atau di luar sheet `users`
  - Cegah Gmail luar akses baca `apiBootstrap`
  - Optional, tapi disarankan sebelum user lain pakai

- [ ] **UAT end-to-end**
  - Test 10 skenario: create ST → approve → laporan → verify → close → delete guard
  - Verifikasi `audit_logs` mencatat actor yang benar
  - Test dengan akun petugas di incognito

- [ ] **Sosialisasi user**
  - Pelatihan singkat per role
  - Dokumentasi PDF tata cara
  - Setup grup WhatsApp/Telegram untuk support

### Fase 3 — Prioritas Sedang

- [ ] **Migrasi `access: DOMAIN`**
  - Syarat: Workspace dinas aktif + domain verified
  - Ganti `ANYONE` → `DOMAIN` di manifest
  - Deploy ulang, tanpa ubah kode

- [ ] **Trigger backup harian otomatis**
  - Fungsi `backupDatabase()` sudah ada
  - Pasang trigger Time-driven (jam 02:00 WIB)
  - Rotasi: backup > 30 hari dipindah ke `02-Backup/arsip/`
  - Retensi 1 tahun

- [ ] **Notifikasi email**
  - Kirim email ke Pimpinan saat ada ST baru `PENDING_APPROVAL`
  - Kirim email ke Koordinator saat ada laporan `SUBMITTED`
  - Kirim email ke PIC saat FU baru dibuat
  - Pakai `MailApp.sendEmail` atau `GmailApp`

- [ ] **Level 3 template laporan (opsional)**
  - Field tambahan: `witnesses`, `evidenceNotes`, `signedBy`, `acknowledgedBy`, `suggestions`
  - Tanda tangan 3 kolom (Pelapor + Mengetahui + Menyetujui)
  - Placeholder TTE

### Fase 4 — Prioritas Rendah (Nice-to-have)

- [ ] **Upload bukti laporan ke Drive**
  - Field `evidenceList` saat ini hanya nama file (string)
  - Ganti dengan upload file via Drive API
  - Simpan URL file di `evidenceList`
  - Preview gambar di detail laporan
  - Folder otomatis: `03-Bukti-Kegiatan/YYYY/MM/ST-XXX-kegiatan/`

- [ ] **Auto-generate PDF ke Drive**
  - Setelah ST terbit, generate PDF otomatis → `04-Surat-Tugas-PDF/YYYY/`
  - Setelah laporan close, generate PDF → `05-Laporan-PDF/YYYY/`
  - Pakai HTML template + `Utilities.newBlob(html, 'text/html').getAs('application/pdf')`

- [ ] **Dashboard statistik lanjutan**
  - Grafik time-series (ST per bulan, pelanggaran per bulan)
  - Peta kerawanan per kecamatan (Google Maps API)
  - Leaderboard petugas paling aktif
  - Export rekap Excel (bukan hanya CSV)

- [ ] **Mobile PWA**
  - Service worker untuk offline
  - Install to home screen
  - Push notification (via FCM, perlu FCM config)

- [ ] **Multi-bahasa**
  - Saat ini hanya Indonesia
  - Ekstrak string ke `i18n.json`
  - Tambah English untuk keperluan audit

### Fase 5 — Pemeliharaan Rutin

- [ ] **Cek integritas bulanan** — `runReadOnlyChecks()`
- [ ] **Rotasi backup tahunan** — arsip lama dipindah ke Drive cold storage
- [ ] **Review audit log** — deteksi anomali (mis. penghapusan massal)
- [ ] **Update test suite** — saat tambah fitur baru
- [ ] **Upgrade Apps Script runtime** — Google umumnya otomatis
- [ ] **Monitor kuota** — Apps Script 6 menit/execution, 20k/day

---

## Troubleshooting

### Web App menampilkan "Script function not found"

- `Index.html` belum dibuat dengan nama persis `Index`
- Ulangi: **+ → HTML** → nama `Index`

### Error "Access Denied"

- **`access: DOMAIN`** dan akun bukan `@trenggalekkab.go.id` → login dengan akun dinas
- **`access: ANYONE`** tapi deployment lama masih `USER_DEPLOYING` → deploy ulang dengan `USER_ACCESSING`

### Data tidak muncul / kosong

- Buka Sheet → cek apakah sheet punya baris data
- Jalankan `setupDatabase()` sekali
- Cek Script Properties: `SEEDED_users = 1`, `SEEDED_villages = 1`

### "Unexpected token" di Console

- Vue template tidak menerima `if`/`const` di `@click`/`@change`
- Cek semua inline handler — harus ekspresi, bukan statement

### Cetak ST/laporan tidak rapi

- Gunakan browser Chrome/Edge (bukan Firefox)
- Klik kanan → **Print** → save as PDF
- Set paper A4, margin default

### Aksi ditolak "Akses ditolak"

- `resolveActor_` mengembalikan role `PETUGAS` (fallback)
- Cek email Anda terdaftar di sheet `users`
- Atau deploy ulang dengan `executeAs: USER_ACCESSING`

### Counter nomor ST kacau (duplikat)

- Cek Script Properties `SEQ_LETTERS` dan `OFFICIAL_SEQ_<tahun>`
- Jika rusak: jalankan `initCounters()` sekali (lazy-init dari data existing)
- Jangan menghapus baris manual di sheet `letters` — pakai tombol delete di aplikasi

### Kuota Apps Script habis

- Waktu eksekusi 6 menit → jika timeout, aplikasi terlalu banyak data
- Query limit per hari → tunggu 24 jam
- Solusi: cache `apiBootstrap` dengan `CacheService` (TTL 60 detik)

---

## Version History

### v3.0.0 (Oktober 2026) — Current
- Merge BE v2 (keamanan) + Web App 2 (skema)
- Otorisasi server-side via Session
- Action-based workflow
- Auto-create FollowUp
- Cascade delete guards
- Counter deterministik per tahun
- Cache + lock reentrant
- Test harness 76 assertions
- Frontend patched (3 titik sinkron BE v3)

### v2.0.0 (Legacy)
- Rewrite dengan otorisasi server-side
- Idempotent seed
- Skema 11 sheet

### v1.0.0 (Legacy)
- Aplikasi awal port dari Next.js + PostgreSQL
- Skema sederhana
- Frontend Vue tanpa patch BE v3

---

## Lisensi & Kontak

Aplikasi internal Satpol PP & Damkar Kab. Trenggalek.

**Support:** Hubungi Administrator Sistem Satpol PP Kab. Trenggalek

**Repository:** *(isi dengan URL GitHub/GitLab jika ada)*
```

---

## 📋 Ringkasan Perubahan README

| Sebelum | Sesudah |
|---|---|
| 2 file README terpisah | 1 file komprehensif |
| Nama API sebagian outdated (`saveMaster`, `getBootstrap`) | Semua `api*` sesuai BE v3 |
| Deploy as "Me" | `USER_ACCESSING` (wajib) |
| Tidak ada schema lengkap | Tabel 12 sheet + kolom |
| Tidak ada guard matrix | Matriks hak akses per role |
| Tidak ada roadmap | 5 fase, ~30 item |
| Tidak ada troubleshooting | 10+ kasus umum |
| Tidak ada version history | 3 versi didokumentasikan |

---

## 🎯 Langkah Berikutnya

Kalau README ini sudah oke, langkah selanjutnya:

1. **Simpan sebagai `README.md`** di root project
2. **Commit** (jika pakai Git) atau simpan di Drive folder `06-Template`
3. **Lanjut ke Fase 2 roadmap** — template cetak laporan (Level 2), whitelist email, atau UAT

Kalau mau, saya bisa lanjut tulis **template cetak Laporan Kegiatan (Level 2)** sesuai struktur yang direkomendasikan di README ini. Cukup bilang **"lanjut template laporan"** dan saya akan tulis:

- Migration script `migrateReportsSchema()`
- Patch `Code.gs` (3 field baru)
- Patch `Index.html` (form + `doPrintReport()`)
- Test scenario
