(function(){
'use strict';

// Prevent double inject
if (document.getElementById('emaster-af-panel')) return;

var CONFIG = {
  DELAY_BEFORE_FILL: 1500,
  DELAY_BEFORE_SAVE: 800,
  DELAY_AFTER_SAVE: 1000,
  DELAY_POPUP: 1500
};

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// =========================================================================
// STATE (chrome.storage.local — persists across page refreshes)
// =========================================================================
function getState(cb) {
  chrome.storage.local.get('emaster_autofill_state', function(r) {
    cb(r.emaster_autofill_state || null);
  });
}
function setState(s, cb) {
  chrome.storage.local.set({ emaster_autofill_state: s }, cb);
}
function clearState(cb) {
  chrome.storage.local.remove('emaster_autofill_state', cb);
}
function getData(cb) {
  chrome.storage.local.get('emaster_activities', function(r) {
    cb(r.emaster_activities || null);
  });
}

// =========================================================================
// FIELD DETECTION
// =========================================================================
function findFieldByLabel(labelText) {
  var normalized = labelText.toLowerCase().trim();
  var els = document.querySelectorAll('b,strong');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.textContent.toLowerCase().trim().indexOf(normalized) >= 0) {
      var next = el.nextElementSibling;
      while (next) {
        if (next.matches && next.matches('input,select,textarea')) return next;
        var child = next.querySelector('input,select,textarea');
        if (child) return child;
        next = next.nextElementSibling;
      }
      var parent = el.parentElement;
      if (parent) {
        var inputs = parent.querySelectorAll('input,select,textarea');
        if (inputs.length > 0) return inputs[inputs.length - 1];
      }
    }
  }
  var labels = document.querySelectorAll('label');
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].textContent.toLowerCase().indexOf(normalized) >= 0) {
      var forId = labels[i].getAttribute('for');
      if (forId) { var t = document.getElementById(forId); if (t) return t; }
      var inner = labels[i].querySelector('input,select,textarea');
      if (inner) return inner;
    }
  }
  var cells = document.querySelectorAll('td,th,div,span');
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (c.textContent.toLowerCase().indexOf(normalized) >= 0 && c.textContent.length < normalized.length + 40) {
      var p = c.parentElement;
      if (p) { var inps = p.querySelectorAll('input,select,textarea'); if (inps.length > 0) return inps[0]; }
    }
  }
  return null;
}

function setFieldValue(el, val) {
  if (!el || val == null) return false;
  var v = String(val);
  if (el.tagName.toLowerCase() === 'select') {
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].value === v || el.options[i].textContent.trim().toLowerCase() === v.toLowerCase()) {
        el.value = el.options[i].value; triggerEvents(el); return true;
      }
    }
    return false;
  }
  var setter = Object.getOwnPropertyDescriptor(
    el.tagName.toLowerCase() === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
  );
  if (setter && setter.set) setter.set.call(el, v); else el.value = v;
  triggerEvents(el); return true;
}

function triggerEvents(el) {
  ['focus','input','change','blur','keyup'].forEach(function(e) {
    el.dispatchEvent(new Event(e, { bubbles: true }));
  });
}

function findDotButton() {
  var btns = document.querySelectorAll("input[type='button'],button");
  for (var i = 0; i < btns.length; i++) {
    var t = (btns[i].textContent || '').trim() || (btns[i].value || '').trim();
    if (t === '...' || t === '\u2026') return btns[i];
  }
  return null;
}

function findSaveButton() {
  var els = document.querySelectorAll("input[type='submit'],button,a");
  for (var i = 0; i < els.length; i++) {
    var t = (els[i].textContent || '').trim().toLowerCase() || (els[i].value || '').trim().toLowerCase();
    if (t === 'save' || t === 'simpan') return els[i];
  }
  return null;
}

function findTambahButton() {
  var els = document.querySelectorAll("a,button,input[type='button'],input[type='submit']");
  for (var i = 0; i < els.length; i++) {
    var t = (els[i].textContent || '').toLowerCase().trim() || (els[i].value || '').toLowerCase().trim();
    if (t === 'tambah' || t.indexOf('tambah') >= 0) return els[i];
  }
  return null;
}

