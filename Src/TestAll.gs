/**
 * ============================================================================
 * SI TRANTIBUM — TestAll.gs (v3.2.0)
 * Test harness untuk memverifikasi backend Code.gs (v3+)
 * ============================================================================
 * Cara pakai:
 *   1. Tambahkan file Script baru bernama "TestAll", tempel kode ini.
 *   2. Pilih fungsi `runAllTests` dari dropdown, tekan Run.
 *   3. Lihat Execution log.
 *
 * Test ini membuat data sementara lalu MENGHAPUSNYA kembali.
 * Semua aksi tercatat di audit_logs dengan actor "TEST_HARNESS".
 * ============================================================================
 */

/** Aktor test — dipakai untuk fallback auth (tidak ada Session di editor). */
const TEST_ACTOR = {
  actorName: "TEST_HARNESS",
  actorRole: "ADMIN",
};

/** Opsi global. */
const TEST_OPTS = {
  cleanupAfter: true,   // hapus data test setelah selesai
  verbose: true,        // cetak detail per-assert
  stopOnError: false,   // lanjut meski ada test yang gagal
};

/* ===========================================================================
 * RUNNER
 * =========================================================================== */
function runAllTests() {
  const results = [];
  const suites = [
    // Smoke
    ["Smoke: struktur & bootstrap",        testBootstrap],
    // Master CRUD
    ["Master: create/update/unique",       testMasterCRUD],
    ["Master: validation reject",          testMasterValidation],
    ["Master: reference guard",            testMasterReferenceGuard],
    // Letters workflow
    ["Letters: create as Admin",           testCreateLetterAsAdmin],
    ["Letters: create as Koordinator",     testCreateLetterAsKoordinator],
    ["Letters: approve via action",        testApproveLetterAction],
    ["Letters: reject via action",         testRejectLetterAction],
    ["Letters: role guard",                testLetterRoleGuard],
    ["Letters: delete guard (ada report)", testLetterDeleteGuard],
    // Reports workflow
    ["Reports: create from ISSUED",        testCreateReport],
    ["Reports: reject non-ISSUED letter",  testReportRequiresIssued],
    ["Reports: verify → auto FollowUp",    testVerifyReportCreatesFollowUp],
    ["Reports: return with note",          testReturnReport],
    // FollowUps
    ["FollowUps: update & complete",       testFollowUpWorkflow],
    // Delete cascade
    ["Delete: report cascades FU",         testDeleteReportCascade],
    // Counter & nomor
    ["Counter: sequence & nomor resmi",    testCounterAndOfficialNumber],
    // Data layer
    ["DataLayer: serialize/deserialize",   testSerializeDeserialize],
    ["DataLayer: format sel @",            testCellFormatText],
  ];

  const createdIds = []; // untuk cleanup

  Logger.log("═══════════════════════════════════════════════════════");
  Logger.log("SI TRANTIBUM — TestAll v" + (typeof SCRIPT_VERSION !== "undefined" ? SCRIPT_VERSION : "?"));
  Logger.log("Waktu: " + new Date().toISOString());
  Logger.log("═══════════════════════════════════════════════════════");

  suites.forEach(function (pair, i) {
    const name = pair[0], fn = pair[1];
    const t0 = Date.now();
    try {
      const ctx = { createdIds: createdIds };
      const r = fn(ctx) || { pass: 0, fail: 0, notes: [] };
      const ms = Date.now() - t0;
      const status = r.fail === 0 ? "✅ PASS" : "❌ FAIL";
      results.push({ name: name, pass: r.pass || 0, fail: r.fail || 0, ms: ms, notes: r.notes || [] });
      Logger.log(status + "  [" + String(i + 1).padStart(2, "0") + "] " + name + "  (" + r.pass + " ok, " + r.fail + " fail, " + ms + "ms)");
      if (TEST_OPTS.verbose && r.notes && r.notes.length) {
        r.notes.forEach(function (n) { Logger.log("        • " + n); });
      }
      if (r.fail > 0 && TEST_OPTS.stopOnError) {
        throw new Error("Stop on first failure: " + name);
      }
    } catch (e) {
      results.push({ name: name, pass: 0, fail: 1, ms: Date.now() - t0, notes: [String(e && e.message || e)] });
      Logger.log("💥 ERROR  [" + String(i + 1).padStart(2, "0") + "] " + name + " — " + (e && e.message || e));
      if (TEST_OPTS.stopOnError) throw e;
    }
  });

  // Cleanup
  if (TEST_OPTS.cleanupAfter) {
    Logger.log("");
    Logger.log("─── Cleanup (" + createdIds.length + " item) ───");
    cleanupCreated_(createdIds);
    Logger.log("Cleanup selesai.");
  }

  // Ringkasan
  const totalPass = results.reduce(function (s, r) { return s + r.pass; }, 0);
  const totalFail = results.reduce(function (s, r) { return s + r.fail; }, 0);
  const totalMs   = results.reduce(function (s, r) { return s + r.ms; }, 0);
  Logger.log("");
  Logger.log("═══════════════════════════════════════════════════════");
  Logger.log("RINGKASAN");
  Logger.log("  Suite  : " + results.length);
  Logger.log("  Assert : " + totalPass + " passed, " + totalFail + " failed");
  Logger.log("  Durasi : " + totalMs + " ms");
  Logger.log("  Status : " + (totalFail === 0 ? "✅ SEMUA LULUS" : "❌ ADA YANG GAGAL"));
  Logger.log("═══════════════════════════════════════════════════════");

  return { results: results, totalPass: totalPass, totalFail: totalFail };
}

