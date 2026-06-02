/* ═══════════════════════════════════════════════════
   TRPG Crossing Terminal - App Shell
   ═══════════════════════════════════════════════════ */

var currentPage = 'main';
var characters = {};
var currentCharName = null;
var dmMode = false;
var saveTimer = null;

document.addEventListener('DOMContentLoaded', function(){
  initNavigation();
  initCharSelector();
  initSaveShortcut();
  loadAllData();
  initUpdater();
});

function initNavigation(){
  document.querySelectorAll('[data-page]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var page = btn.dataset.page;
      if (page === currentPage) return;
      navigateTo(page);
    });
  });
}

function navigateTo(page){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var target = document.getElementById(page + 'Page');
  if (target) target.classList.add('active');

  document.querySelectorAll('[data-page]').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  var toolbar = document.getElementById('mainToolbar');
  if (toolbar) toolbar.style.display = (page === 'main') ? 'none' : 'flex';

  if (page === 'creation') {
    document.querySelectorAll('[data-page]').forEach(function(btn){ btn.classList.remove('active'); });
  }

  currentPage = page;

  if (page === 'character') { try { if(typeof initCharacterPage==='function') initCharacterPage(); } catch(e){} }
  if (page === 'shop') { try { if(typeof initShopPage==='function') initShopPage(); } catch(e){} }
  if (page === 'dm') { try { if(typeof renderDmOverview==='function') renderDmOverview(); } catch(e){} }
  if (page === 'jianxia') { try { if(typeof loadJianxiaData==='function') loadJianxiaData(); } catch(e){} }
}

async function loadAllData(){
  // 1) 优先从 localStorage 加载已有存档
  try {
    var data = await loadJSON("data/characters.json");
    if (data && data.characters && Object.keys(data.characters).length > 0) {
      characters = data.characters;
      return;
    }
  } catch(e) { /* 无存档，继续 */ }

  // 2) 扫描 bundle 中的独立角色文件
  var bundle = window._CROSSING_DATA || {};
  var charKeys = Object.keys(bundle).filter(function(k) {
    return k.indexOf('data/characters/') === 0 && k.endsWith('.json');
  });

  if (charKeys.length > 0) {
    // 提取角色信息用于弹窗
    var availableChars = [];
    charKeys.forEach(function(key) {
      try {
        var fileData = bundle[key];
        if (fileData && fileData.characters) {
          var names = Object.keys(fileData.characters);
          names.forEach(function(nm) {
            var c = fileData.characters[nm];
            availableChars.push({
              name: nm,
              filePath: key,
              level: (c.derived && c.derived.level) || 1,
              mainClass: (c.identity && c.identity.mainClass) || '',
              race: (c.identity && c.identity.race) || '人类',
            });
          });
        }
      } catch(e) {}
    });
    if (availableChars.length > 0) {
      showCharacterSelectDialog(availableChars);
      return;
    }
  }

  // 3) 无任何角色数据 → 创建引导
  if (typeof showCreateGuide === 'function') showCreateGuide();
}

async function saveAllData(){
  try {
    await saveJSON("characters.json", { version:'1.0', lastModified: new Date().toISOString(), characters: characters });
    var serverSaved = false;
    if (typeof isServerMode === 'function' && isServerMode()) {
      var names = Object.keys(characters);
      for (var i = 0; i < names.length; i++) {
        if (typeof saveCharacterFile === 'function') {
          try { await saveCharacterFile(names[i], characters[names[i]]); serverSaved = true; } catch(e) {}
        }
      }
    }
    showSaveFeedback(serverSaved);
  } catch(e) { console.warn('save fail:',e); }
}

function showSaveFeedback(serverSaved){
  var el = document.getElementById('saveFeedback'); if (!el) return;
  el.textContent = serverSaved ? '✓ 已保存到磁盘' : '✓ 已保存（仅本地缓存）';
  el.classList.add('show');
  clearTimeout(saveTimer); saveTimer = setTimeout(function(){ el.classList.remove('show'); }, 2000);
}

