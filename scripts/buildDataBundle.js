#!/usr/bin/env node
/* ═══════════════════════════════════════════════════
   数据打包脚本 —— 将 data/ 下的 JSON 文件
   内嵌为 JavaScript 变量，绕过 file:// CORS 限制
   运行: node scripts/buildDataBundle.js
   ═══════════════════════════════════════════════════ */

var fs = require('fs');
var path = require('path');

var outPath = path.join(__dirname, 'dataBundle.js');

// 哪些文件需要打包（相对项目根目录的路径）
var root = path.join(__dirname, '..');

var files = [
  'data/world_registry.json',
  'data/worlds/mainspace/items.json',
  'data/worlds/jianxia/items.json',
  'data/status_refs/bloodline.json',
  'data/status_refs/race.json',
  'data/status_refs/base_class.json',
  'data/status_refs/promotion.json',
];
// Add individual character files
var charDir = path.join(root, 'data', 'characters');
if (fs.existsSync(charDir)) {
  fs.readdirSync(charDir).forEach(function(f) {
    if (f.endsWith('.json')) files.push('data/characters/' + f);
  });
}
var entries = [];

files.forEach(function(relPath) {
  var fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn('⚠ 跳过（不存在）: ' + relPath);
    return;
  }
  try {
    var raw = fs.readFileSync(fullPath, 'utf-8');
    var parsed = JSON.parse(raw);
    entries.push('  "' + relPath + '": ' + JSON.stringify(parsed));
    console.log('✓ ' + relPath);
  } catch (e) {
    console.error('✗ ' + relPath + ' — ' + e.message);
  }
});

var output = [
  '/* 自动生成 — ' + new Date().toISOString() + ' */',
  '/* 运行 node scripts/buildDataBundle.js 可刷新 */',
  'window._CROSSING_DATA = {',
  entries.join(',\n'),
  '};',
  '',
].join('\n');

fs.writeFileSync(outPath, output, 'utf-8');
console.log('\n✅ 已生成 scripts/dataBundle.js (' + entries.length + ' 个文件)');
