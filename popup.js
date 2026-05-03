(function(){
'use strict';

// =========================================================================
// DEFAULT KAMUS MAPPING
// =========================================================================
const DEFAULT_KAMUS = {
  'Melaksanakan asuhan keperawatan sesuai SOP': {
    keywords: ['Manajemen Asuhan Keperawatan'],
    mode: 'single'
  },
  'Menginput dokumentasi tindakan keperawatan': {
    keywords: ['Memasukkan Hasil Pengkajian'],
    mode: 'single'
  },
  'Melaksanakan tindakan keperawatan tepat waktu': {
    keywords: ['Pasang Infus','Sampling Darah Vena Instalasi','Terapi Injeksi Parenteral'],
    mode: 'multi'
  },
  'Melaksanakan prosedur keperawatan sesuai SOP': {
    keywords: ['Terapi Injeksi Line','Pasang Infus','Mengukur Tanda Tanda','Sampling Darah Vena Instalasi'],
    mode: 'multi'
  },
  'Menyiapkan alat medis pelayanan': {
    keywords: ['Memeriksa Kelengkapan Alat'],
    mode: 'single'
  }
};

const SKIP_KEGIATAN = new Set(['briefing', 'timbang terima']);

// =========================================================================
// STORAGE (chrome.storage.local with localStorage fallback)
// =========================================================================
const useChromeStorage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

function loadKamus(cb) {
  if (useChromeStorage) {
    chrome.storage.local.get('emaster_kamus_mapping', function(r) {
      cb(r.emaster_kamus_mapping || JSON.parse(JSON.stringify(DEFAULT_KAMUS)));
    });
  } else {
    try {
      const s = localStorage.getItem('emaster_kamus_mapping');
      cb(s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_KAMUS)));
    } catch(e) { cb(JSON.parse(JSON.stringify(DEFAULT_KAMUS))); }
  }
}
function saveKamus(k, cb) {
  if (useChromeStorage) {
    chrome.storage.local.set({ emaster_kamus_mapping: k }, cb);
  } else {
    try { localStorage.setItem('emaster_kamus_mapping', JSON.stringify(k)); } catch(e) {}
    if (cb) cb();
  }
}
function loadActivities(cb) {
  if (useChromeStorage) {
    chrome.storage.local.get('emaster_activities', function(r) {
      cb(r.emaster_activities || null);
    });
  } else {
    try {
      const s = localStorage.getItem('emaster_activities');
      cb(s ? JSON.parse(s) : null);
    } catch(e) { cb(null); }
  }
}
function saveActivities(d, cb) {
  if (useChromeStorage) {
    chrome.storage.local.set({ emaster_activities: d }, cb);
  } else {
    try { localStorage.setItem('emaster_activities', JSON.stringify(d)); } catch(e) {}
    if (cb) cb();
  }
}

// =========================================================================
// DOM
// =========================================================================
const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// =========================================================================
// EXCEL → JSON CONVERSION
// =========================================================================
let kamusMapping = {};

function parseIntSafe(val) {
  if (val == null || val === '') return '';
  var n = parseInt(val, 10);
  return isNaN(n) ? '' : String(n);
}

