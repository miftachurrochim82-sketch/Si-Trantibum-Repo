/**
 * ============================================================================
 * SI TRANTIBUM — FILE 4: SEED DATA & TEMPLATE GENERATOR (v3.2.0)
 * ============================================================================
 * Berisi:
 *   - VILLAGE_SEED (14 kecamatan, 135 desa)
 *   - ensureVillages_, ensureSeed_ (idempotent via SEEDED_* flag)
 *   - setupTemplateDocuments (generate .docx ke folder 06-Template)
 *   - Generator helpers: addKopHeader_, addCenteredTitle_, addParagraph_,
 *                        addField_, addPersonnelTable_, addSignatureBlock_
 *   - generateTemplateST_, generateTemplateLP_
 *   - forceSeedUsers (fungsi bantu development)
 * ============================================================================
 */

const VILLAGE_SEED = {
  "TRG-01": ["Kelurahan Kelutan","Kelurahan Ngantru","Kelurahan Sumbergedong","Kelurahan Surodakan","Kelurahan Tamanan","Desa Dawuhan","Desa Karangsuko","Desa Ngares","Desa Parakan","Desa Rejowinangun","Desa Sambirejo","Desa Sukosari"],
  "TRG-02": ["Desa Bendorejo","Desa Gembleb","Desa Kedunglurah","Desa Ngadirejo","Desa Ngadirenggo","Desa Pogalan","Desa Wonocoyo"],
  "TRG-03": ["Desa Buluagung","Desa Jati","Desa Karangan","Desa Kayen","Desa Kerjo","Desa Salamrejo","Desa Sumber","Desa Wonokerto"],
  "TRG-04": ["Desa Banjar","Desa Bodag","Desa Depok","Desa Gayam","Desa Kertosono","Desa Manggis","Desa Nglebeng","Desa Panggul","Desa Terbis","Desa Wonocoyo"],
  "TRG-05": ["Desa Dukuh","Desa Gemaharjo","Desa Karanggandu","Desa Margomulyo","Desa Ngembel","Desa Pakel","Desa Prigi","Desa Sawahan","Desa Slawe","Desa Tasikmadu","Desa Watulimo","Desa Watuagung"],
  "TRG-06": ["Desa Baruharjo","Desa Durenan","Desa Gador","Desa Kamulan","Desa Karanganom","Desa Kendalrejo","Desa Malasan","Desa Ngadisuko","Desa Pandean","Desa Panggungsari","Desa Semarum","Desa Sumbergayam"],
  "TRG-07": ["Desa Bendoagung","Desa Bogoran","Desa Karangrejo","Desa Senden","Desa Sugihan","Desa Timahan"],
  "TRG-08": ["Desa Cakul","Desa Dongko","Desa Ngerdani","Desa Pandean","Desa Petung","Desa Pringapus","Desa Salamwates","Desa Siki","Desa Sumberbening","Desa Watuagung"],
  "TRG-09": ["Desa Banaran","Desa Dermosari","Desa Gading","Desa Gondang","Desa Jambu","Desa Ngepeh","Desa Nglinggis","Desa Prambon","Desa Pucanganak","Desa Sukorejo","Desa Tegaren","Desa Tugu","Desa Winong"],
  "TRG-10": ["Desa Bangun","Desa Bendoroto","Desa Besuki","Desa Craken","Desa Karangturi","Desa Masaran","Desa Munjungan","Desa Ngulungkulon","Desa Ngulungwetan","Desa Sobo","Desa Tawing"],
  "TRG-11": ["Desa Bendungan","Desa Botoputih","Desa Depok","Desa Dompyong","Desa Sengon","Desa Srabah","Desa Sumurup","Desa Surenlor"],
  "TRG-12": ["Desa Gandusari","Desa Jajar","Desa Karanganyar","Desa Krandegan","Desa Melis","Desa Ngrayung","Desa Sukorejo","Desa Wonoanti","Desa Wonorejo"],
  "TRG-13": ["Desa Joho","Desa Jombok","Desa Karanganyar","Desa Kembangan","Desa Pakel","Desa Pule","Desa Puyung","Desa Sidomulyo","Desa Sukokidul","Desa Tangkil"],
  "TRG-14": ["Desa Gamping","Desa Mlinjon","Desa Nglebo","Desa Ngrandu","Desa Puru","Desa Suruh","Desa Wonorejo"],
};

function ensureVillages_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("SEEDED_villages")) return;
  if (readAll_("villages").length > 0) { props.setProperty("SEEDED_villages", "1"); return; }
  const now = nowIso_();
  Object.keys(VILLAGE_SEED).forEach(function (regionCode) {
    VILLAGE_SEED[regionCode].forEach(function (name, i) {
      appendObject_("villages", {
        id: "vil-" + regionCode + "-" + (i + 1),
        code: regionCode + "-DS" + pad_(i + 1, 2),
        name: name, regionCode: regionCode,
        createdAt: now, updatedAt: now,
      });
    });
  });
  props.setProperty("SEEDED_villages", "1");
}