/** Hapus data test berdasarkan entity yang tercatat. */
function cleanupCreated_(createdIds) {
  // createdIds: [{ table, id }]
  const byTable = {};
  createdIds.forEach(function (c) { (byTable[c.table] = byTable[c.table] || []).push(c.id); });

  // Urutan hapus penting (child dulu)
  ["follow_ups", "reports", "letters"].forEach(function (tbl) {
    (byTable[tbl] || []).forEach(function (id) {
      try { deleteById_(tbl, id); } catch (e) {}
    });
    delete byTable[tbl];
  });

  // Master
  Object.keys(byTable).forEach(function (tbl) {
    byTable[tbl].forEach(function (id) {
      try { deleteById_(tbl, id); } catch (e) {}
    });
  });
}

/* ===========================================================================
 * ASSERT HELPERS
 * =========================================================================== */
function makeAsserter_(label) {
  const state = { pass: 0, fail: 0, notes: [] };
  return {
    ok: function (cond, msg) {
      if (cond) { state.pass++; if (TEST_OPTS.verbose) state.notes.push("✔ " + msg); }
      else { state.fail++; state.notes.push("✘ " + msg); }
      return cond;
    },
    eq: function (a, b, msg) {
      return this.ok(a === b, msg + " (expected=" + JSON.stringify(b) + ", got=" + JSON.stringify(a) + ")");
    },
    truthy: function (v, msg) { return this.ok(!!v, msg); },
    falsy:  function (v, msg) { return this.ok(!v, msg); },
    throws: function (fn, msg) {
      try { fn(); return this.ok(false, msg + " (seharusnya error, tapi tidak)"); }
      catch (e) { return this.ok(true, msg + " → error: " + e.message); }
    },
    notThrows: function (fn, msg) {
      try { fn(); return this.ok(true, msg); }
      catch (e) { return this.ok(false, msg + " → error tak terduga: " + e.message); }
    },
    done: function () { return state; },
  };
}

function track_(ctx, table, id) {
  if (!ctx || !ctx.createdIds || !id) return;
  ctx.createdIds.push({ table: table, id: id });
}

/* ===========================================================================
 * SUITES
 * =========================================================================== */

/* ---- 1. Bootstrap ---- */
function testBootstrap() {
  const a = makeAsserter_();
  const b = apiBootstrap();

  a.truthy(b, "apiBootstrap mengembalikan objek");
  a.truthy(b.version, "meta.version ada → " + b.version);
  a.truthy(Array.isArray(b.users), "users array");
  a.truthy(Array.isArray(b.letters), "letters array");
  a.truthy(Array.isArray(b.reports), "reports array");
  a.truthy(Array.isArray(b.villages), "villages array");
  a.ok(b.users.length > 0, "users tidak kosong (" + b.users.length + ")");
  a.ok(b.activityTypes.length >= 0, "activityTypes terbaca (" + b.activityTypes.length + ")");
  a.ok(b.regions.length > 0, "regions tidak kosong (" + b.regions.length + ")");
  a.ok(b.villages.length > 0, "villages tidak kosong (" + b.villages.length + ")");

  // Konsistensi field penting
  if (b.users[0]) {
    ["id","name","role"].forEach(function (f) { a.truthy(f in b.users[0], "field user." + f + " ada"); });
  }
  if (b.letters[0]) {
    ["id","code","status"].forEach(function (f) { a.truthy(f in b.letters[0], "field letter." + f + " ada"); });
  }

  return a.done();
}