function convertExcelToJSON(rawRows) {
  let headerIdx = -1;
  let colMap = {};

  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
    const row = rawRows[i].map(c => String(c||'').toLowerCase().trim());
    if (row.some(c => c === 'no')) {
      const hasKegiatan = row.some(c => c.includes('kegiatan') || c.includes('aktivitas'));
      if (hasKegiatan) {
        headerIdx = i;
        for (let j = 0; j < row.length; j++) {
          const h = row[j];
          if (h === 'no' || h === 'no.') colMap.no = j;
          else if (h === 'hari') colMap.hari = j;
          else if (h.includes('tanggal') || h.includes('tgl')) colMap.tanggal = j;
          else if (h.includes('kegiatan') || h.includes('detail') || h.includes('aktivitas')) colMap.kegiatan = j;
          else if (h.includes('obyek') || h.includes('objek') || h.includes('uraian')) colMap.objek_kerja = j;
          else if (h.includes('volume') || h === 'vol') colMap.volume = j;
          else if (h.includes('beban')) colMap.beban_kerja = j;
          else if (h.includes('durasi') || h.includes('wpt') || (h.includes('menit') && !h.includes('beban'))) colMap.durasi = j;
        }
        break;
      }
    }
  }

  if (headerIdx === -1) return null;

  const info = { nama: '', nip: '', unit_kerja: '' };
  for (let i = 0; i < headerIdx; i++) {
    const cellA = String(rawRows[i][0]||'').trim().toLowerCase();
    const cellB = String(rawRows[i][1]||'').trim().replace(/^:\s*/, '');
    if (cellA === 'nama' && cellB) info.nama = cellB;
    else if (cellA === 'nip' && cellB) info.nip = cellB;
    else if (cellA.includes('unit kerja') && cellB) info.unit_kerja = cellB;
  }

  let dataStart = headerIdx + 1;
  for (let i = dataStart; i < dataStart + 3 && i < rawRows.length; i++) {
    const cell = rawRows[i][colMap.no !== undefined ? colMap.no : 0];
    if (cell == null || (typeof cell === 'string' && !cell.trim().match(/^\d+$/))) {
      dataStart = i + 1;
    } else break;
  }

  const grouped = {};
  let curHari = '', curTgl = '';

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i];
    const noVal = colMap.no !== undefined ? row[colMap.no] : null;
    if (noVal == null) continue;
    const noStr = String(noVal).trim().toLowerCase();
    if (noStr === '' || noStr === 'total' || noStr === 'nb') continue;
    if (!/^\d+$/.test(noStr)) continue;

    if (colMap.hari !== undefined && row[colMap.hari]) curHari = String(row[colMap.hari]).trim();
    if (colMap.tanggal !== undefined && row[colMap.tanggal]) {
      curTgl = formatDate(row[colMap.tanggal]);
    }

    const kegiatan = colMap.kegiatan !== undefined ? String(row[colMap.kegiatan]||'').trim() : '';
    if (!kegiatan) continue;
    if (SKIP_KEGIATAN.has(kegiatan.toLowerCase().trim())) continue;

    const objek = colMap.objek_kerja !== undefined ? String(row[colMap.objek_kerja]||'').trim() : '';
    const vol = colMap.volume !== undefined ? parseIntSafe(row[colMap.volume]) : '';
    const durasi = colMap.durasi !== undefined ? parseIntSafe(row[colMap.durasi]) : '';
    const beban = colMap.beban_kerja !== undefined ? parseIntSafe(row[colMap.beban_kerja]) : '';

    const entry = {
      hari: curHari,
      tanggal: curTgl,
      detail_aktivitas: kegiatan,
      objek_kerja: objek,
      satuan: 'Pasien',
      wpt_menit: durasi,
      volume: vol,
      beban_kerja: beban
    };

    if (!grouped[kegiatan]) grouped[kegiatan] = [];
    grouped[kegiatan].push(entry);
  }

  let bulan = '';
  const allEntries = Object.values(grouped).flat();
  if (allEntries.length > 0) {
    const first = allEntries[0].tanggal;
    const parts = first.replace(/\//g,'-').split('-');
    if (parts.length === 3) bulan = parts[1];
  }

  // Build breakdowns with kamus expansion
  const breakdowns = [];
  let totalExpanded = 0;
  for (const [kegName, entries] of Object.entries(grouped)) {
    const kamus = kamusMapping[kegName] || { keywords: [kegName], mode: 'single' };
    let expanded;
    if (kamus.mode === 'multi' && kamus.keywords.length > 1) {
      // multi: each entry from one date gets expanded into N entries (one per keyword)
      expanded = [];
      for (const entry of entries) {
        for (const kw of kamus.keywords) {
          expanded.push({ ...entry, kamus_keyword: kw });
        }
      }
    } else {
      expanded = entries.map(e => ({ ...e, kamus_keyword: kamus.keywords[0] }));
    }
    totalExpanded += expanded.length;
    breakdowns.push({
      kegiatan_tugas_jabatan: kegName,
      jumlah_entries: expanded.length,
      kamus_config: kamus,
      entries: expanded
    });
  }

  return {
    info,
    bulan,
    generated_at: new Date().toISOString(),
    total_entries: totalExpanded,
    total_breakdowns: breakdowns.length,
    breakdowns
  };
}