function ensureSeed_() {
  ensureSheets_();
  ensureVillages_();

  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("SEEDED_users")) return;
  if (readAll_("users").length > 0) { props.setProperty("SEEDED_users", "1"); return; }

  const now = nowIso_();
  const add = function (sheet, rows) {
    rows.forEach(function (r) { appendObject_(sheet, Object.assign({ createdAt: now, updatedAt: now }, r)); });
  };

  add("users", [
    { id: "u-admin", name: "Administrator Sistem", nip: "19850101 201001 1 001", pangkatGol: "Penata / IIIc", jenisJabatan: "Fungsional", jabatan: "Pranata Komputer", unit: "Sekretariat — Pusat Data", email: "admin@trenggalekkab.go.id", noHp: "081234567890", role: "ADMIN", canSign: false },
    { id: "u-budi", name: "Budi Santoso, S.Sos", nip: "19900512 201502 1 003", pangkatGol: "Penata Muda / IIIa", jenisJabatan: "Struktural", jabatan: "Kasi Ops", unit: "Seksi Operasional dan Pengendalian", email: "budi.koordinator@trenggalekkab.go.id", noHp: "081234567891", role: "KOORDINATOR", canSign: false },
    { id: "u-siti", name: "Siti Rahmawati, S.H.", nip: "19880320 201204 2 002", pangkatGol: "Penata / IIIc", jenisJabatan: "Struktural", jabatan: "Kasi Trantibum", unit: "Seksi Ketertiban Umum dan Ketentraman", email: "koordinator@trenggalekkab.go.id", noHp: "081234567892", role: "KOORDINATOR", canSign: false },
    { id: "u-joko", name: "Joko Prasetyo", nip: "19950715 201903 1 005", pangkatGol: "Pengatur / IIc", jenisJabatan: "Pelaksana", jabatan: "Petugas Lapangan", unit: "Regu Lapangan — Elang", email: "petugas@trenggalekkab.go.id", noHp: "081234567893", role: "PETUGAS", canSign: false },
    { id: "u-pimpinan", name: "Drs. HABIB SOLEHUDDIN, M.PSDM", nip: "197003202005011004", pangkatGol: "Pembina Utama Muda / IVc", jenisJabatan: "Struktural", jabatan: "Kepala Satuan", unit: "Kepala Satuan", email: "pimpinan@trenggalekkab.go.id", noHp: "081234567894", role: "PIMPINAN", canSign: true },
    { id: "u-agus", name: "Agus Santoso, S.Sos", nip: "19750415 199803 1 004", pangkatGol: "Penata Tk.I / IIId", jenisJabatan: "Struktural", jabatan: "Sekretaris", unit: "Sekretariat", email: "sekretaris@trenggalekkab.go.id", noHp: "081234567895", role: "KOORDINATOR", canSign: true },
    { id: "u-rina", name: "Rina Widyastuti", nip: "19920314 201705 2 007", pangkatGol: "Penata Muda / IIIa", jenisJabatan: "Pelaksana", jabatan: "Petugas Lapangan", unit: "Regu Lapangan — Macan", email: "petugas2@trenggalekkab.go.id", noHp: "081234567896", role: "PETUGAS", canSign: false },
  ]);

  add("activity_types", [
    { id: "act-penjagaan", code: "PENJAGAAN", name: "Penjagaan", classification: "INTERNAL", stCode: "ST-TRT-PNJ", reportCode: "LP-TRT-PNJ", description: "Penjagaan objek vital, kantor pemerintah, dan aset daerah." },
    { id: "act-patroli", code: "PATROLI", name: "Patroli", classification: "INTERNAL", stCode: "ST-TRT-PTR", reportCode: "LP-TRT-PTR", description: "Patroli wilayah rutin untuk memantau ketertiban umum." },
    { id: "act-pengamanan", code: "PENGAMANAN", name: "Pengamanan", classification: "INTERNAL", stCode: "ST-TRT-PAM", reportCode: "LP-TRT-PAM", description: "Pengamanan kegiatan, acara, dan kunjungan VIP/VVIP." },
    { id: "act-pembinaan", code: "PEMBINAAN_PENYULUHAN", name: "Pembinaan dan Penyuluhan", classification: "INTERNAL", stCode: "ST-TRT-BIN", reportCode: "LP-TRT-BIN", description: "Sosialisasi Perda, pembinaan PKL, sekolah, dan komunitas." },
    { id: "act-deteksi", code: "DETEKSI_DINI_CEGAH_DINI", name: "Deteksi Dini dan Cegah Dini", classification: "TERBATAS", stCode: "ST-TRT-DDCD", reportCode: "LP-TRT-DDCD", description: "Pemetaan potensi kerawanan dan pencegahan gangguan trantibum." },
    { id: "act-penertiban", code: "PENERTIBAN", name: "Penertiban", classification: "TERBATAS", stCode: "ST-TRT-PTB", reportCode: "LP-TRT-PTB", description: "Penertiban pelanggaran Perda/Perkada secara tegas dan humanis." },
    { id: "act-dalmas", code: "PENGENDALIAN_MASSA", name: "Pengendalian Massa", classification: "TERBATAS", stCode: "ST-TRT-PDM", reportCode: "LP-TRT-PDM", description: "Pengendalian kerumunan dan unjuk rasa bersama TNI/Polri." },
  ]);

  add("regions", [
    ["TRG-01","Kecamatan Trenggalek","Sedang"],["TRG-02","Kecamatan Pogalan","Normal"],["TRG-03","Kecamatan Karangan","Normal"],
    ["TRG-04","Kecamatan Panggul","Tinggi"],["TRG-05","Kecamatan Watulimo","Tinggi"],["TRG-06","Kecamatan Durenan","Sedang"],
    ["TRG-07","Kecamatan Kampak","Normal"],["TRG-08","Kecamatan Dongko","Normal"],["TRG-09","Kecamatan Tugu","Sedang"],
    ["TRG-10","Kecamatan Munjungan","Tinggi"],["TRG-11","Kecamatan Bendungan","Normal"],["TRG-12","Kecamatan Gandusari","Normal"],
    ["TRG-13","Kecamatan Pule","Normal"],["TRG-14","Kecamatan Suruh","Normal"],
  ].map(function (r) { return { id: "reg-" + r[0], code: r[0], name: r[1], risk: r[2] }; }));

  add("signers", [
    { id: "sig-1", name: "Drs. HABIB SOLEHUDDIN, M.PSDM", position: "Kepala Satpol PP dan Kebakaran Kab. Trenggalek", pangkatGol: "Pembina Utama Muda / IVc", nip: "197003202005011004" },
    { id: "sig-2", name: "Agus Santoso, S.Sos", position: "Sekretaris Satpol PP dan Kebakaran", pangkatGol: "Penata Tk.I / IIId", nip: "19750415 199803 1 004" },
    { id: "sig-3", name: "Heri Wahyudi, S.STP, M.Si.", position: "Kepala Bidang Trantibum dan Linmas", pangkatGol: "Pembina / IVa", nip: "19820618 200212 1 002" },
  ]);

  add("violations", [
    { id: "vio-1", code: "PRD-01", perdaNo: "Perda No. 3 Tahun 2019", article: "Pasal 12 Ayat (1)", description: "Berjualan di fasilitas umum / trotoar tanpa izin", category: "Trantibum / PKL", sanction: "Teguran lisan / tertulis, penyitaan sarana" },
    { id: "vio-2", code: "PRD-02", perdaNo: "Perda No. 5 Tahun 2021", article: "Pasal 8", description: "Membuang sampah tidak pada tempatnya", category: "Kebersihan Lingkungan", sanction: "Denda administratif" },
    { id: "vio-3", code: "PRD-03", perdaNo: "Perda No. 1 Tahun 2018", article: "Pasal 15", description: "Penyelenggaraan reklame kedaluwarsa / tanpa izin", category: "Perizinan / Reklame", sanction: "Pembongkaran" },
    { id: "vio-4", code: "PRD-04", perdaNo: "Perda No. 3 Tahun 2019", article: "Pasal 20", description: "Gangguan ketentraman: pengamen, gelandangan, balap liar", category: "Ketentraman Masyarakat", sanction: "Pembinaan / penertiban" },
    { id: "vio-5", code: "PRD-05", perdaNo: "Perda No. 7 Tahun 2020", article: "Pasal 6", description: "Usaha hiburan/kos tanpa izin & pelanggaran jam operasional", category: "Perizinan Usaha", sanction: "Peringatan, penyegelan sementara" },
  ]);

  add("assets", [
    { id: "ast-1", code: "AG-8012-YP", name: "Mobil Patroli Dalmas Isuzu D-Max", category: "Kendaraan Dinas Ops", spec: "Double Cabin 4x4, 2022", condition: "Baik" },
    { id: "ast-2", code: "AG-9011-KP", name: "Motor Patroli Trail Kawasaki KLX 150", category: "Kendaraan Dinas Ops", spec: "Trail 150cc, 2021", condition: "Baik" },
    { id: "ast-3", code: "AG-1245-YZ", name: "Mobil Patroli Toyota Rush", category: "Kendaraan Dinas Ops", spec: "SUV, 2020", condition: "Baik" },
    { id: "ast-4", code: "AST-SHIELD-01", name: "Tameng & Tongkat Dalmas (1 Set = 20 unit)", category: "Peralatan Taktis", spec: "Polycarbonate Shield 3mm", condition: "Baik" },
    { id: "ast-5", code: "AST-HT-01", name: "Handy Talky (HT) Motorola — 15 unit", category: "Komunikasi", spec: "UHF 400-470 MHz", condition: "Baik" },
    { id: "ast-6", code: "AST-MEG-01", name: "Megaphone / Pengeras Suara Lapangan", category: "Peralatan Taktis", spec: "25 Watt", condition: "Perawatan" },
  ]);

  add("agencies", [
    { id: "ag-1", code: "POLRES-TRG", name: "Polres Trenggalek — Bagian Operasional", contact: "(0355) 791110 / Kabag Ops" },
    { id: "ag-2", code: "KODIM-TRG", name: "Kodim 0806 / Trenggalek", contact: "(0355) 791234 / Pasi Ops" },
    { id: "ag-3", code: "DISHUB-TRG", name: "Dinas Perhubungan Kab. Trenggalek", contact: "(0355) 792200 / Bid. Lalu Lintas" },
    { id: "ag-4", code: "DLH-TRG", name: "Dinas Lingkungan Hidup", contact: "(0355) 796456" },
    { id: "ag-5", code: "DINSOS-TRG", name: "Dinas Sosial & P3A", contact: "(0355) 793310" },
    { id: "ag-6", code: "DPMPTSP-TRG", name: "DPMPTSP — Perizinan", contact: "(0355) 795500" },
  ]);

  const signer = {
    signerName: "Drs. HABIB SOLEHUDDIN, M.PSDM",
    signerPosition: "Kepala Satpol PP dan Kebakaran Kab. Trenggalek",
    signerNip: "197003202005011004",
    signerRank: "Pembina Utama Muda / IVc",
  };

  add("letters", [
    Object.assign({
      id: "st-001", code: "ST-001", draftNumber: "DRAF-ST/2026/001", officialNumber: "800/125/" + DEFAULT_REGION_CODE + "/2026",
      activityCode: "PATROLI", activityName: "Patroli", classification: "INTERNAL", unit: "",
      title: "Patroli Pengawasan Ketertiban Umum Wilayah Kecamatan Kota",
      letterDate: dateOffset_(-7), startDate: dateOffset_(-6), startTime: "19:00", endDate: dateOffset_(-6), endTime: "22:00",
      location: "Kecamatan Trenggalek", village: "Kelurahan Kelutan", locationName: "Alun-alun Trenggalek & Jl. Panglima Sudirman",
      notes: "Patroli malam — utamakan dialog humanis, laporkan hasil via grup regu.",
      purpose: "Memastikan ketertiban PKL dan parkir liar di sekitar Alun-alun, Pasar Pon, dan Jl. Panglima Sudirman.",
      legalBasis: "Perda No. 3 Tahun 2019 tentang Ketertiban Umum; Perbup No. 12 Tahun 2022.",
      specificData: {}, personnel: [
        { name: "Budi Santoso, S.Sos", rank: "Penata Muda / IIIa", role: "Ketua Tim" },
        { name: "Joko Prasetyo", rank: "Pengatur / IIc", role: "Anggota Regu" },
        { name: "Dedi Kurniawan", rank: "Pengatur Muda / IIa", role: "Anggota Regu" },
      ],
      teamLeader: "Budi Santoso, S.Sos", assetsUsed: ["AG-8012-YP","AST-HT-01"], agenciesInvolved: [],
      status: "ISSUED", approvalNote: "", createdBy: "Budi Santoso, S.Sos",
    }, signer),
    Object.assign({
      id: "st-002", code: "ST-002", draftNumber: "DRAF-ST/2026/002", officialNumber: "800/138/" + DEFAULT_REGION_CODE + "/2026",
      activityCode: "PENERTIBAN", activityName: "Penertiban", classification: "TERBATAS", unit: "",
      title: "Penertiban Reklame/Baliho Kedaluwarsa & Tanpa Izin di Ruas Jalan Protokol",
      letterDate: dateOffset_(-3), startDate: dateOffset_(-2), startTime: "08:00", endDate: dateOffset_(-1), endTime: "15:00",
      location: "Kecamatan Trenggalek", village: "Kelurahan Surodakan", locationName: "Jl. Soekarno Hatta s.d. Perempatan Jarakan",
      notes: "Bawa tangga & alat potong; barang bukti diamankan ke gudang Mako.",
      purpose: "Menegakkan Perda reklame, membersihkan visual kota, dan mengembalikan fungsi ruang milik jalan.",
      legalBasis: "Perda No. 1 Tahun 2018 tentang Penyelenggaraan Reklame Pasal 15.",
      specificData: {}, personnel: [
        { name: "Suryo Adi Nugroho", rank: "Penata / IIIc", role: "Ketua Tim" },
        { name: "Rina Widyastuti", rank: "Penata Muda Tk.I / IIIb", role: "Anggota Regu" },
        { name: "Andi Firmansyah", rank: "Pengatur / IIc", role: "Anggota Regu" },
        { name: "Lukman Hakim", rank: "Pengatur / IIc", role: "Anggota Regu" },
      ],
      teamLeader: "Suryo Adi Nugroho", assetsUsed: ["AG-1245-YZ"], agenciesInvolved: [],
      status: "ISSUED", approvalNote: "", createdBy: "Budi Santoso, S.Sos",
    }, signer),
    Object.assign({
      id: "st-003", code: "ST-003", draftNumber: "DRAF-ST/2026/003", officialNumber: "",
      activityCode: "PENGAMANAN", activityName: "Pengamanan", classification: "INTERNAL", unit: "",
      title: "Pengamanan Kirab Pusaka & Peringatan Hari Jadi Kabupaten di Alun-alun",
      letterDate: dateOffset_(-1), startDate: dateOffset_(3), startTime: "06:00", endDate: dateOffset_(3), endTime: "17:00",
      location: "Kecamatan Trenggalek", village: "Kelurahan Sumbergedong", locationName: "Pendopo Kabupaten & Alun-alun Trenggalek",
      notes: "Apel gabungan pukul 05.30 di halaman Pendopo; koordinasi ring dengan Polres.",
      purpose: "Mengamankan jalannya kirab pusaka dan mengantisipasi kepadatan pengunjung.",
      legalBasis: "Surat Bupati Trenggalek; Perda No. 3 Tahun 2019.",
      specificData: {}, personnel: [
        { name: "Triyono", rank: "Penata Muda / IIIa", role: "Ketua Tim" },
        { name: "Yusuf Mahendra", rank: "Pengatur / IIc", role: "Anggota Regu" },
        { name: "Galih Permana", rank: "Pengatur Muda / IIa", role: "Anggota Regu" },
      ],
      teamLeader: "Triyono", assetsUsed: ["AG-8012-YP","AST-SHIELD-01","AST-HT-01"], agenciesInvolved: [],
      status: "PENDING_APPROVAL", approvalNote: "", createdBy: "Budi Santoso, S.Sos",
    }, signer),
    Object.assign({
      id: "st-004", code: "ST-004", draftNumber: "DRAF-ST/2026/004", officialNumber: "800/144/" + DEFAULT_REGION_CODE + "/2026",
      activityCode: "DETEKSI_DINI_CEGAH_DINI", activityName: "Deteksi Dini dan Cegah Dini", classification: "TERBATAS", unit: "",
      title: "Pemetaan Potensi Kerawanan Jelang Musim Libur di Kawasan Wisata Pesisir",
      letterDate: dateOffset_(0), startDate: dateOffset_(5), startTime: "08:00", endDate: dateOffset_(7), endTime: "16:00",
      location: "Kecamatan Watulimo", village: "Desa Prigi", locationName: "Kawasan Wisata Pantai Prigi & akses parkir",
      notes: "Kirim laporan situasi harian ke grup pimpinan setiap pukul 15.00.",
      purpose: "Mendeteksi dini potensi gangguan trantibum di kawasan Pantai Prigi.",
      legalBasis: "Permendagri No. 26 Tahun 2020; Perda No. 3 Tahun 2019.",
      specificData: {}, personnel: [
        { name: "Siti Rahmawati, S.H.", rank: "Penata / IIIc", role: "Ketua Tim" },
        { name: "Joko Prasetyo", rank: "Pengatur / IIc", role: "Anggota Regu" },
      ],
      teamLeader: "Siti Rahmawati, S.H.", assetsUsed: ["AG-9011-KP"], agenciesInvolved: [],
      status: "ISSUED", approvalNote: "Diterbitkan langsung oleh Pimpinan.", createdBy: "Drs. HABIB SOLEHUDDIN, M.PSDM",
    }, signer),
  ]);

  add("reports", [
    {
      id: "lp-001", code: "LP-001", letterId: "st-001", stNumber: "800/125/" + DEFAULT_REGION_CODE + "/2026",
      activityName: "Patroli", activityCode: "PATROLI",
      actualTime: dateOffset_(-6) + "T19:30", actualLocation: "Alun-alun Trenggalek & Jl. Panglima Sudirman",
      description: "Patroli dimulai pukul 19.30 WIB dari Mako menuju Alun-alun, dilanjutkan menyisir Jl. Panglima Sudirman dan area Pasar Pon. Tim melakukan dialog humanis dengan PKL dan juru parkir liar.",
      results: "Ditemukan 2 PKL berjualan di trotoar dan 1 titik parkir liar. Diberikan teguran lisan, semuanya bersedia bergeser. Situasi aman kondusif.",
      obstacles: "Nihil — cuaca cerah, masyarakat kooperatif.",
      recommendation: "Patroli malam dilanjutkan 2x seminggu, khususnya akhir pekan. Koordinasi penataan zona PKL malam.",
      violationRef: "Perda No. 3 Tahun 2019 — Pasal 12 Ayat (1)", violatorCount: 3, actionTaken: "Teguran lisan",
      evidenceList: ["dokumentasi_patroli_01.jpg","berita_acara_patroli.pdf"],
      status: "VERIFIED", createdBy: "Joko Prasetyo",
      verifiedBy: "Siti Rahmawati, S.H.", verificationNote: "Lengkap dan sesuai ST.",
      objectTarget: "", massEstimate: "", targetAudience: "", materialTopic: ""
    },
    {
      id: "lp-002", code: "LP-002", letterId: "st-002", stNumber: "800/138/" + DEFAULT_REGION_CODE + "/2026",
      activityName: "Penertiban", activityCode: "PENERTIBAN",
      actualTime: dateOffset_(-2) + "T08:00", actualLocation: "Jl. Soekarno Hatta s.d. Perempatan Jarakan",
      description: "Tim gabungan Satpol PP, Dishub, dan DPMPTSP menyisir 35 titik reklame. Reklame kedaluwarsa dan tanpa izin diturunkan, barang bukti diamankan di gudang Mako.",
      results: "28 baliho/spanduk diturunkan (19 kedaluwarsa, 9 tanpa izin). 7 titik pemiliknya berjanji memperbarui izin dalam 7 hari.",
      obstacles: "2 pemilik reklame sempat berkeberatan, diselesaikan persuasif.",
      recommendation: "Susun penertiban putaran kedua untuk Jl. Brigjend Sutran dan terbitkan surat pemberitahuan.",
      violationRef: "Perda No. 1 Tahun 2018 — Pasal 15", violatorCount: 28, actionTaken: "Pembongkaran",
      evidenceList: ["foto_sebelum_sesudah.zip","berita_acara_penertiban.pdf","daftar_barang_bukti.xlsx"],
      status: "SUBMITTED", createdBy: "Rina Widyastuti",
      verifiedBy: "", verificationNote: "",
      objectTarget: "35 titik reklame", massEstimate: "", targetAudience: "", materialTopic: ""
    },
  ]);

  add("follow_ups", [
    { id: "fu-001", code: "FU-001", reportId: "lp-001", reportCode: "LP-001", actionRequired: "Koordinasi penataan zona PKL malam Alun-alun dengan Dinas Koperasi, UMKM & Perdagangan serta Dishub.", pic: "Budi Santoso, S.Sos", picUnit: "Seksi Operasional", deadline: dateOffset_(9), priority: "Sedang", status: "PROSES", progressNote: "Undangan rapat koordinasi telah dikirim.", completionNote: "" },
    { id: "fu-002", code: "FU-002", reportId: "lp-001", reportCode: "LP-001", actionRequired: "Susun jadwal patroli malam akhir pekan (Jumat–Sabtu) untuk 4 minggu ke depan.", pic: "Siti Rahmawati, S.H.", picUnit: "Seksi Ketertiban Umum", deadline: dateOffset_(-1), priority: "Tinggi", status: "PROSES", progressNote: "Draf jadwal selesai, menunggu persetujuan Kasat.", completionNote: "" },
    { id: "fu-003", code: "FU-003", reportId: "lp-002", reportCode: "LP-002", actionRequired: "Kirim surat pemberitahuan resmi kepada biro reklame terkait 7 titik yang berjanji memperbarui izin.", pic: "Rina Widyastuti", picUnit: "Seksi Penegakan", deadline: dateOffset_(5), priority: "Tinggi", status: "SELESAI", progressNote: "", completionNote: "Surat terkirim, 4 sudah konfirmasi proses perizinan." },
  ]);

  add("audit_logs", [
    { id: "log-1", entity: "Surat Tugas", entityCode: "ST-001", action: "ISSUED", actorName: "Drs. HABIB SOLEHUDDIN, M.PSDM", actorRole: "PIMPINAN", detail: "Disetujui & diterbitkan langsung oleh Pimpinan." },
    { id: "log-2", entity: "Laporan", entityCode: "LP-001", action: "VERIFIED", actorName: "Siti Rahmawati, S.H.", actorRole: "KOORDINATOR", detail: "Laporan diverifikasi, tindak lanjut otomatis dibuat." },
    { id: "log-3", entity: "Surat Tugas", entityCode: "ST-003", action: "PENDING_APPROVAL", actorName: "Budi Santoso, S.Sos", actorRole: "KOORDINATOR", detail: "Draf ST pengamanan diajukan untuk disetujui Pimpinan." },
    { id: "log-4", entity: "Surat Tugas", entityCode: "ST-004", action: "ISSUED", actorName: "Drs. HABIB SOLEHUDDIN, M.PSDM", actorRole: "PIMPINAN", detail: "ST deteksi dini disusun & diterbitkan Pimpinan." },
  ]);

  props.setProperty("SEEDED_users", "1");
}