/* ---- 2. Master CRUD ---- */
function testMasterCRUD(ctx) {
  const a = makeAsserter_();
  const stamp = String(Date.now()).slice(-6);
  const code = "TEST-AG-" + stamp;

  const created = apiCreateMaster("agencies", Object.assign({
    code: code,
    name: "Instansi Uji " + stamp,
    contact: "000-0000",
  }, TEST_ACTOR));
  a.truthy(created.id, "create master menghasilkan id");
  a.eq(created.code, code, "code tersimpan");
  track_(ctx, "agencies", created.id);

  const updated = apiUpdateMaster("agencies", created.id, Object.assign({
    name: "Instansi Uji (rev)",
  }, TEST_ACTOR));
  a.eq(updated.name, "Instansi Uji (rev)", "update master mengganti name");

  // Unique check
  a.throws(function () {
    apiCreateMaster("agencies", Object.assign({
      code: code, name: "Duplikat",
    }, TEST_ACTOR));
  }, "create dengan code duplikat ditolak");

  return a.done();
}

/* ---- 3. Master validation ---- */
function testMasterValidation() {
  const a = makeAsserter_();

  a.throws(function () {
    apiCreateMaster("users", Object.assign({
      name: "Tanpa Email",
      role: "PETUGAS",
      email: "bukan-email",
    }, TEST_ACTOR));
  }, "email invalid ditolak");

  a.throws(function () {
    apiCreateMaster("regions", Object.assign({
      code: "TEST-NONAME",
    }, TEST_ACTOR));
  }, "regions tanpa name ditolak");

  a.throws(function () {
    apiCreateMaster("signers", Object.assign({
      name: "Tanpa Jabatan",
    }, TEST_ACTOR));
  }, "signers tanpa position ditolak");

  return a.done();
}

/* ---- 4. Reference guard ---- */
function testMasterReferenceGuard() {
  const a = makeAsserter_();
  const letters = readAll_("letters");
  const used = letters.filter(function (l) {
    return l.status === "ISSUED" && (l.assetsUsed || []).length > 0;
  })[0];

  if (!used) {
    a.ok(true, "skip — tidak ada ST dengan asset terkait");
    return a.done();
  }

  const assetCode = used.assetsUsed[0];
  const asset = readAll_("assets").filter(function (x) { return x.code === assetCode; })[0];
  if (!asset) { a.ok(true, "skip — asset referensi tidak ditemukan"); return a.done(); }

  a.throws(function () {
    apiDeleteMaster("assets", asset.id);
  }, "hapus asset yang dipakai ST ditolak");

  return a.done();
}

/* ---- 5. Letters: create as Admin ---- */
function testCreateLetterAsAdmin(ctx) {
  const a = makeAsserter_();
  const payload = baseLetterPayload_("Uji ST Admin");
  const row = apiCreateLetter(Object.assign(payload, { actorName: "TEST_HARNESS", actorRole: "ADMIN" }));

  a.truthy(row.id, "letter.id ada");
  a.truthy(row.code && row.code.indexOf("ST-") === 0, "letter.code format ST-xxx (" + row.code + ")");
  a.eq(row.status, "ISSUED", "Admin langsung ISSUED");
  a.truthy(row.officialNumber && row.officialNumber.indexOf("800/") === 0, "nomor resmi terisi: " + row.officialNumber);
  a.truthy(row.draftNumber && row.draftNumber.indexOf("DRAF-ST/") === 0, "draft number terisi");
  a.eq(row.approvalNote, "", "approvalNote kosong di ST baru");
  a.truthy(row.signerRank, "signerRank ikut tersimpan"); // Tambahan pengecekan

  track_(ctx, "letters", row.id);
  return a.done();
}

/* ---- 6. Letters: create as Koordinator ---- */
function testCreateLetterAsKoordinator(ctx) {
  const a = makeAsserter_();
  const payload = baseLetterPayload_("Uji ST Koordinator");
  const row = apiCreateLetter(Object.assign(payload, { actorName: "TEST_HARNESS", actorRole: "KOORDINATOR" }));

  a.eq(row.status, "PENDING_APPROVAL", "Koordinator menghasilkan PENDING_APPROVAL");
  a.eq(row.officialNumber || "", "", "nomor resmi kosong saat PENDING");
  track_(ctx, "letters", row.id);

  // simpan id untuk test berikutnya
  CacheService.getScriptCache().put("TEST_LETTER_PENDING", row.id, 300);
  return a.done();
}

/* ---- 7. Letters: approve via action ---- */
function testApproveLetterAction() {
  const a = makeAsserter_();
  const pendingId = CacheService.getScriptCache().get("TEST_LETTER_PENDING");
  if (!pendingId) { a.ok(true, "skip — tidak ada ST pending dari test sebelumnya"); return a.done(); }

  const approved = apiUpdateLetter(pendingId, {
    action: "approve",
    actorName: "TEST_HARNESS",
    actorRole: "PIMPINAN",
  });

  a.eq(approved.status, "ISSUED", "approve → ISSUED");
  a.truthy(approved.officialNumber && approved.officialNumber.indexOf("800/") === 0, "nomor resmi terisi: " + approved.officialNumber);

  return a.done();
}