function autoSave(){
  clearTimeout(window._autoSaveTimer);
  window._autoSaveTimer = setTimeout(function(){
    // 将模块变量同步到角色对象（增强、专长、物品、技能槽、货币、铭牌等）
    if (currentCharName && characters[currentCharName] && typeof _inChange !== 'undefined' && !_inChange) {
      var c = characters[currentCharName];
      if (typeof _talents !== 'undefined') c.talents = _talents.slice();
      if (typeof _enhances !== 'undefined') c.enhances = _enhances.slice();
      if (typeof _inventory !== 'undefined') c.inventory = _inventory.map(function(i){ return {name:i.name, qty:i.qty, weight:i.weight}; });
      if (typeof _activeSlots !== 'undefined') c.activeSlots = _activeSlots.map(function(s){ return Object.assign({}, s); });
      if (typeof _passiveSlots !== 'undefined') c.passiveSlots = _passiveSlots.map(function(s){ return Object.assign({}, s); });
      if (typeof _currencies !== 'undefined') {
        if (!c.wealth) c.wealth = {};
        c.wealth.currencies = _currencies.map(function(cu){ return {name:cu.name, amount:cu.amount}; });
      }
      if (!c.property) c.property = {};
      if (typeof _mainXp !== 'undefined') c.property.mainXp = _mainXp;
      if (typeof _mainAp !== 'undefined') c.property.mainAp = _mainAp;
      if (typeof _badges !== 'undefined') c.property.badges = Object.assign({}, _badges);
    }
    saveAllData();
  }, 500);
}

function exportData(){
  var out = {};
  Object.keys(characters).forEach(function(key) {
    var c = characters[key];
    var exportKey = (c.identity && c.identity.charName) || key;
    out[exportKey] = c;
  });
  var data = JSON.stringify({ characters: out }, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'characters.json'; a.click();
}

function importData(){
  var input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
  input.onchange = function(e){
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var data = JSON.parse(ev.target.result);
        if (!data || !data.characters || Object.keys(data.characters).length === 0) return;

        var imported = data.characters;
        var importedNames = Object.keys(imported);
        var existingNames = Object.keys(characters);
        var dupes = importedNames.filter(function(n) { return existingNames.indexOf(n) >= 0; });

        var overwrite = true;
        if (dupes.length > 0) {
          overwrite = confirm(
            '以下 ' + dupes.length + ' 个角色已存在:\n' +
            dupes.join('、') +
            '\n\n点"确定"覆盖已有角色，点"取消"保留已有角色并仅添加新角色。'
          );
        }

        var added = 0, updated = 0, skipped = 0;
        importedNames.forEach(function(name) {
          if (existingNames.indexOf(name) >= 0) {
            if (overwrite) { characters[name] = imported[name]; updated++; }
            else { skipped++; }
          } else {
            characters[name] = imported[name]; added++;
          }
        });

        saveAllData();
        _pageInited = false;
        currentCharName = null;
        if (typeof navigateTo === 'function') navigateTo('character');

        var msg = '✅ 导入完成: 新增 ' + added + ' 人';
        if (updated > 0) msg += ', 更新 ' + updated + ' 人';
        if (skipped > 0) msg += ', 跳过 ' + skipped + ' 人';
        showToast(msg);
      } catch(ex) {}
    };
    reader.readAsText(file);
  };
  input.click();
}