/* ===========================================================================
 * TEMPLATE GENERATOR (.docx)
 * =========================================================================== */

function setupTemplateDocuments() {
  const rootFolder = getFolder_("FOLDER_TEMPLATE");
  const subFolder = ensureSubfolder_(rootFolder, "dokumen-resmi");
  const kopFolder = ensureSubfolder_(rootFolder, "kop-logo");
  const sopFolder = ensureSubfolder_(rootFolder, "sop-panduan");

  Logger.log("📁 Folder template:");
  Logger.log("  dokumen-resmi: " + subFolder.getUrl());
  Logger.log("  kop-logo: " + kopFolder.getUrl());
  Logger.log("  sop-panduan: " + sopFolder.getUrl());
  Logger.log("");

  const generators = [
    ["Surat Tugas (ST)",       function () { return generateTemplateST_(subFolder); }],
    ["Laporan Kegiatan (LP)",  function () { return generateTemplateLP_(subFolder); }],
    ["Berita Acara (BA)",      function () { return generateTemplateBA_(subFolder); }],
    ["Surat Pernyataan (SP)",  function () { return generateTemplateSP_(subFolder); }],
    ["Surat Panggilan",        function () { return generateTemplatePanggilan_(subFolder); }],
    ["Kop Surat PDF",          function () { return generateKopPDF_(kopFolder); }],
    ["README Folder",          function () { return generateReadmeFiles_(rootFolder, sopFolder); }],
  ];

  let ok = 0, fail = 0;
  generators.forEach(function (pair) {
    try {
      const r = pair[1]();
      const url = r && r.getUrl ? r.getUrl() : "OK";
      Logger.log("✓ " + pair[0] + ": " + url);
      ok++;
    } catch (e) {
      Logger.log("✘ " + pair[0] + " GAGAL: " + e.message);
      fail++;
    }
  });

  Logger.log("");
  Logger.log("═══════════════════════════════════");
  Logger.log("✓ " + ok + " berhasil, ✘ " + fail + " gagal");
  Logger.log("✓ Selesai. Buka folder 06-Template untuk melihat hasilnya.");
}

function ensureSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/** Header kop dinas (teks terpusat). */
function addKopHeader_(body) {
  const lines = [
    "PEMERINTAH KABUPATEN TRENGGALEK",
    "SATUAN POLISI PAMONG PRAJA DAN PEMADAM KEBAKARAN",
    "Jl. Brigjend Sutran No. 1 Trenggalek — Telp. (0355) 791111",
    "satpolpp@trenggalekkab.go.id"
  ];
  lines.forEach(function (line, i) {
    const p = body.appendParagraph(line);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    if (i === 0) p.editAsText().setBold(true).setFontSize(14);
    else if (i === 1) p.editAsText().setBold(true).setFontSize(16);
    else p.editAsText().setFontSize(9);
    p.setSpacingAfter(0);
    p.setSpacingBefore(0);
  });

  const line = body.appendParagraph("═══════════════════════════════════════════════════════════════");
  line.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  line.editAsText().setForegroundColor("#000000").setFontSize(10);
  line.setSpacingAfter(20);
  line.setSpacingBefore(4);
}

function addCenteredTitle_(body, title, subtitle) {
  const t = body.appendParagraph(title);
  t.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  t.editAsText().setBold(true).setFontSize(16).setUnderline(true);
  t.setSpacingBefore(10);
  t.setSpacingAfter(4);

  if (subtitle) {
    const s = body.appendParagraph(subtitle);
    s.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    s.editAsText().setFontSize(11);
    s.setSpacingAfter(16);
  }
}

function addParagraph_(body, text, opts) {
  opts = opts || {};
  const p = body.appendParagraph(text);
  p.editAsText().setFontSize(opts.fontSize || 11);
  if (opts.bold) p.editAsText().setBold(true);
  if (opts.italic) p.editAsText().setItalic(true);
  if (opts.align) p.setAlignment(opts.align);
  p.setSpacingBefore(opts.spacingBefore || 0);
  p.setSpacingAfter(opts.spacingAfter || 4);
  return p;
}

/** Field dengan label bold + placeholder merah (per-range agar label tetap hitam). */
function addField_(body, label, placeholder) {
  const p = body.appendParagraph("");
  const text = p.editAsText();

  const labelStr = label + ": ";
  text.appendText(labelStr);
  text.setBold(0, labelStr.length - 1, true);
  text.setFontSize(0, labelStr.length - 1, 11);

  const phStr = "<<" + placeholder + ">>";
  text.appendText(phStr);
  const phStart = labelStr.length;
  const phEnd = phStart + phStr.length - 1;
  text.setFontSize(phStart, phEnd, 11);
  text.setForegroundColor(phStart, phEnd, "#c00000");

  p.setSpacingAfter(4);
  return p;
}

function addPersonnelTable_(body) {
  const table = body.appendTable();
  const header = table.appendTableRow();
  ["No", "Nama", "NIP / Pangkat", "Jabatan dalam Tim"].forEach(function (h) {
    const cell = header.appendTableCell(h);
    cell.setBackgroundColor("#064e3b");
    cell.editAsText().setForegroundColor("#ffffff").setBold(true).setFontSize(10);
  });

  for (let i = 1; i <= 3; i++) {
    const row = table.appendTableRow();
    row.appendTableCell(String(i));
    row.appendTableCell("<<NAMA_PETUGAS_" + i + ">>");
    row.appendTableCell("<<NIP_" + i + ">>");
    row.appendTableCell(i === 1 ? "Ketua Tim" : "Anggota Regu");
    row.getCell(1).editAsText().setForegroundColor("#c00000");
    row.getCell(2).editAsText().setForegroundColor("#c00000");
  }

  body.appendParagraph("").setSpacingAfter(8);
}

function addSignatureBlock_(body, opts) {
  opts = opts || {};
  const place = opts.place || "Trenggalek";
  const date = opts.date || "<<TANGGAL_SURAT>>";
  const position = opts.position || "<<JABATAN_PENANDATANGAN>>";
  const name = opts.name || "<<NAMA_PENANDATANGAN>>";
  const nip = opts.nip || "<<NIP_PENANDATANGAN>>";

  body.appendParagraph("").setSpacingAfter(20);

  const rightAlign = function (text, bold, size) {
    const p = body.appendParagraph(text);
    p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    p.editAsText().setFontSize(size || 11);
    if (bold) p.editAsText().setBold(true);
    p.setSpacingAfter(2);
    return p;
  };

  rightAlign(place + ", " + date);
  rightAlign(position);
  body.appendParagraph("").setSpacingAfter(60);
  rightAlign(name, true);
  rightAlign("NIP. " + nip);
}

/**
 * Export Google Doc → .docx via UrlFetchApp.
 * DriveApp.getAs(MimeType.MICROSOFT_WORD) tidak mendukung Google Docs.
 */
function exportDocToDocx_(docId, docName, folder) {
  const exportUrl = "https://docs.google.com/document/d/" + docId + "/export?format=docx";
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error("Export .docx gagal: HTTP " + code + " — " + response.getContentText().slice(0, 200));
  }
  const blob = response.getBlob().setName(docName + ".docx");
  return folder.createFile(blob);
}