/* ---- 8. Letters: reject via action ---- */
function testRejectLetterAction(ctx) {
  const a = makeAsserter_();
  const payload = baseLetterPayload_("Uji ST Reject");
  const draft = apiCreateLetter(Object.assign(payload, { actorName: "TEST_HARNESS", actorRole: "KOORDINATOR" }));
  track_(ctx, "letters", draft.id);

  const rejected = apiUpdateLetter(draft.id, {
    action: "reject",
    approvalNote: "Perlu revisi personel.",
    actorName: "TEST_HARNESS",
    actorRole: "PIMPINAN",
  });

  a.eq(rejected.status, "REJECTED", "reject → REJECTED");
  a.eq(rejected.approvalNote, "Perlu revisi personel.", "approvalNote tersimpan");

  return a.done();
}

/* ---- 9. Letters: role guard ---- */
function testLetterRoleGuard() {
  const a = makeAsserter_();
  const letters = readAll_("letters").filter(function (l) { return l.status === "ISSUED"; });
  if (!letters.length) { a.ok(true, "skip — tidak ada ST ISSUED"); return a.done(); }

  const id = letters[0].id;

  // Petugas mencoba approve
  a.throws(function () {
    apiUpdateLetter(id, { action: "approve", actorName: "TEST_HARNESS", actorRole: "PETUGAS" });
  }, "PETUGAS tidak boleh approve ST");

  // Petugas mencoba create ST
  a.throws(function () {
    apiCreateLetter(Object.assign(baseLetterPayload_("Petugas Coba Buat"), { actorName: "TEST_HARNESS", actorRole: "PETUGAS" }));
  }, "PETUGAS tidak boleh create ST");

  return a.done();
}

/* ---- 10. Letters: delete guard ---- */
function testLetterDeleteGuard() {
  const a = makeAsserter_();
  const reports = readAll_("reports");
  if (!reports.length) { a.ok(true, "skip — belum ada laporan"); return a.done(); }

  const letterWithReport = reports[0].letterId;
  a.throws(function () {
    apiDeleteLetter(letterWithReport);
  }, "ST yang punya laporan tidak bisa dihapus");

  return a.done();
}

/* ---- 11. Reports: create from ISSUED ---- */
function testCreateReport(ctx) {
  const a = makeAsserter_();
  const issued = readAll_("letters").filter(function (l) { return l.status === "ISSUED"; })[0];
  if (!issued) { a.ok(true, "skip — tidak ada ST ISSUED"); return a.done(); }

  const report = apiCreateReport({
    letterId: issued.id,
    description: "Laporan uji otomatis",
    results: "Semua terkendali",
    obstacles: "Nihil",
    recommendation: "Lanjutkan monitoring",
    evidenceList: ["test_1.jpg"],
    violatorCount: 2,
    objectTarget: "Uji Target",     // Test field dinamis baru
    massEstimate: "100",            // Test field dinamis baru
    actorName: "TEST_HARNESS",
    actorRole: "PETUGAS",
  });

  a.truthy(report.id, "report.id ada");
  a.truthy(report.code && report.code.indexOf("LP-") === 0, "report.code format LP-xxx (" + report.code + ")");
  a.eq(report.status, "SUBMITTED", "status awal SUBMITTED");
  a.eq(report.letterId, issued.id, "letterId match");
  a.eq(report.violatorCount, 2, "violatorCount tersimpan sebagai number");
  a.eq(report.objectTarget, "Uji Target", "field dinamis objectTarget tersimpan"); // Verifikasi

  track_(ctx, "reports", report.id);
  CacheService.getScriptCache().put("TEST_REPORT_ID", report.id, 300);
  return a.done();
}

/* ---- 12. Reports: reject non-ISSUED letter ---- */
function testReportRequiresIssued() {
  const a = makeAsserter_();
  const pending = readAll_("letters").filter(function (l) { return l.status === "PENDING_APPROVAL"; })[0];
  if (!pending) { a.ok(true, "skip — tidak ada ST PENDING"); return a.done(); }

  a.throws(function () {
    apiCreateReport({
      letterId: pending.id,
      description: "Coba buat dari non-ISSUED",
      actorName: "TEST_HARNESS",
      actorRole: "PETUGAS",
    });
  }, "create report dari ST non-ISSUED ditolak");

  return a.done();
}

