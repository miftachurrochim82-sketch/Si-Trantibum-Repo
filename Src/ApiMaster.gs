/**
 * ============================================================================
 * SI TRANTIBUM — FILE 3: MASTER DATA API (v3.2.0)
 * ============================================================================
 */

function apiCreateMaster(resource, payload) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_(payload || {});
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk menambah master data.");

    const sheetName = MASTER_SHEETS[resource];
    if (!sheetName) throw new Error("Resource master tidak dikenal: " + resource);

    const row = cleanMaster_(payload);
    validateMaster_(sheetName, row);
    assertUnique_(sheetName, row, null);

    row.id = Utilities.getUuid();
    if (!row.code && row.name) row.code = autoCodeFromName_(sheetName, row.name);
    row.createdAt = nowIso_();
    row.updatedAt = nowIso_();

    appendObject_(sheetName, row);
    logAudit_("Master", row.code || row.name || "", "CREATED", me.name, me.role,
      "Tambah master " + resource + ": " + (row.name || row.code || ""));
    return row;
  });
}

function apiUpdateMaster(resource, id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_(payload || {});
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk mengubah master data.");

    const sheetName = MASTER_SHEETS[resource];
    if (!sheetName) throw new Error("Resource master tidak dikenal: " + resource);

    const existing = findObjectById_(sheetName, id);
    if (!existing) throw new Error("Data master tidak ditemukan.");

    const row = cleanMaster_(payload);
    delete row.id; delete row.createdAt;
    validateMaster_(sheetName, Object.assign({}, existing, row));
    assertUnique_(sheetName, row, id);

    row.updatedAt = nowIso_();
    const updated = updateById_(sheetName, id, row);
    logAudit_("Master", updated.code || updated.name || "", "UPDATED", me.name, me.role,
      "Update master " + resource + ": " + (updated.name || updated.code || ""));
    return updated;
  });
}

function apiDeleteMaster(resource, id) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_({});
    assertRole_(me, ROLE_RULES.pimpinan, "Hanya Pimpinan/Admin yang dapat menghapus master data.");

    const sheetName = MASTER_SHEETS[resource];
    if (!sheetName) throw new Error("Resource master tidak dikenal: " + resource);

    const existing = findObjectById_(sheetName, id);
    if (!existing) throw new Error("Data master tidak ditemukan.");

    const refs = countReferences_(sheetName, existing);
    if (refs > 0) {
      throw new Error("Data tidak dapat dihapus, masih direferensikan oleh " + refs + " data lain.");
    }

    deleteById_(sheetName, id);
    logAudit_("Master", existing.code || existing.name || "", "DELETED", me.name, me.role,
      "Hapus master " + resource + ".");
    return { ok: true };
  });
}

function countReferences_(sheetName, item) {
  const code = item.code || "";
  const name = item.name || "";
  
  if (sheetName === "assets" && code) {
    return readAll_("letters").filter(function (l) {
      return (l.assetsUsed || []).indexOf(code) > -1;
    }).length;
  }
  
  if (sheetName === "agencies" && code) {
    return readAll_("letters").filter(function (l) {
      return (l.agenciesInvolved || []).indexOf(code) > -1;
    }).length;
  }
  
  if (sheetName === "activity_types" && code) {
    return readAll_("letters").filter(function (l) { return l.activityCode === code; }).length;
  }
  
  if (sheetName === "villages") {
    return readAll_("letters").filter(function (l) { 
      return l.village === code || l.village === name; 
    }).length;
  }
  
  if (sheetName === "regions") {
    return readAll_("letters").filter(function (l) { 
      return l.location === name; 
    }).length;
  }
  
  return 0;
}

function cleanMaster_(payload) {
  const row = Object.assign({}, payload || {});
  ["actorName","actorRole","auditDetail","action","id","createdAt","updatedAt"].forEach(function (k) {
    delete row[k];
  });
  return row;
}

function validateMaster_(sheetName, row) {
  if (sheetName === "users") {
    if (!row.name) throw new Error("Nama pengguna wajib diisi.");
    if (!row.role) throw new Error("Role pengguna wajib diisi.");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      throw new Error("Format email tidak valid.");
    }
  }
  if (sheetName === "activity_types" && !row.code && !row.name) throw new Error("Kode/nama kegiatan wajib diisi.");
  if (sheetName === "regions" && !row.name) throw new Error("Nama kecamatan wajib diisi.");
  if (sheetName === "villages" && (!row.name || !row.regionCode)) throw new Error("Nama desa & kecamatan wajib diisi.");
  if (sheetName === "signers" && (!row.name || !row.position)) throw new Error("Nama & jabatan wajib diisi.");
  if (sheetName === "violations" && !row.code) throw new Error("Kode pelanggaran wajib diisi.");
  if (sheetName === "assets" && !row.code) throw new Error("Kode aset wajib diisi.");
  if (sheetName === "agencies" && !row.code) throw new Error("Kode instansi wajib diisi.");
}

function assertUnique_(sheetName, row, excludeId) {
  const fields = UNIQUE_FIELDS[sheetName] || [];
  if (!fields.length) return;
  const all = readAll_(sheetName);
  fields.forEach(function (f) {
    const val = String(row[f] || "").trim().toLowerCase();
    if (!val) return;
    const dup = all.some(function (r) {
      return String(r.id) !== String(excludeId) &&
             String(r[f] || "").trim().toLowerCase() === val;
    });
    if (dup) throw new Error("Nilai " + f + " \"" + row[f] + "\" sudah digunakan data lain.");
  });
}

function autoCodeFromName_(sheetName, name) {
  const prefix = sheetName.substring(0, 3).toUpperCase();
  const existing = readAll_(sheetName).filter(function (r) {
    return String(r.code || "").indexOf(prefix + "-") === 0;
  });
  return prefix + "-" + pad_(existing.length + 1, 3);
}