// 快速保存当前角色为 JSON 文件
function saveCurrentChar(){
  if (!currentCharName || !characters[currentCharName]) { showToast('⚠️ 请先选择角色'); return; }
  var c = characters[currentCharName];
  var exportName = (c.identity && c.identity.charName) || currentCharName;
  var out = {}; out[exportName] = c;
  var data = JSON.stringify({ characters: out }, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = exportName + '.json';
  a.click();
  showToast('💾 已保存 ' + exportName);
}

// 删除当前角色
function deleteCurrentChar(){
  if (!currentCharName || !characters[currentCharName]) { showToast('⚠️ 请先选择角色'); return; }
  if (!confirm('确定要删除角色 "' + currentCharName + '" 吗？\n\n此操作不可撤销！')) return;
  var oldName = currentCharName;
  delete characters[currentCharName];
  // 删除对应的独立角色文件
  if (typeof deleteCharacterFile === 'function') deleteCharacterFile(oldName);
  var names = Object.keys(characters);
  if (names.length > 0) {
    currentCharName = names[0];
    _pageInited = false;
    if (typeof navigateTo === 'function') navigateTo('character');
  } else {
    currentCharName = null;
    _pageInited = false;
    if (typeof navigateTo === 'function') navigateTo('creation');
  }
  saveAllData();
  showToast('🗑 已删除');
}

// 角色切换（从下拉框）
function onCharSelectorChange(){
  var sel = document.getElementById('charSelector');
  if (!sel || !sel.value) return;
  currentCharName = sel.value;
  if (characters[currentCharName] && typeof loadCharacterIntoUI === 'function') {
    loadCharacterIntoUI(currentCharName, characters[currentCharName]);
  }
}

function initSaveShortcut(){
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAllData(); }
  });
}

function initCharSelector(){
  var sel = document.getElementById('charSelector'); if (!sel) return;
  sel.addEventListener('change', function(){
    var name = sel.value;
    if (name && characters[name]) { currentCharName = name; if (typeof loadCharacterIntoUI === 'function') loadCharacterIntoUI(name, characters[name]); }
  });
}

function refreshCharSelector(){
  var sel = document.getElementById('charSelector'); if (!sel) return;
  var current = sel.value; sel.innerHTML = '';
  var names = Object.keys(characters).sort();
  names.forEach(function(n){ var opt = document.createElement('option'); opt.value = n; opt.textContent = n; sel.appendChild(opt); });
  if (names.length > 0) { sel.value = names.includes(current) ? current : names[0]; }
}

function toggleDM(){
  dmMode = !dmMode;
  var btn = document.getElementById('dmToggle'); if (btn) btn.classList.toggle('active', dmMode);
  document.body.classList.toggle('dm-mode', dmMode);
  var dmPageBtn = document.getElementById('dmPageBtn'); if (dmPageBtn) dmPageBtn.style.display = dmMode ? 'inline-block' : 'none';
  if (typeof toggleCharacterDM === 'function') toggleCharacterDM(dmMode);
  if (!dmMode && currentPage === 'dm') navigateTo('character');
  if (dmMode) navigateTo('dm');
}

/* ──────────────────────────────────────────────
   角色选择弹窗
   ────────────────────────────────────────────── */

var _charSelectData = [];

function showCharacterSelectDialog(availableChars) {
  _charSelectData = availableChars;
  var modal = document.getElementById('charSelectModal');
  var list = document.getElementById('charSelectList');
  if (!modal || !list) return;

  list.innerHTML = '';
  availableChars.forEach(function(ch, i) {
    var row = document.createElement('div');
    row.className = 'cs-row';
    var info = 'Lv.' + ch.level;
    if (ch.mainClass) info += ' | ' + ch.mainClass;
    if (ch.race && ch.race !== '人类') info += ' | ' + ch.race;
    row.innerHTML =
      '<label class="cs-label">' +
      '<input type="checkbox" checked data-idx="' + i + '">' +
      '<span class="cs-name">' + ch.name + '</span>' +
      '<span class="cs-info">' + info + '</span>' +
      '</label>';
    list.appendChild(row);
  });
  modal.style.display = 'flex';
}