/* ---- 13. Reports: verify → auto FU ---- */
function testVerifyReportCreatesFollowUp(ctx) {
  const a = makeAsserter_();
  const reportId = CacheService.getScriptCache().get("TEST_REPORT_ID");
  if (!reportId) { a.ok(true, "skip — tidak ada report test"); return a.done(); }

  const fuBefore = readAll_("follow_ups").length;

  const verified = apiUpdateReport(reportId, {
    action: "verify",
    verificationNote: "OK dari test",
    pic: "Budi Santoso, S.Sos",
    deadline: dateOffset_(7),
    priority: "Tinggi",
    actorName: "TEST_HARNESS",
    actorRole: "KOORDINATOR",
  });

  a.eq(verified.status, "VERIFIED", "verify → VERIFIED");
  a.eq(verified.verifiedBy, "TEST_HARNESS", "verifiedBy terisi dari actor");
  a.eq(verified.verificationNote, "OK dari test", "verificationNote tersimpan");

  const fuAfter = readAll_("follow_ups").length;
  a.eq(fuAfter, fuBefore + 1, "auto-create FollowUp (+1)");

  const newFu = readAll_("follow_ups").sort(function (x, y) {
    return String(y.createdAt).localeCompare(String(x.createdAt));
  })[0];
  a.eq(newFu.reportId, reportId, "FU.reportId menunjuk ke report");
  a.eq(newFu.priority, "Tinggi", "FU.priority tersimpan");
  a.truthy(newFu.code && newFu.code.indexOf("FU-") === 0, "FU.code format FU-xxx (" + newFu.code + ")");

  track_(ctx, "follow_ups", newFu.id);
  return a.done();
}

/* ---- 14. Reports: return with note ---- */
function testReturnReport(ctx) {
  const a = makeAsserter_();
  const issued = readAll_("letters").filter(function (l) { return l.status === "ISSUED"; })[0];
  if (!issued) { a.ok(true, "skip — tidak ada ST ISSUED"); return a.done(); }

  const rep = apiCreateReport({
    letterId: issued.id,
    description: "Report untuk test return",
    results: "Tes",
    actorName: "TEST_HARNESS",
    actorRole: "PETUGAS",
  });
  track_(ctx, "reports", rep.id);

  const ret = apiUpdateReport(rep.id, {
    action: "return",
    verificationNote: "Bukti kurang lengkap",
    actorName: "TEST_HARNESS",
    actorRole: "KOORDINATOR",
  });

  a.eq(ret.status, "RETURNED", "return → RETURNED");
  a.eq(ret.verificationNote, "Bukti kurang lengkap", "verificationNote tersimpan");

  return a.done();
}

/* ---- 15. FollowUps workflow ---- */
function testFollowUpWorkflow(ctx) {
  const a = makeAsserter_();
  const fu = readAll_("follow_ups")[0];
  if (!fu) { a.ok(true, "skip — tidak ada follow-up"); return a.done(); }

  const updated = apiUpdateFollowUp(fu.id, {
    action: "complete",
    completionNote: "Selesai dari test",
    actorName: "TEST_HARNESS",
    actorRole: "KOORDINATOR",
  });

  a.eq(updated.status, "SELESAI", "action=complete → SELESAI");
  a.eq(updated.completionNote, "Selesai dari test", "completionNote tersimpan");

  return a.done();
}

/* ---- 16. Delete report cascade FU ---- */
function testDeleteReportCascade(ctx) {
  const a = makeAsserter_();
  const issued = readAll_("letters").filter(function (l) { return l.status === "ISSUED"; })[0];
  if (!issued) { a.ok(true, "skip — tidak ada ST ISSUED"); return a.done(); }

  const rep = apiCreateReport({
    letterId: issued.id,
    description: "Report untuk test cascade",
    recommendation: "Akan create FU",
    actorName: "TEST_HARNESS",
    actorRole: "PETUGAS",
  });

  apiUpdateReport(rep.id, {
    action: "verify",
    pic: "PIC Cascade",
    actorName: "TEST_HARNESS",
    actorRole: "KOORDINATOR",
  });

  const fuLinked = readAll_("follow_ups").filter(function (f) { return f.reportId === rep.id; });
  a.ok(fuLinked.length > 0, "FU terkait report (" + fuLinked.length + ")");

  // FIX: kirim actor payload
  const res = apiDeleteReport(rep.id, { actorName: "TEST_HARNESS", actorRole: "ADMIN" });
  a.truthy(res.ok, "delete report sukses");

  const fuAfter = readAll_("follow_ups").filter(function (f) { return f.reportId === rep.id; });
  a.eq(fuAfter.length, 0, "FU ikut terhapus setelah delete report");

  a.throws(function () {
    apiDeleteReport(rep.id, { actorName: "TEST_HARNESS", actorRole: "ADMIN" });
  }, "delete report id yang sudah hilang → error");
  return a.done();
}