function generateTemplateST_(folder) {
  const docName = "template-surat-tugas";
  clearExistingFiles_(folder, docName + ".docx");

  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(50).setMarginRight(50);

  // --- KOP ---
  const kopText = [
    "PEMERINTAH KABUPATEN TRENGGALEK",
    "SATUAN POLISI PAMONG PRAJA DAN KEBAKARAN",
    "Jln. Dr. Soetomo No. 4 Kelurahan Ngantru, Trenggalek"
  ];
  kopText.forEach((line, i) => {
    const p = body.appendParagraph(line);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    if (i === 0) p.editAsText().setBold(true).setFontSize(14);
    else if (i === 1) p.editAsText().setBold(true).setFontSize(16);
    else p.editAsText().setFontSize(11);
    p.setSpacingAfter(0);
  });

  // Garis Kop (double line)
  const hrP = body.appendParagraph("_________________________________________________________________________________");
  hrP.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  hrP.editAsText().setFontSize(1).setBold(true);

  // --- JUDUL ---
  addCenteredTitle_(body, "SURAT TUGAS", "Nomor: <<NOMOR_SURAT>>");

  // --- DASAR ---
  addParagraph_(body, "Dasar:", { bold: true, spacingBefore: 10, spacingAfter: 4 });
  const dasarList = [
    "1.  Permendagri No. 16 Tahun 2023 tentang Standar Operasional Prosedur Satuan Polisi Pamong Praja dan Kode Etik Polisi Pamong Praja;",
    "2.  Permendagri No. 26 Tahun 2020 tentang Penyelenggaraan Ketertiban Umum Dan Ketenteraman Masyarakat Serta Pelindungan Masyarakat;",
    "3.  Perda Kabupaten Trenggalek Nomor 03 Tahun 2019 tentang Penyelenggaraan Ketertiban Umum, Ketenteraman dan Pelindungan Masyarakat; dan",
    "4.  <<DASAR_SURAT>>"
  ];
  dasarList.forEach(t => {
    const p = addParagraph_(body, t, { fontSize: 11, spacingAfter: 2 });
    p.setIndentStart(20);
  });

  // --- MEMBERIKAN TUGAS ---
  const perintah = body.appendParagraph("Memberikan Tugas :");
  perintah.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  perintah.editAsText().setBold(true).setFontSize(11);
  perintah.setSpacingBefore(12).setSpacingAfter(8);

  addParagraph_(body, "Kepada Petugas Satpol PPK yang namanya tercantum di bawah ini :", { fontSize: 11, spacingAfter: 6 });
  addPersonnelTable_(body);

  // --- UNTUK ---
  addParagraph_(body, "Untuk:", { fontSize: 11, spacingBefore: 8, spacingAfter: 4 });

  addParagraph_(body, "1.  Melaksanakan tugas <<JENIS_KEGIATAN>> yang berlokasi di wilayah Kecamatan <<KECAMATAN>>, dengan jadwal sebagai berikut :", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      •  Hari, Tanggal : <<TANGGAL_MULAI>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      •  Tempat : <<NAMA_LOKASI>>, Kec. <<KECAMATAN>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      •  Keperluan : <<PURPOSE>>", { fontSize: 11, spacingAfter: 6 });

  addParagraph_(body, "2.  Menggunakan sarana prasarana berupa Unit <<KENDARAAN>> serta peralatan pendukung lainnya guna kelancaran pelaksanaan tugas.", { fontSize: 11, spacingAfter: 6 });

  addParagraph_(body, "3.  Instruksi Khusus :", { fontSize: 11, spacingAfter: 2 });
  const instruksi = [
    "•  Melaksanakan koordinasi secara intensif dengan pihak Kepolisian atau instansi terkait lainnya sesuai kebutuhan di lapangan.",
    "•  Melaporkan setiap perkembangan situasi dan hasil pelaksanaan tugas secara berkala dan berjenjang kepada pimpinan.",
    "•  Wajib mengutamakan aspek keselamatan personel serta masyarakat di sekitar lokasi kegiatan."
  ];
  instruksi.forEach(t => {
    addParagraph_(body, "      " + t, { fontSize: 11, spacingAfter: 2 });
  });

  addParagraph_(body, "Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh rasa tanggung jawab.", { fontSize: 11, spacingBefore: 12, spacingAfter: 20 });

  // --- TTD ---
  const placeDate = body.appendParagraph("Ditetapkan di : Trenggalek");
  placeDate.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  placeDate.editAsText().setFontSize(11);
  placeDate.setSpacingAfter(2);

  const dateP = body.appendParagraph("Pada tanggal : <<TANGGAL_SURAT>>");
  dateP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  dateP.editAsText().setFontSize(11);
  dateP.setSpacingAfter(40);

  const sigs = [
    "KEPALA SATUAN",
    "POLISI PAMONG PRAJA DAN PEMADAM",
    "KEBAKARAN KABUPATEN TRENGGALEK"
  ];
  sigs.forEach(t => {
    const p = body.appendParagraph(t);
    p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    p.editAsText().setBold(true).setFontSize(11);
    p.setSpacingAfter(0);
  });

  body.appendParagraph("").setSpacingAfter(50); // ruang TTD

  const nameP = body.appendParagraph("<<NAMA_PENANDATANGAN>>");
  nameP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nameP.editAsText().setBold(true).setUnderline(true).setFontSize(11);
  nameP.setSpacingAfter(2);

  const rankP = body.appendParagraph("Pembina Utama Muda");
  rankP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  rankP.editAsText().setFontSize(11);
  rankP.setSpacingAfter(2);

  const nipP = body.appendParagraph("NIP. <<NIP_PENANDATANGAN>>");
  nipP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nipP.editAsText().setFontSize(11);
  nipP.setSpacingAfter(0);

  doc.saveAndClose();
  const result = exportDocToDocx_(doc.getId(), docName, folder);
  Logger.log("  📄 Google Doc source: " + doc.getUrl());
  Logger.log("  📄 File .docx: " + result.getUrl());
  return result;
}

function generateTemplateLP_(folder) {
  const docName = "template-laporan-kegiatan";
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();

  body.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);

  addKopHeader_(body);
  addCenteredTitle_(body, "LAPORAN PELAKSANAAN TUGAS", "Nomor: <<NOMOR_LAPORAN>>");

  addParagraph_(body, "DASAR:", { bold: true, spacingBefore: 10 });
  addParagraph_(body, "Surat Tugas Nomor <<NOMOR_ST>> tanggal <<TANGGAL_ST>>", { italic: true, spacingAfter: 12 });

  addParagraph_(body, "A. PELAKSANA", { bold: true, spacingBefore: 10 });

  const table = body.appendTable();
  const header = table.appendTableRow();
  ["No", "Nama", "NIP", "Jabatan"].forEach(function (h) {
    const cell = header.appendTableCell(h);
    cell.setBackgroundColor("#064e3b");
    cell.editAsText().setForegroundColor("#ffffff").setBold(true).setFontSize(10);
  });

  for (let i = 1; i <= 3; i++) {
    const row = table.appendTableRow();
    row.appendTableCell(String(i));
    row.appendTableCell("<<NAMA_" + i + ">>");
    row.appendTableCell("<<NIP_" + i + ">>");
    row.appendTableCell(i === 1 ? "Ketua Tim" : "Anggota");
    row.getCell(1).editAsText().setForegroundColor("#c00000");
    row.getCell(2).editAsText().setForegroundColor("#c00000");
  }

  body.appendParagraph("").setSpacingAfter(8);

  const sections = [
    ["B. WAKTU PELAKSANAAN", "<<TANGGAL_PELAKSANAAN>> pukul <<JAM_MULAI>> — <<JAM_SELESAI>> WIB"],
    ["C. TEMPAT / LOKASI", "<<NAMA_LOKASI>>, <<DESA>>, <<KECAMATAN>>"],
    ["D. URAIAN PELAKSANAAN", "<<URAIAN_PELAKSANAAN>>"],
    ["E. HASIL YANG DICAPAI", "<<HASIL_TEMUAN>>\n\nJumlah pelanggar/temuan: <<JUMLAH_PELANGGAR>>"],
    ["F. TINDAKAN YANG DIAMBIL", "<<TINDAKAN_DIAMBIL>>"],
    ["G. PERMASALAHAN / KENDALA", "<<KENDALA>>"],
    ["H. KESIMPULAN", "<<KESIMPULAN>>"],
    ["I. SARAN / REKOMENDASI", "<<REKOMENDASI>>"],
  ];

  sections.forEach(function (sec) {
    const title = sec[0], content = sec[1];
    addParagraph_(body, title, { bold: true, spacingBefore: 10 });
    content.split("\n").forEach(function (line) {
      if (line.trim()) addParagraph_(body, line, { spacingAfter: 2, fontSize: 11 });
    });
  });

  addParagraph_(body, "J. LAMPIRAN / DOKUMENTASI", { bold: true, spacingBefore: 10 });
  addParagraph_(body, "1. <<LAMPIRAN_1>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "2. <<LAMPIRAN_2>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "3. <<LAMPIRAN_3>>", { fontSize: 11, spacingAfter: 12 });

  body.appendParagraph("").setSpacingAfter(20);

  const datePara = body.appendParagraph("Trenggalek, <<TANGGAL_LAPORAN>>");
  datePara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  datePara.editAsText().setFontSize(11);
  datePara.setSpacingAfter(20);

  const sigTable = body.appendTable();
  const sigRow1 = sigTable.appendTableRow();
  const sigRow2 = sigTable.appendTableRow();
  const sigRow3 = sigTable.appendTableRow();
  const sigRow4 = sigTable.appendTableRow();

  sigRow1.appendTableCell("Pelapor,").setWidth(240);
  sigRow1.appendTableCell("Mengetahui,").setWidth(240);
  sigRow1.getCell(0).editAsText().setFontSize(11);
  sigRow1.getCell(1).editAsText().setFontSize(11);

  sigRow2.appendTableCell("").setWidth(240);
  sigRow2.appendTableCell("").setWidth(240);
  sigRow2.setMinimumHeight(60);

  sigRow3.appendTableCell("<<NAMA_PELAPOR>>").setWidth(240);
  sigRow3.appendTableCell("<<NAMA_KOORDINATOR>>").setWidth(240);
  sigRow3.getCell(0).editAsText().setBold(true).setFontSize(11);
  sigRow3.getCell(1).editAsText().setBold(true).setFontSize(11);

  sigRow4.appendTableCell("NIP. <<NIP_PELAPOR>>").setWidth(240);
  sigRow4.appendTableCell("NIP. <<NIP_KOORDINATOR>>").setWidth(240);
  sigRow4.getCell(0).editAsText().setFontSize(11);
  sigRow4.getCell(1).editAsText().setFontSize(11);

  sigTable.setBorderWidth(0);

  const footer = body.appendParagraph("Dokumen ini dicetak dari SI TRANTIBUM — Template v" + SCRIPT_VERSION);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setItalic(true).setFontSize(8).setForegroundColor("#999999");

  doc.saveAndClose();

  const docId = doc.getId();
  const result = exportDocToDocx_(docId, docName, folder);
  Logger.log("  📄 Google Doc source: " + doc.getUrl());
  Logger.log("  📄 File .docx: " + result.getUrl());
  return result;
}

/* ===========================================================================
 * TEMPLATE TAMBAHAN: BA, SP, PANGGILAN, KOP PDF, README
 * =========================================================================== */

/** Hapus file lama dengan nama sama supaya re-run tidak duplikat. */
function clearExistingFiles_(folder, name) {
  const it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true);
}

/* ---------------------------------------------------------------------------
 * BERITA ACARA (BA) — untuk penertiban / pemeriksaan
 * ------------------------------------------------------------------------- */