function confirmCharacterSelection() {
  var modal = document.getElementById('charSelectModal');
  if (modal) modal.style.display = 'none';

  var checks = document.querySelectorAll('#charSelectList input[type=checkbox]');
  var loaded = 0;
  checks.forEach(function(cb) {
    if (!cb.checked) return;
    var idx = parseInt(cb.dataset.idx);
    if (isNaN(idx) || idx >= _charSelectData.length) return;
    var ch = _charSelectData[idx];
    try {
      var bundle = window._CROSSING_DATA || {};
      var fileData = bundle[ch.filePath];
      if (fileData && fileData.characters && fileData.characters[ch.name]) {
        characters[ch.name] = fileData.characters[ch.name];
        loaded++;
      }
    } catch(e) {}
  });

  _charSelectData = [];
  if (loaded > 0) {
    saveAllData();
    _pageInited = false;
    currentCharName = Object.keys(characters)[0] || null;
    if (typeof navigateTo === 'function') navigateTo('character');
    if (typeof showToast === 'function') showToast('已加载 ' + loaded + ' 个角色');
  } else {
    if (typeof showCreateGuide === 'function') showCreateGuide();
  }
}

function toggleAllChars(selectAll) {
  document.querySelectorAll('#charSelectList input[type=checkbox]').forEach(function(cb) {
    cb.checked = selectAll;
  });
}

/* ═══════════════════════════════════════════════════
   Auto-Updater UI (electron-updater via preload IPC)
   ═══════════════════════════════════════════════════ */

function initUpdater() {
  if (!window.electronAPI) return;

  window.electronAPI.getVersion().then(function(ver) {
    console.log('CrossingTRPG v' + ver);
    var el = document.querySelector('.main-version');
    if (el) el.textContent = 'v' + ver + ' · electron';
  });

  window.electronAPI.onUpdateStatus(function(status, data) {
    var banner = document.getElementById('updateBanner');
    var msg = document.getElementById('updateMsg');
    var actions = document.getElementById('updateActions');
    if (!banner || !msg || !actions) return;

    banner.style.display = 'block';
    actions.innerHTML = '';

    switch (status) {
      case 'checking':
        msg.textContent = '⏳ 正在检查更新...';
        break;

      case 'available':
        msg.textContent = '发现新版本 v' + data.version + '，是否下载？';
        var dl = document.createElement('button');
        dl.textContent = '⬇ 下载更新';
        dl.onclick = function(){ window.electronAPI.startDownload(); };
        Object.assign(dl.style, {marginLeft:'8px',padding:'2px 10px',fontSize:'11px',cursor:'pointer',
          background:'rgba(38,198,218,.15)',border:'1px solid var(--accent-cyan)',borderRadius:'4px',color:'var(--accent-cyan)'});
        actions.appendChild(dl);
        break;

      case 'not-available':
        msg.textContent = '✅ 已是最新版本';
        setTimeout(function(){ banner.style.display = 'none'; }, 3000);
        break;

      case 'downloaded':
        msg.textContent = '✅ 更新已下载 (v' + data.version + ')，重启生效';
        var ri = document.createElement('button');
        ri.textContent = '🔄 立即重启';
        ri.onclick = function(){ window.electronAPI.quitAndInstall(); };
        Object.assign(ri.style, {marginLeft:'8px',padding:'2px 10px',fontSize:'11px',cursor:'pointer',
          background:'rgba(255,107,107,.15)',border:'1px solid var(--accent-red)',borderRadius:'4px',color:'var(--accent-red)'});
        actions.appendChild(ri);
        break;

      case 'error':
        msg.textContent = '❌ 更新失败: ' + (data && data.message ? data.message : '未知错误');
        setTimeout(function(){ banner.style.display = 'none'; }, 8000);
        break;
    }
  });

  window.electronAPI.onDownloadProgress(function(progress) {
    var msg = document.getElementById('updateMsg');
    if (msg) msg.textContent = '⬇ 下载中... ' + (progress.percent || 0) + '%';
  });
}

function checkForUpdates() {
  if (!window.electronAPI) {
    alert('更新功能需要 Electron 环境');
    return;
  }
  window.electronAPI.checkForUpdates();
}

function showChangelog() {
  window.open('https://github.com/Konkilino/crossingTRPG/blob/master/changelog.md', '_blank');
}
