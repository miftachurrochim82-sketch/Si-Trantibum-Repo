/**
 * ============================================================================
 * SI TRANTIBUM — FILE 2: WORKFLOW API (v3.2.0)
 * ============================================================================
 */

/* ===========================================================================
 * LETTERS (Surat Tugas)
 * =========================================================================== */
function apiCreateLetter(payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    assertRole_(me, ROLE_RULES.manager, "Hanya KOORDINATOR/PIMPINAN yang dapat membuat Surat Tugas.");

    if (!String(p.title || "").trim())       throw new Error("Nama kegiatan wajib diisi.");
    if (!String(p.legalBasis || "").trim())  throw new Error("Dasar surat wajib diisi.");
    if (!p.startDate || !p.endDate)          throw new Error("Tanggal mulai & selesai wajib diisi.");
    if (!Array.isArray(p.personnel) || !p.personnel.length) throw new Error("Pilih minimal 1 petugas.");

    const now = nowIso_();
    const seq = nextSeq_("letters");
    const code = "ST-" + pad_(seq, 3);
    const year = resolveYear_(p.letterDate || p.startDate);
    const isPimpinan = (me.role === "PIMPINAN" || me.role === "ADMIN");

    const row = {
      id: Utilities.getUuid(),
      code: code,
      draftNumber: p.draftNumber || ("DRAF-ST/" + year + "/" + pad_(seq, 3)),
      officialNumber: isPimpinan ? (p.officialNumber || generateOfficialNumber_(year)) : (p.officialNumber || ""),
      activityCode: p.activityCode || "",
      activityName: p.activityName || "",
      classification: p.classification || "",
      unit: "", // Dihapus dari form FE
      title: p.title,
      letterDate: p.letterDate || "",
      startDate: p.startDate || "",
      startTime: p.startTime || "",
      endDate: p.endDate || p.startDate || "",
      endTime: p.endTime || "",
      location: p.location || "",
      village: p.village || "",
      locationName: p.locationName || "",
      notes: p.notes || "",
      purpose: p.purpose || "",
      legalBasis: p.legalBasis || "",
      specificData: {}, // Dihapus dari form FE
      personnel: p.personnel || [],
      teamLeader: p.teamLeader || "",
      signerName: p.signerName || "",
      signerPosition: p.signerPosition || "",
      signerNip: p.signerNip || "",
      signerRank: p.signerRank || "", // Field baru
      assetsUsed: Array.isArray(p.assetsUsed) ? p.assetsUsed : [],
      agenciesInvolved: [], // Dihapus dari form FE
      status: isPimpinan ? "ISSUED" : "PENDING_APPROVAL",
      approvalNote: "",
      createdBy: me.name || me.role,
      createdAt: now,
      updatedAt: now,
    };

    appendObject_("letters", row);
    logAudit_("Surat Tugas", code, row.status, me.name, me.role,
      isPimpinan
        ? ("Diterbitkan langsung oleh Pimpinan dengan nomor " + row.officialNumber)
        : "Draf ST dibuat & diajukan untuk disetujui Pimpinan.");
    return row;
  });
}

function apiUpdateLetter(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    const existing = findObjectById_("letters", id);
    if (!existing) throw new Error("Surat Tugas tidak ditemukan.");

    const action = String(p.action || "").toLowerCase();
    const allowedActions = ["approve", "approveandissue", "reject", "issue", "submit", ""];
    if (allowedActions.indexOf(action) === -1) throw new Error("Aksi tidak dikenal: " + action);

    if (action && action !== "submit") {
      assertRole_(me, ROLE_RULES.pimpinan, "Hanya Pimpinan yang dapat approve/reject/issue ST.");
    }

    const patch = {};
    // Field unit, specificData, agenciesInvolved sudah dihapus dari sini
    [
      "title","letterDate","startDate","startTime","endDate","endTime","location","village",
      "locationName","notes","purpose","legalBasis","personnel","teamLeader",
      "signerName","signerPosition","signerNip","signerRank","assetsUsed",
      "activityCode","activityName","classification","officialNumber","approvalNote",
    ].forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(p, k)) patch[k] = p[k];
    });

    const year = resolveYear_(patch.letterDate || patch.startDate || existing.letterDate || existing.startDate);

    if (action === "approve" || action === "approveandissue" || action === "issue") {
      patch.status = "ISSUED";
      patch.officialNumber = p.officialNumber || existing.officialNumber || generateOfficialNumber_(year);
      patch.approvalNote = p.approvalNote || "";
    } else if (action === "reject") {
      patch.status = "REJECTED";
      patch.approvalNote = p.approvalNote || "Ditolak Pimpinan, perlu revisi.";
    } else if (action === "submit") {
      if (me.role === "PIMPINAN" || me.role === "ADMIN") {
        patch.status = "ISSUED";
        patch.officialNumber = p.officialNumber || existing.officialNumber || generateOfficialNumber_(year);
      } else {
        patch.status = "PENDING_APPROVAL";
      }
      patch.approvalNote = "";
    } else if (p.status && p.status !== existing.status) {
      const critical = ["ISSUED", "REJECTED"];
      if (critical.indexOf(String(p.status).toUpperCase()) > -1) {
        assertRole_(me, ROLE_RULES.pimpinan, "Perubahan status ke " + p.status + " hanya boleh oleh Pimpinan.");
        if (String(p.status).toUpperCase() === "ISSUED" && !existing.officialNumber && !p.officialNumber) {
          patch.officialNumber = generateOfficialNumber_(year);
        }
      }
      patch.status = p.status;
    }

    patch.updatedAt = nowIso_();
    const updated = updateById_("letters", id, patch);
    logAudit_("Surat Tugas", updated.code, updated.status, me.name, me.role,
      p.auditDetail || ("ST diperbarui" + (action ? (" — aksi: " + action) : "") + ": " + updated.title));
    return updated;
  });
}