function detectPageType() {
  var url = window.location.href;
  var params = new URLSearchParams(window.location.search);
  var text = document.body ? document.body.textContent : '';
  if (text.indexOf('Tambah Aktivitas') >= 0 && findSaveButton()) return 'tambah';
  if (params.get('act') === 'realisasi' || url.indexOf('realisasi') >= 0) return 'realisasi';
  if (params.get('module') === 'aktifitas_bulan' && !params.get('act')) return 'aktivitas_bulan';
  return 'unknown';
}

// =========================================================================
// LOG
// =========================================================================
var logEl;
function addLog(msg, type) {
  if (!logEl) return;
  var d = document.createElement('div');
  d.className = 'log-' + (type || 'info');
  d.textContent = '[' + new Date().toLocaleTimeString('id-ID') + '] ' + msg;
  logEl.insertBefore(d, logEl.firstChild);
  while (logEl.children.length > 100) logEl.removeChild(logEl.lastChild);
}

function updateProgress(cur, total, text) {
  var pt = document.getElementById('af-progress-text');
  var pf = document.getElementById('af-progress-fill');
  if (pt) pt.textContent = text + ' (' + cur + '/' + total + ')';
  if (pf) pf.style.width = (cur / total * 100) + '%';
}

function updateStatus(active, text) {
  var el = document.getElementById('af-auto-status');
  if (!el) return;
  el.style.background = active ? '#C8E6C9' : '#E0E0E0';
  el.style.color = active ? '#2E7D32' : '#616161';
  el.textContent = text;
}

// =========================================================================
// POPUP KAMUS
// =========================================================================
async function handleKamusPopup(keyword) {
  addLog('Mencari popup Kamus...', 'info');
  await sleep(CONFIG.DELAY_POPUP);
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    try {
      var iDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
      if (iDoc && iDoc.body && iDoc.body.textContent.indexOf('Kamus Aktifitas') >= 0) {
        return await searchKamus(iDoc, keyword);
      }
    } catch(e) {}
  }
  if (document.body && document.body.textContent.indexOf('Kamus Aktifitas') >= 0) {
    return await searchKamus(document, keyword);
  }
  addLog('Popup Kamus mungkin terbuka di window baru - cari "' + keyword + '" manual', 'warn');
  return false;
}

async function searchKamus(doc, keyword) {
  var si = doc.querySelector("input[type='text']");
  if (si) {
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (setter && setter.set) setter.set.call(si, keyword); else si.value = keyword;
    si.dispatchEvent(new Event('input', { bubbles: true }));
    si.dispatchEvent(new Event('change', { bubbles: true }));
    addLog('Ketik "' + keyword + '" di Kamus', 'ok');
  }
  await sleep(500);
  var btns = doc.querySelectorAll("input[type='button'],input[type='submit'],button");
  for (var i = 0; i < btns.length; i++) {
    var t = (btns[i].textContent || '').trim().toLowerCase() || (btns[i].value || '').trim().toLowerCase();
    if (t === 'cari' || t === 'search') { btns[i].click(); addLog('Klik Cari', 'ok'); break; }
  }
  await sleep(CONFIG.DELAY_POPUP);
  var cells = doc.querySelectorAll('td');
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].textContent.trim().toLowerCase().indexOf(keyword.toLowerCase()) >= 0) {
      var link = cells[i].querySelector('a');
      if (link) { link.click(); } else { cells[i].click(); }
      addLog('Klik hasil: "' + cells[i].textContent.trim().substring(0, 50) + '"', 'ok');
      return true;
    }
  }
  addLog('Hasil pencarian Kamus tidak ditemukan!', 'warn');
  return false;
}

// =========================================================================
// FILL FORM
// =========================================================================
function fillFieldByLabel(labels, value) {
  if (!value && value !== 0) return false;
  for (var i = 0; i < labels.length; i++) {
    var el = findFieldByLabel(labels[i]);
    if (el && !el.readOnly && !el.disabled) {
      setFieldValue(el, value);
      addLog('  ' + labels[i] + ': "' + String(value).substring(0, 60) + '"', 'ok');
      return true;
    }
  }
  return false;
}