/* ---- 17. Counter & nomor resmi ---- */
function testCounterAndOfficialNumber() {
  const a = makeAsserter_();

  const seq1 = nextSeq_("letters");
  const seq2 = nextSeq_("letters");
  a.eq(seq2, seq1 + 1, "nextSeq_ increments monotonically");

  const year = "2099";
  const n1 = generateOfficialNumber_(year);
  const n2 = generateOfficialNumber_(year);
  a.ok(n1.indexOf("/" + year) > -1, "nomor resmi memuat tahun " + year + " (" + n1 + ")");
  a.ok(n2 !== n1, "nomor resmi tidak duplikat dalam satu tahun");
  a.ok(/^800\/\d+\/\d+\.\d+\/\d{4}$/.test(n1), "format nomor resmi valid: " + n1);

  return a.done();
}

/* ---- 18. Serialize/Deserialize ---- */
function testSerializeDeserialize() {
  const a = makeAsserter_();

  // JSON
  const arr = [{ a: 1 }, { b: 2 }];
  const s = serialize_("personnel", arr);
  a.ok(typeof s === "string" && s[0] === "[", "serialize personnel → JSON string");
  const d = deserialize_("personnel", s);
  a.eq(d.length, 2, "deserialize personnel → 2 items");

  // bool
  a.eq(serialize_("canSign", true), "TRUE", "serialize canSign true → TRUE");
  a.eq(serialize_("canSign", false), "FALSE", "serialize canSign false → FALSE");
  a.eq(deserialize_("canSign", "TRUE"), true, "deserialize canSign TRUE → true");
  a.eq(deserialize_("canSign", "FALSE"), false, "deserialize canSign FALSE → false");

  // number
  a.eq(serialize_("violatorCount", 3), "3", "serialize violatorCount → '3'");
  a.eq(deserialize_("violatorCount", "3"), 3, "deserialize violatorCount → 3");
  a.eq(deserialize_("violatorCount", "abc"), 0, "deserialize non-number → 0");

  // JSON fallback
  const fallback = deserialize_("specificData", "");
  a.ok(typeof fallback === "object" && !Array.isArray(fallback), "specificData fallback → {}");
  const arrFallback = deserialize_("personnel", "{invalid}");
  a.ok(Array.isArray(arrFallback) && arrFallback.length === 0, "personnel invalid → []");

  return a.done();
}

/* ---- 19. Format sel @ ---- */
function testCellFormatText(ctx) {
  const a = makeAsserter_();
  const stamp = String(Date.now()).slice(-6);
  const created = apiCreateMaster("agencies", Object.assign({
    code: "TEST-TXT-" + stamp,
    name: "0812345",    // sengaja seperti angka
    contact: "2026-01-02",   // sengaja seperti tanggal
  }, TEST_ACTOR));
  track_(ctx, "agencies", created.id);

  // Re-read dari sheet untuk memastikan nilai tidak di-parse ulang
  const raw = getSheet_("agencies").getRange(
    findRowIndexById_("agencies", created.id), 1, 1, SHEETS.agencies.length
  ).getDisplayValues()[0];

  const nameIdx = SHEETS.agencies.indexOf("name");
  a.eq(raw[nameIdx], "0812345", "nilai '0812345' tetap string, tidak diubah jadi angka");

  return a.done();
}

/* ===========================================================================
 * PAYLOAD BUILDER
 * =========================================================================== */
function baseLetterPayload_(suffix) {
  return {
    title: (suffix || "Uji ST") + " — " + new Date().toISOString().slice(0, 19),
    legalBasis: "Perda No. 3 Tahun 2019",
    letterDate: dateOffset_(0),
    startDate: dateOffset_(1),
    startTime: "08:00",
    endDate: dateOffset_(1),
    endTime: "12:00",
    location: "Kecamatan Trenggalek",
    village: "Kelurahan Kelutan",
    locationName: "Lokasi Uji " + new Date().getTime(),
    activityCode: "PATROLI",
    activityName: "Patroli",
    classification: "INTERNAL",
    // unit, specificData, agenciesInvolved DIHAPUS sesuai form terbaru
    purpose: "Uji backend",
    personnel: [
      { name: "Petugas Uji 1", rank: "IIIa", role: "Ketua Tim" },
      { name: "Petugas Uji 2", rank: "IIc", role: "Anggota Regu" },
    ],
    teamLeader: "Petugas Uji 1",
    signerName: "Drs. HABIB SOLEHUDDIN, M.PSDM",
    signerPosition: "Kepala Satpol PP dan Kebakaran Kab. Trenggalek",
    signerNip: "197003202005011004",
    signerRank: "Pembina Utama Muda / IVc", // Tambahan baru
    assetsUsed: [],
  };
}