function generateTemplateBA_(folder) {
  const docName = "template-berita-acara";
  clearExistingFiles_(folder, docName + ".docx");

  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);

  addKopHeader_(body);
  addCenteredTitle_(body, "BERITA ACARA", "Nomor: <<NOMOR_BA>> /BA-TRANTIBUM/<<TAHUN>>");

  addParagraph_(body,
    "Pada hari ini, <<HARI>>, tanggal <<TANGGAL>> bulan <<BULAN>> tahun <<TAHUN>>, " +
    "bertempat di <<TEMPAT>>, Kecamatan <<KECAMATAN>>, Kabupaten Trenggalek, " +
    "yang bertanda tangan di bawah ini:",
    { spacingBefore: 10, spacingAfter: 10 });

  // Petugas
  addParagraph_(body, "Petugas yang Melaksanakan:", { bold: true, spacingBefore: 6, spacingAfter: 4 });
  const pT = body.appendTable();
  const pH = pT.appendTableRow();
  ["No", "Nama", "NIP", "Jabatan"].forEach(function (h) {
    const c = pH.appendTableCell(h);
    c.setBackgroundColor("#064e3b");
    c.editAsText().setForegroundColor("#ffffff").setBold(true).setFontSize(10);
  });
  for (let i = 1; i <= 2; i++) {
    const r = pT.appendTableRow();
    r.appendTableCell(String(i));
    r.appendTableCell("<<NAMA_PETUGAS_" + i + ">>").editAsText().setForegroundColor("#c00000");
    r.appendTableCell("<<NIP_" + i + ">>").editAsText().setForegroundColor("#c00000");
    r.appendTableCell(i === 1 ? "Ketua Tim" : "Anggota");
  }
  body.appendParagraph("").setSpacingAfter(8);

  // Dasar
  addParagraph_(body, "Dasar:", { bold: true, spacingBefore: 6, spacingAfter: 2 });
  addParagraph_(body, "Surat Tugas Nomor <<NOMOR_ST>> tanggal <<TANGGAL_ST>>",
    { italic: true, spacingAfter: 10 });

  // Pihak diperiksa
  addParagraph_(body, "Telah melaksanakan pemeriksaan/penertiban terhadap:",
    { bold: true, spacingBefore: 6, spacingAfter: 4 });
  addField_(body, "Nama", "NAMA_DIPERIKSA");
  addField_(body, "NIK", "NIK_DIPERIKSA");
  addField_(body, "Alamat", "ALAMAT_DIPERIKSA");
  addField_(body, "Pekerjaan", "PEKERJAAN_DIPERIKSA");

  // Uraian
  addParagraph_(body, "Uraian Kejadian:", { bold: true, spacingBefore: 8, spacingAfter: 4 });
  addParagraph_(body, "<<URAIAN_KEJADIAN>>", { italic: true, spacingAfter: 10 });

  // Dasar hukum
  addParagraph_(body, "Dasar Hukum yang Dilanggar:",
    { bold: true, spacingBefore: 6, spacingAfter: 4 });
  addField_(body, "Perda", "PERDA_NOMOR");
  addField_(body, "Pasal", "PASAL");
  addField_(body, "Tentang", "TENTANG");

  // Tindakan (checkbox)
  addParagraph_(body, "Tindakan yang Diambil:",
    { bold: true, spacingBefore: 8, spacingAfter: 4 });
  [
    "\u2610  Teguran lisan",
    "\u2610  Teguran tertulis",
    "\u2610  Surat pernyataan",
    "\u2610  Penyitaan barang bukti (daftar terlampir)",
    "\u2610  Pembongkaran",
    "\u2610  Penyegelan sementara",
    "\u2610  Diserahkan ke PPNS / instansi lain",
  ].forEach(function (line) {
    addParagraph_(body, line, { fontSize: 11, spacingAfter: 2 });
  });

  // Barang bukti
  addParagraph_(body, "Barang Bukti yang Disita (jika ada):",
    { bold: true, spacingBefore: 8, spacingAfter: 4 });
  const bT = body.appendTable();
  const bH = bT.appendTableRow();
  ["No", "Jenis Barang", "Jumlah", "Keterangan"].forEach(function (h) {
    const c = bH.appendTableCell(h);
    c.setBackgroundColor("#064e3b");
    c.editAsText().setForegroundColor("#ffffff").setBold(true).setFontSize(10);
  });
  for (let i = 1; i <= 3; i++) {
    const r = bT.appendTableRow();
    r.appendTableCell(String(i));
    r.appendTableCell("");
    r.appendTableCell("");
    r.appendTableCell("");
  }
  body.appendParagraph("").setSpacingAfter(8);

  // Penutup
  addParagraph_(body,
    "Berita Acara ini dibuat dengan sebenarnya, dalam keadaan sadar, tanpa paksaan " +
    "dari pihak manapun, dan untuk dipergunakan sebagaimana mestinya.",
    { spacingBefore: 8, spacingAfter: 14 });

  // Tanggal
  const dateP = body.appendParagraph("Trenggalek, <<TANGGAL_BA>>");
  dateP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  dateP.editAsText().setFontSize(11);
  dateP.setSpacingAfter(16);

  // Tanda tangan 3 kolom
  const sT = body.appendTable();
  const s1 = sT.appendTableRow();
  s1.appendTableCell("Yang Diperiksa,").setWidth(160);
  s1.appendTableCell("Petugas 1,").setWidth(160);
  s1.appendTableCell("Petugas 2,").setWidth(160);
  for (let i = 0; i < 3; i++) s1.getCell(i).editAsText().setFontSize(11);

  // Row kosong untuk TTD: setWidth di cell, setMinimumHeight di row (bukan cell)
  const s2 = sT.appendTableRow();
  s2.appendTableCell("").setWidth(160);
  s2.appendTableCell("").setWidth(160);
  s2.appendTableCell("").setWidth(160);
  s2.setMinimumHeight(60);

  const s3 = sT.appendTableRow();
  s3.appendTableCell("(<<NAMA_DIPERIKSA>>)").setWidth(160);
  s3.appendTableCell("(<<NAMA_PETUGAS_1>>)").setWidth(160);
  s3.appendTableCell("(<<NAMA_PETUGAS_2>>)").setWidth(160);
  for (let i = 0; i < 3; i++) s3.getCell(i).editAsText().setBold(true).setFontSize(11);

  const s4 = sT.appendTableRow();
  s4.appendTableCell("NIK. <<NIK_DIPERIKSA>>").setWidth(160);
  s4.appendTableCell("NIP. <<NIP_1>>").setWidth(160);
  s4.appendTableCell("NIP. <<NIP_2>>").setWidth(160);
  for (let i = 0; i < 3; i++) s4.getCell(i).editAsText().setFontSize(10);

  sT.setBorderWidth(0);
  body.appendParagraph("").setSpacingAfter(10);

  // Saksi
  addParagraph_(body, "Saksi: <<NAMA_SAKSI>> (NIK. <<NIK_SAKSI>>)",
    { fontSize: 11, spacingBefore: 6, spacingAfter: 12 });

  const footer = body.appendParagraph("Dokumen ini dibuat dari template SI TRANTIBUM — v" + SCRIPT_VERSION);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setItalic(true).setFontSize(8).setForegroundColor("#999999");

  doc.saveAndClose();
  const result = exportDocToDocx_(doc.getId(), docName, folder);
  Logger.log("  📄 Google Doc source: " + doc.getUrl());
  Logger.log("  📄 File .docx: " + result.getUrl());
  return result;
}

/* ---------------------------------------------------------------------------
 * SURAT PERNYATAAN (SP) — untuk pelanggar, tanpa kop (personal doc)
 * ------------------------------------------------------------------------- */