async function fillFormFields(entry) {
  var filled = 0;
  if (fillFieldByLabel(['tanggal aktivitas','tanggal'], entry.tanggal)) filled++;
  var kw = entry.kamus_keyword || entry.detail_aktivitas || '';
  addLog('Detail Aktivitas: "' + kw + '"', 'info');
  var dotBtn = findDotButton();
  if (dotBtn) {
    dotBtn.click(); addLog("Klik '...' buka Kamus", 'ok');
    var ok = await handleKamusPopup(kw);
    if (ok) { filled++; await sleep(CONFIG.DELAY_POPUP); }
    else { addLog('Kamus gagal, coba isi langsung', 'warn'); if (fillFieldByLabel(['detail aktivitas','detail'], kw)) filled++; }
  } else {
    addLog("Tombol '...' tidak ditemukan", 'warn');
    if (fillFieldByLabel(['detail aktivitas','detail'], kw)) filled++;
  }
  if (fillFieldByLabel(['volume'], entry.volume)) filled++;
  if (fillFieldByLabel(['objek kerja / topik','objek kerja','topik'], entry.objek_kerja)) filled++;
  addLog(filled + ' field terisi', filled > 0 ? 'ok' : 'warn');
  return filled;
}

// =========================================================================
// AUTO-FILL ENGINE
// =========================================================================
async function handleTambahPage() {
  getState(function(state) {
    if (!state || !state.running) return;
    getData(function(data) {
      if (!data) { addLog('Data tidak ditemukan!', 'err'); clearState(); return; }
      var bd = data.breakdowns[state.breakdownIdx]; if (!bd) { clearState(); return; }
      var entry = bd.entries[state.entryIdx]; if (!entry) { clearState(); return; }
      updateStatus(true, 'Auto-fill: BD ' + (state.breakdownIdx + 1) + ', Entry ' + (state.entryIdx + 1) + '/' + bd.entries.length);
      updateProgress(state.entryIdx + 1, bd.entries.length, bd.kegiatan_tugas_jabatan.substring(0, 30));
      addLog('=== Entry ' + (state.entryIdx + 1) + '/' + bd.entries.length + ' ===', 'info');
      (async function() {
        await sleep(CONFIG.DELAY_BEFORE_FILL);
        var filled = await fillFormFields(entry);
        if (filled > 0) {
          var next = state.entryIdx + 1;
          if (next < bd.entries.length) {
            setState({ running: true, breakdownIdx: state.breakdownIdx, entryIdx: next });
          } else {
            addLog('Breakdown "' + bd.kegiatan_tugas_jabatan + '" selesai!', 'ok');
            clearState();
          }
          await sleep(CONFIG.DELAY_BEFORE_SAVE);
          var saveBtn = findSaveButton();
          if (saveBtn) { addLog('Klik Save...', 'info'); saveBtn.click(); }
          else { addLog('Tombol Save tidak ditemukan!', 'err'); }
        } else { addLog('Gagal mengisi form.', 'err'); clearState(); }
      })();
    });
  });
}

async function handleRealisasiPage() {
  getState(function(state) {
    if (!state || !state.running) return;
    getData(function(data) {
      if (!data) return;
      var bd = data.breakdowns[state.breakdownIdx]; if (!bd) { clearState(); return; }
      if (state.entryIdx >= bd.entries.length) {
        addLog('Breakdown selesai!', 'ok'); updateStatus(false, 'Selesai!'); clearState(); return;
      }
      updateStatus(true, 'Lanjut entry ' + (state.entryIdx + 1) + '/' + bd.entries.length + '...');
      (async function() {
        await sleep(CONFIG.DELAY_AFTER_SAVE);
        var btn = findTambahButton();
        if (btn) { btn.click(); } else { addLog('Tombol Tambah tidak ditemukan!', 'err'); clearState(); }
      })();
    });
  });
}