/* ===========================================================================
 * UTILITAS RUNNER (opsional)
 * =========================================================================== */

/** Jalankan test ini jika Anda ingin memeriksa integritas data tanpa mengubah apapun. */
function runReadOnlyChecks() {
  const a = makeAsserter_();
  const tables = Object.keys(SHEETS);

  // 1. Semua sheet ada
  const ss = getDb_();
  tables.forEach(function (t) {
    a.ok(!!ss.getSheetByName(t), "sheet '" + t + "' ada");
  });

  // 2. Header sesuai skema
  tables.forEach(function (t) {
    const sh = ss.getSheetByName(t);
    const h = sh.getRange(1, 1, 1, SHEETS[t].length).getDisplayValues()[0];
    a.ok(h.join("|") === SHEETS[t].join("|"), "header '" + t + "' sesuai skema");
  });

  // 3. ID unik di tiap tabel
  tables.forEach(function (t) {
    const rows = readAll_(t);
    const ids = {};
    let dupCount = 0;
    rows.forEach(function (r) {
      if (ids[r.id]) dupCount++;
      ids[r.id] = true;
    });
    a.eq(dupCount, 0, "id unik di '" + t + "' (" + rows.length + " rows)");
  });

  // 4. Relasi
  const letterIds = readAll_("letters").map(function (l) { return l.id; });
  readAll_("reports").forEach(function (r) {
    a.ok(letterIds.indexOf(r.letterId) > -1, "report " + r.code + " → letter valid");
  });
  const reportIds = readAll_("reports").map(function (r) { return r.id; });
  readAll_("follow_ups").forEach(function (f) {
    a.ok(reportIds.indexOf(f.reportId) > -1, "followup " + f.code + " → report valid");
  });

  // 5. Code tidak duplikat
  ["letters","reports","follow_ups"].forEach(function (t) {
    const codes = {};
    let dup = 0;
    readAll_(t).forEach(function (r) {
      if (r.code && codes[r.code]) dup++;
      if (r.code) codes[r.code] = true;
    });
    a.eq(dup, 0, "code unik di '" + t + "'");
  });

  const s = a.done();
  Logger.log("READ-ONLY CHECKS: " + s.pass + " passed, " + s.fail + " failed");
  s.notes.forEach(function (n) { if (n.indexOf("✘") === 0) Logger.log(n); });
  return s;
}

/* ===========================================================================
 * DIAGNOSTIK & REPAIR
 * =========================================================================== */

/**
 * Cek integritas dan tampilkan isi tiap sheet. Jalankan dari editor untuk
 * melihat apakah ada data legacy dari versi sebelumnya.
 */
function diagnoseData() {
  Logger.log("═══════════════ DIAGNOSTIK DATA ═══════════════");

  ["letters", "reports", "follow_ups"].forEach(function (t) {
    const rows = readAll_(t);
    Logger.log("─── " + t.toUpperCase() + " (" + rows.length + " rows) ───");
    rows.forEach(function (r) {
      Logger.log("  id=" + r.id + " | code=" + (r.code || "-") +
        " | " + (t === "reports" ? "letterId=" + r.letterId : "") +
        (t === "follow_ups" ? "reportId=" + r.reportId : "") +
        (t === "letters" ? "status=" + r.status : ""));
    });
  });

  Logger.log("─── RAW REPORTS SHEET (2 baris pertama) ───");
  const sh = getSheet_("reports");
  const rows = Math.min(3, sh.getLastRow());
  if (rows > 0) {
    const vals = sh.getRange(1, 1, rows, SHEETS.reports.length).getDisplayValues();
    vals.forEach(function (v, i) {
      Logger.log("  row" + i + ": " + JSON.stringify(v));
    });
  }

  Logger.log("─── RAW FOLLOW_UPS SHEET (2 baris pertama) ───");
  const sh2 = getSheet_("follow_ups");
  const rows2 = Math.min(3, sh2.getLastRow());
  if (rows2 > 0) {
    const vals2 = sh2.getRange(1, 1, rows2, SHEETS.follow_ups.length).getDisplayValues();
    vals2.forEach(function (v, i) {
      Logger.log("  row" + i + ": " + JSON.stringify(v));
    });
  }
}