function generateTemplateSP_(folder) {
  const docName = "template-surat-pernyataan";
  clearExistingFiles_(folder, docName + ".docx");

  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(60).setMarginBottom(60).setMarginLeft(80).setMarginRight(80);

  addCenteredTitle_(body, "SURAT PERNYATAAN", "");

  addParagraph_(body, "Yang bertanda tangan di bawah ini:",
    { spacingBefore: 14, spacingAfter: 8 });

  addField_(body, "Nama", "NAMA_PEMBUAT");
  addField_(body, "NIK", "NIK_PEMBUAT");
  addField_(body, "Tempat / Tgl Lahir", "TTL_PEMBUAT");
  addField_(body, "Alamat", "ALAMAT_PEMBUAT");
  addField_(body, "Pekerjaan", "PEKERJAAN_PEMBUAT");

  addParagraph_(body, "Dengan ini menyatakan dengan sesungguhnya bahwa:",
    { spacingBefore: 10, spacingAfter: 6 });

  addParagraph_(body,
    "1.  Saya telah melakukan pelanggaran terhadap Peraturan Daerah Kabupaten Trenggalek " +
    "Nomor <<PERDA_NOMOR>> Pasal <<PASAL>> tentang <<TENTANG>>.",
    { spacingAfter: 6 });

  addParagraph_(body, "2.  Pelanggaran tersebut terjadi pada:", { spacingAfter: 2 });
  addParagraph_(body, "      Hari/Tanggal  :  <<HARI>>, <<TANGGAL>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Pukul              :  <<JAM>> WIB", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Tempat           :  <<TEMPAT>>", { fontSize: 11, spacingAfter: 6 });

  addParagraph_(body, "3.  Saya bersedia dan berjanji untuk:", { spacingAfter: 2 });
  [
    "\u2610  Tidak mengulangi perbuatan tersebut di kemudian hari",
    "\u2610  Mematuhi seluruh ketentuan Peraturan Daerah yang berlaku",
    "\u2610  Membongkar / membersihkan sendiri sarana yang melanggar",
    "\u2610  Membayar denda administratif sebesar Rp _______________",
    "\u2610  Lain-lain: _______________________________________",
  ].forEach(function (line) {
    addParagraph_(body, "      " + line, { fontSize: 11, spacingAfter: 2 });
  });

  addParagraph_(body,
    "4.  Apabila saya melanggar pernyataan ini, saya bersedia dikenakan sanksi " +
    "sesuai ketentuan yang berlaku, termasuk namun tidak terbatas pada tindakan " +
    "penertiban, penyitaan, dan/atau proses hukum.",
    { spacingBefore: 8, spacingAfter: 10 });

  addParagraph_(body,
    "Demikian Surat Pernyataan ini saya buat dengan sadar, tanpa paksaan dari pihak " +
    "manapun, dan untuk dipergunakan sebagaimana mestinya.",
    { spacingAfter: 12 });

  // Tanggal + tanda tangan kanan
  const dateP = body.appendParagraph("Trenggalek, <<TANGGAL>>");
  dateP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  dateP.editAsText().setFontSize(11);
  dateP.setSpacingAfter(6);

  const roleP = body.appendParagraph("Yang Membuat Pernyataan,");
  roleP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  roleP.editAsText().setFontSize(11);
  roleP.setSpacingAfter(70);

  const materaiP = body.appendParagraph("\u200B");
  materaiP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  materaiP.editAsText().setFontSize(10);

  const nameP = body.appendParagraph("(<<NAMA_PEMBUAT>>)");
  nameP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nameP.editAsText().setBold(true).setFontSize(11);
  nameP.setSpacingAfter(2);

  const nikP = body.appendParagraph("NIK. <<NIK_PEMBUAT>>");
  nikP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nikP.editAsText().setFontSize(11);
  nikP.setSpacingAfter(24);

  // Mengetahui
  addParagraph_(body, "Mengetahui / Menyaksikan:", { bold: true, spacingBefore: 10, spacingAfter: 4 });
  addParagraph_(body, "Petugas Satpol PP Kab. Trenggalek", { fontSize: 11, spacingAfter: 8 });

  const tT = body.appendTable();
  const tr1 = tT.appendTableRow();
  tr1.appendTableCell("1.  __________________________").setWidth(300);
  tr1.appendTableCell("NIP. __________________").setWidth(200);
  tr1.getCell(0).editAsText().setFontSize(11).setForegroundColor("#c00000");
  tr1.getCell(1).editAsText().setFontSize(11).setForegroundColor("#c00000");

  const tr2 = tT.appendTableRow();
  tr2.appendTableCell("2.  __________________________").setWidth(300);
  tr2.appendTableCell("NIP. __________________").setWidth(200);
  tr2.getCell(0).editAsText().setFontSize(11).setForegroundColor("#c00000");
  tr2.getCell(1).editAsText().setFontSize(11).setForegroundColor("#c00000");

  tT.setBorderWidth(0);

  const footer = body.appendParagraph("Dokumen ini dibuat dari template SI TRANTIBUM — v" + SCRIPT_VERSION);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setItalic(true).setFontSize(8).setForegroundColor("#999999");

  doc.saveAndClose();
  const result = exportDocToDocx_(doc.getId(), docName, folder);
  Logger.log("  📄 Google Doc source: " + doc.getUrl());
  Logger.log("  📄 File .docx: " + result.getUrl());
  return result;
}

/* ---------------------------------------------------------------------------
 * SURAT PANGGILAN — untuk pemanggilan klarifikasi
 * ------------------------------------------------------------------------- */
function generateTemplatePanggilan_(folder) {
  const docName = "template-surat-panggilan";
  clearExistingFiles_(folder, docName + ".docx");

  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  body.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);

  addKopHeader_(body);
  addCenteredTitle_(body, "SURAT PANGGILAN", "Nomor: <<NOMOR_PANGGILAN>> /Panggilan/TRANTIBUM/<<TAHUN>>");

  // Kepada
  addParagraph_(body, "Kepada Yth.", { bold: true, spacingBefore: 10, spacingAfter: 2 });
  addParagraph_(body, "Nama       :  <<NAMA_DIPANGGIL>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "NIK          :  <<NIK_DIPANGGIL>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "Alamat     :  <<ALAMAT_DIPANGGIL>>", { fontSize: 11, spacingAfter: 12 });

  addParagraph_(body, "Dengan hormat,", { spacingBefore: 6, spacingAfter: 8 });

  addParagraph_(body,
    "Sehubungan dengan adanya dugaan pelanggaran Peraturan Daerah Kabupaten Trenggalek " +
    "Nomor <<PERDA_NOMOR>> Pasal <<PASAL>> tentang <<TENTANG>>, yang terjadi pada:",
    { spacingAfter: 4 });

  addParagraph_(body, "      Hari/Tanggal  :  <<HARI>>, <<TANGGAL>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Pukul              :  <<JAM>> WIB", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Tempat           :  <<TEMPAT>>", { fontSize: 11, spacingAfter: 8 });

  addParagraph_(body,
    "Berdasarkan hal tersebut, dengan ini kami memanggil Saudara/i untuk hadir pada:",
    { spacingAfter: 4 });

  addParagraph_(body, "      Hari/Tanggal  :  <<HARI_PANGGILAN>>, <<TANGGAL_PANGGILAN>>", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Pukul              :  <<JAM_PANGGILAN>> WIB", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Tempat           :  Kantor Satpol PP dan Damkar Kab. Trenggalek", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "                                Jl. Brigjend Sutran No. 1 Trenggalek", { fontSize: 11, spacingAfter: 2 });
  addParagraph_(body, "      Keperluan      :  Klarifikasi / Pembinaan / Pemeriksaan", { fontSize: 11, spacingAfter: 10 });

  addParagraph_(body, "Yang perlu dibawa:", { bold: true, spacingBefore: 6, spacingAfter: 4 });
  [
    "1.  Surat Panggilan ini (asli)",
    "2.  KTP / Identitas lain yang sah (asli dan fotokopi)",
    "3.  Bukti-bukti / dokumen yang berkaitan dengan dugaan pelanggaran",
    "4.  Surat kuasa (jika diwakilkan)",
  ].forEach(function (line) {
    addParagraph_(body, line, { fontSize: 11, spacingAfter: 2 });
  });

  addParagraph_(body,
    "Demikian Surat Panggilan ini kami sampaikan. Atas perhatian dan kehadirannya, " +
    "kami ucapkan terima kasih.",
    { spacingBefore: 12, spacingAfter: 18 });

  // TTD
  const dateP = body.appendParagraph("Trenggalek, <<TANGGAL_SURAT>>");
  dateP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  dateP.editAsText().setFontSize(11);
  dateP.setSpacingAfter(4);

  const roleP = body.appendParagraph("Kepala Satpol PP dan Kebakaran");
  roleP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  roleP.editAsText().setFontSize(11);
  roleP.setSpacingAfter(2);

  const roleP2 = body.appendParagraph("Kabupaten Trenggalek");
  roleP2.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  roleP2.editAsText().setFontSize(11);
  roleP2.setSpacingAfter(60);

  const nameP = body.appendParagraph("<<NAMA_PENANDATANGAN>>");
  nameP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nameP.editAsText().setBold(true).setUnderline(true).setFontSize(11);
  nameP.setSpacingAfter(2);

  const nipP = body.appendParagraph("NIP. <<NIP_PENANDATANGAN>>");
  nipP.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  nipP.editAsText().setFontSize(11);
  nipP.setSpacingAfter(20);

  // Catatan
  addParagraph_(body, "Catatan:", { bold: true, italic: true, spacingBefore: 8, spacingAfter: 4 });
  addParagraph_(body,
    "\u2022  Apabila Saudara/i tidak dapat hadir pada tanggal tersebut, harap memberitahukan " +
    "secara tertulis atau melalui telepon ke nomor (0355) __________________ sebelum tanggal panggilan.",
    { fontSize: 10, italic: true, spacingAfter: 2 });
  addParagraph_(body,
    "\u2022  Apabila tanpa alasan yang sah tidak hadir, dapat dikenakan sanksi sesuai peraturan yang berlaku.",
    { fontSize: 10, italic: true, spacingAfter: 8 });

  const footer = body.appendParagraph("Dokumen ini dibuat dari template SI TRANTIBUM — v" + SCRIPT_VERSION);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setItalic(true).setFontSize(8).setForegroundColor("#999999");

  doc.saveAndClose();
  const result = exportDocToDocx_(doc.getId(), docName, folder);
  Logger.log("  📄 Google Doc source: " + doc.getUrl());
  Logger.log("  📄 File .docx: " + result.getUrl());
  return result;
}

/* ---------------------------------------------------------------------------
 * KOP SURAT PDF — generate dari HTML ke PDF
 * ------------------------------------------------------------------------- */
function generateKopPDF_(folder) {
  clearExistingFiles_(folder, "kop-surat.pdf");
  clearExistingFiles_(folder, "kop-standalone.html");

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' +
    '@page { size: A4; margin: 16mm; }' +
    'body { font-family: Georgia, "Times New Roman", serif; margin: 0; padding: 0; }' +
    '.kop { text-align: center; border-bottom: 4px double #000; padding-bottom: 12px; }' +
    '.kop p { margin: 3px 0; }' +
    '.kop .pemkab { font-size: 14px; letter-spacing: 1.5px; }' +
    '.kop .satpol { font-size: 18px; font-weight: bold; }' +
    '.kop .alamat { font-size: 10px; margin-top: 4px; }' +
    '</style></head><body>' +
    '<div class="kop">' +
    '<p class="pemkab">PEMERINTAH KABUPATEN TRENGGALEK</p>' +
    '<p class="satpol">SATUAN POLISI PAMONG PRAJA DAN PEMADAM KEBAKARAN</p>' +
    '<p class="alamat">Jl. Brigjend Sutran No. 1 Trenggalek &middot; Telp. (0355) 791111 &middot; satpolpp@trenggalekkab.go.id</p>' +
    '</div>' +
    '</body></html>';

  // Simpan HTML source
  folder.createFile(Utilities.newBlob(html, "text/html", "kop-standalone.html"));

  // Simpan PDF
  const pdfBlob = Utilities.newBlob(html, "text/html", "kop-surat.html")
    .getAs("application/pdf")
    .setName("kop-surat.pdf");
  const pdfFile = folder.createFile(pdfBlob);

  Logger.log("  🖼️ Kop PDF: " + pdfFile.getUrl());
  Logger.log("  🌐 Kop HTML source: (tersimpan di folder)");
  return pdfFile;
}

/* ---------------------------------------------------------------------------
 * README FILES — 2 file (root + sop-panduan)
 * ------------------------------------------------------------------------- */
function generateReadmeFiles_(rootFolder, sopFolder) {
  clearExistingFiles_(rootFolder, "README.md");
  clearExistingFiles_(sopFolder, "README-daftar-sop.md");

  const readmeMain = [
    "# 06-Template — Aset Template & Panduan",
    "",
    "Folder ini berisi template dokumen resmi, kop surat, dan placeholder panduan",
    "untuk SI TRANTIBUM Satpol PPK Kab. Trenggalek.",
    "",
    "## Struktur",
    "",
    "```",
    "06-Template/",
    "├── dokumen-resmi/       ← Template Word editable (.docx)",
    "├── kop-logo/            ← Kop surat & logo (PDF, HTML)",
    "├── sop-panduan/         ← Placeholder SOP & panduan (diisi nanti)",
    "└── README.md            ← file ini",
    "```",
    "",
    "## Kapan Pakai Template di Sini?",
    "",
    "Template `.docx` untuk dokumen yang **butuh tanda tangan basah** atau",
    "**edit manual**. Untuk dokumen yang bisa dicetak langsung dari aplikasi",
    "(mis. Surat Tugas), gunakan tombol **Cetak** di SI TRANTIBUM.",
    "",
    "## Template yang Tersedia",
    "",
    "| File | Kegunaan |",
    "|---|---|",
    "| `dokumen-resmi/template-surat-tugas.docx` | ST manual (non-aplikasi) |",
    "| `dokumen-resmi/template-laporan-kegiatan.docx` | LP manual |",
    "| `dokumen-resmi/template-berita-acara.docx` | BA penertiban / pemeriksaan |",
    "| `dokumen-resmi/template-surat-pernyataan.docx` | SP pelanggar |",
    "| `dokumen-resmi/template-surat-panggilan.docx` | Panggilan sidang / klarifikasi |",
    "| `kop-logo/kop-surat.pdf` | Kop A4 untuk cetak manual |",
    "| `kop-logo/kop-standalone.html` | Source HTML kop (bisa dibuka di Chrome) |",
    "",
    "## Cara Regenerate Template",
    "",
    "Jika ada perubahan kop atau placeholder:",
    "",
    "1. Buka Apps Script editor",
    "2. Jalankan fungsi `setupTemplateDocuments()`",
    "3. Semua template `.docx` akan diperbarui di folder ini (otomatis hapus yang lama)",
    "",
    "## Placeholder Format",
    "",
    "Placeholder dalam template ditandai `<<NAMA_PLACEHOLDER>>` (warna merah",
    "di .docx). Ganti dengan data aktual saat dipakai.",
    "",
    "## Backup & Arsip",
    "",
    "Setelah dokumen ditandatangani, simpan salinan PDF ke:",
    "- `04-Surat-Tugas-PDF/YYYY/` untuk ST",
    "- `05-Laporan-PDF/YYYY/` untuk LP",
    "",
    "---",
    "",
    "*Dokumen ini di-generate otomatis dari `setupTemplateDocuments()` — v" + SCRIPT_VERSION + "*",
  ].join("\n");

  const readmeSop = [
    "# Daftar SOP & Panduan (Placeholder)",
    "",
    "Folder ini disiapkan untuk SOP resmi & panduan internal yang belum dibuat.",
    "",
    "## SOP Operasional",
    "",
    "- [ ] SOP Penerbitan Surat Tugas",
    "- [ ] SOP Pelaksanaan Patroli",
    "- [ ] SOP Penertiban & Penyitaan Barang Bukti",
    "- [ ] SOP Pembuatan Berita Acara",
    "- [ ] SOP Pemeriksaan Pelanggar",
    "- [ ] SOP Pengelolaan Tindak Lanjut",
    "",
    "## Panduan Pengguna Aplikasi",
    "",
    "- [ ] Panduan Koordinator",
    "- [ ] Panduan Pimpinan",
    "- [ ] Panduan Petugas",
    "- [ ] Panduan Admin",
    "- [ ] Panduan Setup Awal & Deploy",
    "",
    "## Panduan Teknis",
    "",
    "- [ ] Panduan Backup Database",
    "- [ ] Panduan Rotasi Drive Storage",
    "- [ ] Panduan Recovery (Restore dari Backup JSON)",
    "- [ ] Panduan Troubleshooting",
    "",
    "## Template SOP (isi saat ada)",
    "",
    "Buat Google Doc / Word di folder ini dengan nama:",
    "`SOP-[nama-singkat]-v[versi].pdf`",
    "",
    "Contoh: `SOP-Penerbitan-ST-v1.pdf`",
    "",
    "---",
    "",
    "*Dokumen ini di-generate otomatis dari `setupTemplateDocuments()` — v" + SCRIPT_VERSION + "*",
  ].join("\n");

  rootFolder.createFile("README.md", readmeMain, MimeType.PLAIN_TEXT);
  sopFolder.createFile("README-daftar-sop.md", readmeSop, MimeType.PLAIN_TEXT);

  Logger.log("  📖 README.md: root folder");
  Logger.log("  📖 README-daftar-sop.md: sop-panduan folder");
  return rootFolder;
}

/* ===========================================================================
 * UTILITAS DEVELOPMENT (FUNGSI BANTU)
 * =========================================================================== */

/**
 * Paksa isi ulang data users (khusus development).
 * Jalankan fungsi ini dari editor Apps Script jika data users kosong / tidak lengkap.
 */
function forceSeedUsers() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("SEEDED_users"); // Hapus flag agar mau re-seed

  const sh = getSheet_("users");
  const lastRow = sh.getLastRow();
  
  // Hapus semua baris data (biarkan header)
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, sh.getMaxColumns()).clearContent();
  }
  invalidateTable_("users");

  const now = nowIso_();
  const users = [
    { id: "u-admin", name: "Administrator Sistem", nip: "19850101 201001 1 001", pangkatGol: "Penata / IIIc", jenisJabatan: "Fungsional", jabatan: "Pranata Komputer", unit: "Sekretariat — Pusat Data", email: "admin@trenggalekkab.go.id", noHp: "081234567890", role: "ADMIN", canSign: false },
    { id: "u-budi", name: "Budi Santoso, S.Sos", nip: "19900512 201502 1 003", pangkatGol: "Penata Muda / IIIa", jenisJabatan: "Struktural", jabatan: "Kasi Ops", unit: "Seksi Operasional dan Pengendalian", email: "budi.koordinator@trenggalekkab.go.id", noHp: "081234567891", role: "KOORDINATOR", canSign: false },
    { id: "u-siti", name: "Siti Rahmawati, S.H.", nip: "19880320 201204 2 002", pangkatGol: "Penata / IIIc", jenisJabatan: "Struktural", jabatan: "Kasi Trantibum", unit: "Seksi Ketertiban Umum dan Ketentraman", email: "koordinator@trenggalekkab.go.id", noHp: "081234567892", role: "KOORDINATOR", canSign: false },
    { id: "u-joko", name: "Joko Prasetyo", nip: "19950715 201903 1 005", pangkatGol: "Pengatur / IIc", jenisJabatan: "Pelaksana", jabatan: "Petugas Lapangan", unit: "Regu Lapangan — Elang", email: "petugas@trenggalekkab.go.id", noHp: "081234567893", role: "PETUGAS", canSign: false },
    { id: "u-pimpinan", name: "Drs. HABIB SOLEHUDDIN, M.PSDM", nip: "197003202005011004", pangkatGol: "Pembina Utama Muda / IVc", jenisJabatan: "Struktural", jabatan: "Kepala Satuan", unit: "Kepala Satuan", email: "pimpinan@trenggalekkab.go.id", noHp: "081234567894", role: "PIMPINAN", canSign: true },
    { id: "u-agus", name: "Agus Santoso, S.Sos", nip: "19750415 199803 1 004", pangkatGol: "Penata Tk.I / IIId", jenisJabatan: "Struktural", jabatan: "Sekretaris", unit: "Sekretariat", email: "sekretaris@trenggalekkab.go.id", noHp: "081234567895", role: "KOORDINATOR", canSign: true },
    { id: "u-rina", name: "Rina Widyastuti", nip: "19920314 201705 2 007", pangkatGol: "Penata Muda / IIIa", jenisJabatan: "Pelaksana", jabatan: "Petugas Lapangan", unit: "Regu Lapangan — Macan", email: "petugas2@trenggalekkab.go.id", noHp: "081234567896", role: "PETUGAS", canSign: false },
  ];

  users.forEach(function(u) {
    u.createdAt = now;
    u.updatedAt = now;
    appendObject_("users", u);
  });

  props.setProperty("SEEDED_users", "1");
  Logger.log("✓ Berhasil memuat ulang 7 data Users lengkap.");
}