// =========================================================================
// PANEL UI
// =========================================================================
var css = document.createElement('style');
css.textContent =
  '#emaster-af-panel{position:fixed;top:10px;right:10px;z-index:99999;background:#fff;border:2px solid #1565C0;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.18);font:13px/1.45 Arial,sans-serif;width:400px;max-height:92vh;overflow-y:auto}' +
  '.af-header{background:#1565C0;color:#fff;padding:10px 14px;font-weight:bold;font-size:14px;display:flex;justify-content:space-between;align-items:center;cursor:move;border-radius:6px 6px 0 0}' +
  '.af-header button{background:none;border:none;color:#fff;font-size:18px;cursor:pointer}' +
  '.af-body{padding:12px 14px}' +
  '.af-group{margin-bottom:6px}.af-group label{display:block;font-weight:bold;margin-bottom:2px;color:#333;font-size:11px}' +
  '.af-group input,.af-group select{width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;box-sizing:border-box}' +
  '.af-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}' +
  '.af-btn{padding:7px 14px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;flex:1;min-width:80px;text-align:center;color:#fff}' +
  '.af-btn-run{background:#4CAF50}.af-btn-run:hover{background:#388E3C}' +
  '.af-btn-stop{background:#f44336}.af-btn-stop:hover{background:#d32f2f}' +
  '.af-btn-scan{background:#FF9800}.af-btn-scan:hover{background:#F57C00}' +
  '#emaster-af-log{margin-top:8px;padding:8px;background:#f5f5f5;border-radius:4px;max-height:200px;overflow-y:auto;font-size:11px;font-family:monospace;color:#555}' +
  '.log-ok{color:#2E7D32}.log-warn{color:#EF6C00}.log-err{color:#C62828}.log-info{color:#1565C0}' +
  '.af-bd-item{padding:6px 8px;margin:3px 0;background:#f0f4ff;border-radius:4px;font-size:11px;display:flex;justify-content:space-between}' +
  '.af-progress{margin-top:8px;padding:6px;background:#E3F2FD;border-radius:4px;font-size:12px;color:#1565C0}' +
  '.af-progress-bar{height:6px;background:#BBDEFB;border-radius:3px;margin-top:4px;overflow:hidden}' +
  '.af-progress-fill{height:100%;background:#1565C0;border-radius:3px;transition:width .3s}' +
  '.af-auto-status{margin-top:8px;padding:8px;border-radius:4px;font-size:12px;font-weight:bold;background:#E0E0E0;color:#616161}' +
  '.af-section-title{font-weight:bold;color:#1565C0;margin:10px 0 5px;font-size:13px;border-bottom:1px solid #e0e0e0;padding-bottom:3px}';
document.head.appendChild(css);

var panel = document.createElement('div');
panel.id = 'emaster-af-panel';
panel.innerHTML =
  '<div class="af-header"><span>e-MASTER Auto Fill v3.0</span><button id="af-close-btn" title="Tutup">&times;</button></div>' +
  '<div class="af-body">' +
    '<div class="af-section-title">Data</div>' +
    '<div id="af-bd-list" style="margin:6px 0"><div style="color:#999;font-size:11px">Memuat data...</div></div>' +
    '<div class="af-group"><label>Breakdown yang akan diisi:</label><select id="af-bd-select"><option value="">-- Pilih --</option></select></div>' +
    '<div class="af-group"><label>Mulai dari entry ke-:</label><input type="number" id="af-start-entry" value="1" min="1" /><span style="font-size:10px;color:#999">(default: 1)</span></div>' +
    '<div class="af-section-title">Aksi</div>' +
    '<p style="font-size:11px;color:#666;margin:4px 0"><b>Cara:</b> Buka halaman realisasi (klik icon kunci pas) &rarr; Pilih breakdown &rarr; Klik Mulai Auto Fill</p>' +
    '<div class="af-actions"><button class="af-btn af-btn-run" id="af-btn-run">Mulai Auto Fill</button><button class="af-btn af-btn-stop" id="af-btn-stop">Stop</button></div>' +
    '<div class="af-actions"><button class="af-btn af-btn-scan" id="af-btn-scan">Scan Halaman</button></div>' +
    '<div id="af-auto-status" class="af-auto-status">Tidak aktif</div>' +
    '<div class="af-progress"><span id="af-progress-text">Belum dimulai</span><div class="af-progress-bar"><div id="af-progress-fill" class="af-progress-fill" style="width:0%"></div></div></div>' +
    '<div id="emaster-af-log"></div>' +
  '</div>';
document.body.appendChild(panel);
logEl = document.getElementById('emaster-af-log');