/**
 * REPAIR — WIPE & RE-SEED.
 *
 * PENTING: menghapus SEMUA baris data di semua sheet, lalu seed ulang.
 * Jalankan HANYA jika data existing masih dummy / tahap development.
 * Untuk data produksi, jangan pakai ini — buat migrasi manual.
 *
 * @param {Object} opts { wipe: bool (default true), reseed: bool (default true) }
 */
function repairDatabase(opts) {
  opts = opts || {};
  const wipe   = opts.wipe   !== false;
  const reseed = opts.reseed !== false;

  Logger.log("═══ REPAIR DATABASE (wipe=" + wipe + ", reseed=" + reseed + ") ═══");

  const props = PropertiesService.getScriptProperties();

  // 1. Reset flags & counter
  const allProps = props.getProperties();
  Object.keys(allProps).forEach(function (k) {
    if (k.indexOf("SEEDED_") === 0 ||
        k.indexOf("SEQ_") === 0 ||
        k.indexOf("OFFICIAL_SEQ_") === 0) {
      props.deleteProperty(k);
      Logger.log("  ✂ reset " + k);
    }
  });

  // 2. Wipe data (simpan header)
  if (wipe) {
    const ss = getDb_();
    Object.keys(SHEETS).forEach(function (name) {
      const sh = ss.getSheetByName(name);
      if (!sh) return;
      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        const maxCols = Math.max(sh.getMaxColumns(), SHEETS[name].length);
        sh.getRange(2, 1, lastRow - 1, maxCols).clearContent();
        Logger.log("  ✂ cleared " + name + " (" + (lastRow - 1) + " rows)");
      }
    });
    invalidateAllTables_();
  }

  // 3. Re-seed
  if (reseed) {
    ensureSeed_();
    Logger.log("  ✓ re-seed selesai");
  }

  // 4. Ringkasan
  const summary = {};
  Object.keys(SHEETS).forEach(function (n) { summary[n] = readAll_(n).length; });
  Logger.log("═══ SELESAI ═══");
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

/**
 * Verifikasi cepat tanpa mengubah data.
 * Lebih permisif dari runReadOnlyChecks (tidak cek referensi silang).
 */
function quickSanityCheck() {
  const issues = [];

  // 1. Cek header mismatch
  const ss = getDb_();
  Object.keys(SHEETS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const actual = sh.getRange(1, 1, 1, SHEETS[name].length).getDisplayValues()[0];
    if (actual.join("|") !== SHEETS[name].join("|")) {
      issues.push("Header mismatch: " + name);
    }
  });

  // 2. Cek format sel @ di kolom pertama data
  Object.keys(SHEETS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const fmt = sh.getRange(2, 1).getNumberFormat();
    if (fmt !== "@") issues.push("Format sel bukan @ di " + name);
  });

  // 3. Cek id duplikat
  Object.keys(SHEETS).forEach(function (name) {
    const rows = readAll_(name);
    const seen = {};
    rows.forEach(function (r) {
      if (r.id && seen[r.id]) issues.push("id duplikat di " + name + ": " + r.id);
      if (r.id) seen[r.id] = true;
    });
  });

  if (issues.length === 0) {
    Logger.log("✓ Tidak ada masalah terdeteksi.");
  } else {
    Logger.log("⚠ " + issues.length + " masalah:");
    issues.forEach(function (i) { Logger.log("  • " + i); });
  }
  return issues;
}

function updatePimpinanData() {
  const newSigner = {
    signerName: "Drs. HABIB SOLEHUDDIN, M.PSDM",
    signerPosition: "Kepala Satpol PP dan Kebakaran Kab. Trenggalek",
    signerNip: "197003202005011004",
    signerRank: "Pembina Utama Muda / IVc" // Tambahan pangkat
  };

  // 1. Update Master Signers
  const signers = readAll_("signers");
  if (signers.length > 0) {
    updateById_("signers", signers[0].id, {
      name: newSigner.signerName,
      nip: newSigner.signerNip,
      pangkatGol: newSigner.signerRank
    });
    Logger.log("✓ Master Signers diupdate.");
  }

  // 2. Update Semua Surat Tugas (Letters) yang masih pakai nama lama
  const letters = readAll_("letters");
  let count = 0;
  letters.forEach(l => {
    if (l.signerName === "Drs. Tri Sukmono, M.Si." || !l.signerRank) {
      updateById_("letters", l.id, {
        signerName: newSigner.signerName,
        signerPosition: newSigner.signerPosition,
        signerNip: newSigner.signerNip,
        signerRank: newSigner.signerRank
      });
      count++;
    }
  });
  Logger.log("✓ " + count + " Surat Tugas diperbarui nama penandatangan-nya.");
}