function excelSerialToDate(serial) {
  var epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000);
}

function formatDate(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number' && val > 1 && val < 200000) {
    val = excelSerialToDate(val);
  }
  if (val instanceof Date) {
    var dd = String(val.getUTCDate()).padStart(2,'0');
    var mm = String(val.getUTCMonth()+1).padStart(2,'0');
    var yyyy = val.getUTCFullYear();
    if (yyyy < 1900 || yyyy > 2100) return '';
    return dd + '-' + mm + '-' + yyyy;
  }
  var s = String(val).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s.replace(/\//g,'-');
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3]+'-'+iso[2]+'-'+iso[1];
  return s;
}

// =========================================================================
// KAMUS MAPPING TEXT ↔ OBJECT
// =========================================================================
function renderKamusText(mapping) {
  const lines = [];
  for (const [keg, cfg] of Object.entries(mapping)) {
    lines.push(keg + ' [' + (cfg.mode || 'single') + ']');
    for (const kw of cfg.keywords) {
      lines.push('  - ' + kw);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function parseKamusText(text) {
  const result = {};
  let current = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (current) {
        result[current.name].keywords.push(trimmed.replace(/^[-*]\s*/, ''));
      }
    } else {
      const m = trimmed.match(/^(.+?)\s*\[(single|multi)\]\s*$/);
      if (m) {
        current = { name: m[1].trim() };
        result[current.name] = { keywords: [], mode: m[2] };
      } else {
        current = { name: trimmed };
        result[current.name] = { keywords: [], mode: 'single' };
      }
    }
  }
  for (const [k, v] of Object.entries(result)) {
    if (v.keywords.length === 0) v.keywords = [k];
  }
  return result;
}

// =========================================================================
// UI RENDER
// =========================================================================
let activitiesData = null;

function renderBreakdowns() {
  const summary = $('#data-summary');
  const bdList = $('#bd-list');
  const bdSelect = $('#bd-select');

  if (!activitiesData || !activitiesData.breakdowns) {
    summary.textContent = 'Belum ada data. Import Excel atau JSON dulu.';
    bdList.innerHTML = '';
    bdSelect.innerHTML = '<option value="">-- Belum ada data --</option>';
    return;
  }

  const d = activitiesData;
  summary.innerHTML = '<strong>' + esc(d.info.nama || 'Data') + '</strong> | NIP: ' + esc(d.info.nip || '-') +
    ' | Bulan: ' + esc(d.bulan || '-') +
    ' | <strong>' + d.total_breakdowns + ' breakdown, ' + d.total_entries + ' entry</strong>';

  bdList.innerHTML = d.breakdowns.map(function(bd, i) {
    return '<div class="bd-item"><span class="name">' + (i+1) + '. ' + esc(bd.kegiatan_tugas_jabatan) + '</span><span class="count">' + bd.jumlah_entries + ' entry</span></div>';
  }).join('');

  bdSelect.innerHTML = '<option value="">-- Pilih Breakdown --</option>' +
    d.breakdowns.map(function(bd, i) {
      return '<option value="' + i + '">' + (i+1) + '. ' + esc(bd.kegiatan_tugas_jabatan) + ' (' + bd.jumlah_entries + ')</option>';
    }).join('');
}

function renderEntryPreview() {
  const bdIdx = parseInt($('#bd-select').value);
  const box = $('#entry-preview');
  if (isNaN(bdIdx) || !activitiesData || !activitiesData.breakdowns[bdIdx]) {
    box.innerHTML = '<p style="font-size:11px;color:#888">Pilih breakdown untuk melihat preview.</p>';
    return;
  }
  const entries = activitiesData.breakdowns[bdIdx].entries;
  const show = entries.slice(0, 20);
  let html = '<table class="preview-table"><tr><th>#</th><th>Tanggal</th><th>Kamus</th><th>Vol</th><th>Objek</th></tr>';
  show.forEach(function(e, i) {
    html += '<tr><td>' + (i+1) + '</td><td>' + esc(e.tanggal) + '</td><td>' + esc((e.kamus_keyword||'').substring(0,30)) + '</td><td>' + esc(e.volume) + '</td><td>' + esc((e.objek_kerja||'').substring(0,40)) + '</td></tr>';
  });
  if (entries.length > 20) html += '<tr><td colspan="5" style="text-align:center;color:#888">... dan ' + (entries.length - 20) + ' entry lainnya</td></tr>';
  html += '</table>';
  box.innerHTML = html;
}

function showDataInfo() {
  const el = $('#data-info');
  if (!activitiesData) { el.className = 'msg'; return; }
  el.className = 'msg i';
  el.textContent = 'Data tersimpan: ' + activitiesData.total_breakdowns + ' breakdown, ' + activitiesData.total_entries + ' entry';
}

// =========================================================================
// EVENTS
// =========================================================================
function bindEvents() {
  // Tabs
  $$('.tab').forEach(function(t) {
    t.addEventListener('click', function() {
      $$('.tab').forEach(function(x) { x.classList.remove('on'); });
      $$('.pane').forEach(function(x) { x.classList.remove('on'); });
      t.classList.add('on');
      $('#p-' + t.dataset.t).classList.add('on');
    });
  });

  // Excel import
  $('#excel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $('#excel-status');
    statusEl.className = 'msg i'; statusEl.textContent = 'Membaca file...';

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const result = convertExcelToJSON(rawRows);
        if (!result) {
          statusEl.className = 'msg e';
          statusEl.textContent = 'Error: Header tabel (No, Kegiatan, ...) tidak ditemukan!';
          return;
        }

        activitiesData = result;
        saveActivities(result, function() {
          renderBreakdowns();
          showDataInfo();
          statusEl.className = 'msg s';
          statusEl.textContent = 'Berhasil! ' + result.total_breakdowns + ' breakdown, ' + result.total_entries + ' entry.\nNama: ' + (result.info.nama || '-') + '\nNIP: ' + (result.info.nip || '-');
        });
      } catch (err) {
        statusEl.className = 'msg e';
        statusEl.textContent = 'Error: ' + err.message;
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // JSON import
  $('#json-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const statusEl = $('#json-status');
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        activitiesData = data;
        saveActivities(data, function() {
          renderBreakdowns();
          showDataInfo();
          statusEl.className = 'msg s';
          statusEl.textContent = 'Berhasil! ' + (data.total_breakdowns||0) + ' breakdown, ' + (data.total_entries||0) + ' entry.';
        });
      } catch (err) {
        statusEl.className = 'msg e';
        statusEl.textContent = 'Error parsing JSON: ' + err.message;
      }
    };
    reader.readAsText(file);
  });

  // Kamus save
  $('#save-kamus').addEventListener('click', function() {
    const text = $('#kamus-mapping').value;
    kamusMapping = parseKamusText(text);
    saveKamus(kamusMapping, function() {
      const statusEl = $('#kamus-status');
      statusEl.className = 'msg s';
      statusEl.textContent = 'Mapping disimpan! (' + Object.keys(kamusMapping).length + ' kegiatan)\nJika ingin apply mapping baru, import ulang file Excel.';
    });
  });

  // Preview select
  $('#bd-select').addEventListener('change', renderEntryPreview);
}

// =========================================================================
// INIT
// =========================================================================
function init() {
  bindEvents();

  // Load kamus & activities from chrome.storage
  loadKamus(function(k) {
    kamusMapping = k;
    $('#kamus-mapping').value = renderKamusText(kamusMapping);

    loadActivities(function(d) {
      activitiesData = d;
      renderBreakdowns();
      showDataInfo();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