function apiDeleteLetter(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_(payload || {});
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk menghapus Surat Tugas.");

    const existing = findObjectById_("letters", id);
    if (!existing) throw new Error("Surat Tugas tidak ditemukan.");

    const linked = readAll_("reports").filter(function (r) { return String(r.letterId) === String(id); });
    if (linked.length) {
      throw new Error("Surat Tugas tidak dapat dihapus karena sudah memiliki " + linked.length + " laporan terkait.");
    }

    deleteById_("letters", id);
    logAudit_("Surat Tugas", existing.code, "DELETED", me.name, me.role, "Surat Tugas dihapus.");
    return { ok: true };
  });
}

/* ===========================================================================
 * REPORTS (Laporan Kegiatan)
 * =========================================================================== */
function apiCreateReport(payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    assertRole_(me, ROLE_RULES.operational, "Akses ditolak untuk membuat laporan.");

    if (!String(p.description || "").trim()) throw new Error("Uraian pelaksanaan wajib diisi.");
    if (!p.letterId) throw new Error("Surat Tugas terkait wajib dipilih.");

    const letter = findObjectById_("letters", p.letterId);
    if (!letter) throw new Error("Surat Tugas terkait tidak ditemukan.");
    if (letter.status !== "ISSUED") throw new Error("Laporan hanya dapat dibuat dari ST berstatus ISSUED.");

    const now = nowIso_();
    const seq = nextSeq_("reports");
    const vc = Number(p.violatorCount || 0);

    const row = {
      id: Utilities.getUuid(),
      code: "LP-" + pad_(seq, 3),
      letterId: letter.id,
      stNumber: letter.officialNumber || letter.draftNumber || "",
      activityName: letter.activityName || "",
      activityCode: letter.activityCode || "",
      actualTime: p.actualTime || "",
      actualLocation: p.actualLocation || "",
      description: p.description || "",
      results: p.results || "",
      obstacles: p.obstacles || "Nihil",
      recommendation: p.recommendation || "",
      violationRef: p.violationRef || "",
      violatorCount: Number.isFinite(vc) ? vc : 0,
      actionTaken: p.actionTaken || "",
      evidenceList: Array.isArray(p.evidenceList) ? p.evidenceList : [],
      status: "SUBMITTED",
      createdBy: me.name || me.role,
      verifiedBy: "",
      verificationNote: "",
      createdAt: now,
      updatedAt: now,
      // FIELD DINAMIS
      objectTarget: p.objectTarget || "",
      massEstimate: p.massEstimate || "",
      targetAudience: p.targetAudience || "",
      materialTopic: p.materialTopic || ""
    };

    appendObject_("reports", row);
    logAudit_("Laporan", row.code, "SUBMITTED", me.name, me.role,
      "Laporan " + row.activityName + " dibuat dari " + row.stNumber + ".");
    return row;
  });
}