// =========================================================================
// DISPLAY DATA
// =========================================================================
function displayData(data) {
  if (!data || !data.breakdowns) return;
  var list = document.getElementById('af-bd-list');
  var sel = document.getElementById('af-bd-select');
  if (list) {
    list.innerHTML = '';
    data.breakdowns.forEach(function(bd, idx) {
      var d = document.createElement('div'); d.className = 'af-bd-item';
      d.innerHTML = '<span>' + (idx + 1) + '. ' + bd.kegiatan_tugas_jabatan + '</span><span style="font-weight:bold;color:#1565C0;margin-left:8px">' + bd.jumlah_entries + '</span>';
      list.appendChild(d);
    });
  }
  if (sel) {
    sel.innerHTML = '<option value="">-- Pilih --</option>';
    data.breakdowns.forEach(function(bd, idx) {
      var o = document.createElement('option'); o.value = idx;
      o.textContent = (idx + 1) + '. ' + bd.kegiatan_tugas_jabatan + ' (' + bd.jumlah_entries + ' entry)';
      sel.appendChild(o);
    });
  }
  addLog('Data: ' + data.total_breakdowns + ' breakdown, ' + data.total_entries + ' entry', 'ok');
}

// Load data from chrome.storage
getData(function(theData) {
  if (theData) displayData(theData);
  else addLog('Belum ada data. Import via popup extension.', 'warn');
});

// =========================================================================
// EVENT LISTENERS
// =========================================================================

// Start
document.getElementById('af-btn-run').addEventListener('click', function() {
  var bdIdx = parseInt(document.getElementById('af-bd-select').value);
  if (isNaN(bdIdx)) { addLog('Pilih breakdown dulu!', 'err'); return; }
  getData(function(data) {
    if (!data) { addLog('Tidak ada data!', 'err'); return; }
    var bd = data.breakdowns[bdIdx]; if (!bd) { addLog('Breakdown tidak valid!', 'err'); return; }
    var startEntry = parseInt(document.getElementById('af-start-entry').value || '1') - 1;
    var entryIdx = Math.max(0, Math.min(startEntry, bd.entries.length - 1));
    addLog('Mulai: "' + bd.kegiatan_tugas_jabatan + '" entry ' + (entryIdx + 1) + ' s/d ' + bd.entries.length, 'info');
    setState({ running: true, breakdownIdx: bdIdx, entryIdx: entryIdx }, function() {
      var pt = detectPageType();
      if (pt === 'realisasi') { handleRealisasiPage(); }
      else if (pt === 'tambah') { handleTambahPage(); }
      else { addLog('Buka halaman realisasi dulu!', 'warn'); clearState(); }
    });
  });
});

document.getElementById('af-btn-stop').addEventListener('click', function() {
  clearState(function() {
    updateStatus(false, 'Dihentikan');
    addLog('Auto-fill dihentikan', 'warn');
  });
});

document.getElementById('af-btn-scan').addEventListener('click', function() {
  var pt = detectPageType();
  addLog('=== Scan ===', 'info');
  addLog('URL: ' + window.location.href, 'info');
  addLog('Halaman: ' + pt, 'info');
  var inputs = document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea');
  addLog('Input fields: ' + inputs.length, 'info');
});

document.getElementById('af-close-btn').addEventListener('click', function() {
  panel.style.display = 'none';
});

// Draggable header
var isDrag = false, ox, oy;
var hdr = panel.querySelector('.af-header');
hdr.addEventListener('mousedown', function(e) {
  isDrag = true;
  ox = e.clientX - panel.getBoundingClientRect().left;
  oy = e.clientY - panel.getBoundingClientRect().top;
});
document.addEventListener('mousemove', function(e) {
  if (!isDrag) return;
  panel.style.left = (e.clientX - ox) + 'px';
  panel.style.top = (e.clientY - oy) + 'px';
  panel.style.right = 'auto';
});
document.addEventListener('mouseup', function() { isDrag = false; });

// =========================================================================
// AUTO-RESUME on page load
// =========================================================================
var pt = detectPageType();
getState(function(state) {
  if (state && state.running) {
    addLog('Auto-fill aktif. Halaman: ' + pt, 'info');
    if (pt === 'tambah') handleTambahPage();
    else if (pt === 'realisasi') handleRealisasiPage();
  }
  addLog('Halaman: ' + pt, 'info');
  addLog('Panel siap.', 'info');
});

})();
