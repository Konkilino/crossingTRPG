/* ═══════════════════════════════════════════════
   TRPG Crossing Terminal - 统一数据层
   v2.1 — 无服务器模式：localStorage + 内嵌数据包
   ═══════════════════════════════════════════════ */

var STORAGE_PREFIX = 'crossing_';

function pathToKey(path) {
  var normalized = path.replace(/^data\//, '').replace(/^\/api\/data\//, '');
  return STORAGE_PREFIX + normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * 读取 JSON 数据
 * 优先级：localStorage > 内嵌数据包 > 报错
 */
function loadJSON(path) {
  var key = pathToKey(path);

  // 1) 从 localStorage 读取（用户修改过的数据）
  try {
    var stored = localStorage.getItem(key);
    if (stored) return Promise.resolve(JSON.parse(stored));
  } catch (e) { /* ignore */ }

  // 2) 从内嵌数据包读取（源文件种子）
  var bundle = window._CROSSING_DATA || {};
  if (bundle[path]) return Promise.resolve(bundle[path]);

  return Promise.reject(new Error('数据未找到: ' + path));
}

/**
 * 写入 JSON 数据 → localStorage
 */
function saveJSON(path, data) {
  var key = pathToKey(path);
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(new Error('保存 ' + path + ' 失败: ' + e.message));
  }
}

/* ──────────────────────────────────────────────
   便捷函数（按业务域封装）
   ────────────────────────────────────────────── */

function loadStatusRefs() {
  return Promise.all([
    loadJSON('data/status_refs/bloodline.json').catch(function(){ return null; }),
    loadJSON('data/status_refs/race.json').catch(function(){ return null; }),
    loadJSON('data/status_refs/base_class.json').catch(function(){ return null; }),
    loadJSON('data/status_refs/promotion.json').catch(function(){ return null; }),
  ]).then(function(results) {
    return {
      bloodline: results[0],
      race: results[1],
      baseClass: results[2],
      promotion: results[3],
    };
  });
}

function loadWorldRegistry() {
  return loadJSON('data/world_registry.json').catch(function(e) {
    console.warn('registry load fail:', e);
    return { worlds: {} };
  });
}

function loadWorldItems(worldId) {
  return loadWorldRegistry().then(function(reg) {
    var world = reg.worlds && reg.worlds[worldId];
    if (!world || !world.path) throw new Error('Unknown world: ' + worldId);
    return loadJSON(world.path).then(function(data) {
      return data.items || [];
    });
  }).catch(function(e) {
    console.warn('world ' + worldId + ' load fail:', e);
    return [];
  });
}

/* ──────────────────────────────────────────────
   服务端文件存取（需 server.js 运行）
   ────────────────────────────────────────────── */

function isServerMode() {
  var p = window.location.protocol;
  return p === 'http:' || p === 'https:';
}

function saveCharacterFile(name, charData) {
  if (!isServerMode()) return Promise.resolve();
  var payload = JSON.stringify({ characters: {} });
  var wrapper = JSON.parse(payload);
  wrapper.characters[name] = charData;
  return fetch('/api/data/characters/' + encodeURIComponent(name) + '.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wrapper, null, 2),
  }).then(function(r) {
    if (!r.ok) throw new Error('Save failed: ' + r.status);
  }).catch(function(e) {
    console.warn('File save skipped (server may not be running):', e.message);
  });
}

function deleteCharacterFile(name) {
  if (!isServerMode()) return Promise.resolve();
  return fetch('/api/data/characters/' + encodeURIComponent(name) + '.json', {
    method: 'DELETE',
  }).then(function(r) {
    if (!r.ok) throw new Error('Delete failed: ' + r.status);
  }).catch(function(e) {
    console.warn('File delete skipped (server may not be running):', e.message);
  });
}