function apiUpdateReport(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    const existing = findObjectById_("reports", id);
    if (!existing) throw new Error("Laporan tidak ditemukan.");

    const action = String(p.action || "").toLowerCase();
    if (["verify", "return", "close", ""].indexOf(action) === -1) {
      throw new Error("Aksi tidak dikenal: " + action);
    }

    if (action === "verify" || action === "return" || action === "close") {
      assertRole_(me, ROLE_RULES.manager, "Hanya Koordinator/Pimpinan yang dapat " + action + " laporan.");
    }

    const patch = {};
    // FIELD DINAMIS DITAMBAHKAN DI SINI
    ["description","results","obstacles","recommendation","violationRef","actionTaken","evidenceList","actualTime","actualLocation",
     "objectTarget","massEstimate","targetAudience","materialTopic"]
      .forEach(function (k) { if (Object.prototype.hasOwnProperty.call(p, k)) patch[k] = p[k]; });
      
    if (p.violatorCount !== undefined) {
      const vc = Number(p.violatorCount || 0);
      patch.violatorCount = Number.isFinite(vc) ? vc : 0;
    }

    if (action === "verify") {
      patch.status = "VERIFIED";
      patch.verifiedBy = me.name;
      patch.verificationNote = p.verificationNote || "";
    } else if (action === "return") {
      patch.status = "RETURNED";
      patch.verificationNote = p.verificationNote || "Perlu perbaikan dokumentasi.";
    } else if (action === "close") {
      patch.status = "CLOSED";
    }

    patch.updatedAt = nowIso_();
    const updated = updateById_("reports", id, patch);

    if (action === "verify" && existing.status !== "VERIFIED") {
      const fuSeq = nextSeq_("follow_ups");
      const fuRow = {
        id: Utilities.getUuid(),
        code: "FU-" + pad_(fuSeq, 3),
        reportId: updated.id,
        reportCode: updated.code,
        actionRequired: updated.recommendation || "Tindak lanjut hasil kegiatan terverifikasi",
        pic: p.pic || "",
        picUnit: p.picUnit || "",
        deadline: p.deadline || "",
        priority: p.priority || "Sedang",
        status: "PROSES",
        progressNote: "",
        completionNote: "",
        createdAt: nowIso_(),
        updatedAt: nowIso_(),
      };
      appendObject_("follow_ups", fuRow);
      logAudit_("Tindak Lanjut", fuRow.code, "CREATED", me.name, me.role,
        "Auto-create tindak lanjut dari verifikasi " + updated.code + ".");
    }

    logAudit_("Laporan", updated.code, updated.status, me.name, me.role,
      p.auditDetail || ("Laporan diperbarui" + (action ? (" — aksi: " + action) : "") + "."));
    return updated;
  });
}

function apiDeleteReport(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_(payload || {});
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk menghapus laporan.");

    const existing = findObjectById_("reports", id);
    if (!existing) throw new Error("Laporan tidak ditemukan.");

    const linked = readAll_("follow_ups").filter(function (f) { return String(f.reportId) === String(id); });
    linked.forEach(function (f) { deleteById_("follow_ups", f.id); });

    deleteById_("reports", id);
    logAudit_("Laporan", existing.code, "DELETED", me.name, me.role,
      "Laporan dihapus (+ " + linked.length + " tindak lanjut terkait).");
    return { ok: true };
  });
}

/* ===========================================================================
 * FOLLOW-UPS (Tindak Lanjut)
 * =========================================================================== */
function apiCreateFollowUp(payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk membuat tindak lanjut.");

    if (!p.reportId) throw new Error("Laporan referensi wajib dipilih.");
    const report = findObjectById_("reports", p.reportId);
    if (!report) throw new Error("Laporan referensi tidak ditemukan.");
    if (!String(p.actionRequired || "").trim()) throw new Error("Tindakan tindak lanjut wajib diisi.");

    const now = nowIso_();
    const seq = nextSeq_("follow_ups");
    const row = {
      id: Utilities.getUuid(),
      code: "FU-" + pad_(seq, 3),
      reportId: report.id,
      reportCode: report.code || "",
      actionRequired: p.actionRequired,
      pic: p.pic || "",
      picUnit: p.picUnit || "",
      deadline: p.deadline || "",
      priority: p.priority || "Sedang",
      status: "PROSES",
      progressNote: "",
      completionNote: "",
      createdAt: now,
      updatedAt: now,
    };
    appendObject_("follow_ups", row);
    logAudit_("Tindak Lanjut", row.code, "CREATED", me.name, me.role,
      "Tindak lanjut dari " + row.reportCode + " untuk PIC " + row.pic + ".");
    return row;
  });
}

function apiUpdateFollowUp(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const p = payload || {};
    const me = resolveActor_(p);
    const existing = findObjectById_("follow_ups", id);
    if (!existing) throw new Error("Tindak lanjut tidak ditemukan.");

    const action = String(p.action || "").toLowerCase();
    const patch = {};
    ["actionRequired","pic","picUnit","deadline","priority","status","progressNote","completionNote"]
      .forEach(function (k) { if (Object.prototype.hasOwnProperty.call(p, k)) patch[k] = p[k]; });

    if (action === "complete") patch.status = "SELESAI";
    patch.updatedAt = nowIso_();

    const updated = updateById_("follow_ups", id, patch);
    logAudit_("Tindak Lanjut", updated.code, updated.status || "UPDATED", me.name, me.role,
      p.auditDetail || "Tindak lanjut diperbarui.");
    return updated;
  });
}

function apiDeleteFollowUp(id, payload) {
  return withLock_(function () {
    ensureSheets_();
    const me = resolveActor_(payload || {});
    assertRole_(me, ROLE_RULES.manager, "Akses ditolak untuk menghapus tindak lanjut.");
    const existing = findObjectById_("follow_ups", id);
    if (!existing) throw new Error("Tindak lanjut tidak ditemukan.");
    deleteById_("follow_ups", id);
    logAudit_("Tindak Lanjut", existing.code, "DELETED", me.name, me.role, "Tindak lanjut dihapus.");
    return { ok: true };
  });
}
