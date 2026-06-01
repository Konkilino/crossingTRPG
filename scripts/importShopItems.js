#!/usr/bin/env node
/* ═══════════════════════════════════════════════════
   商店 XLSX → JSON 转换脚本
   读取"无限团兑换列表（雾岛）.xlsx"
   写入 data/worlds/mainspace/items.json
   ═══════════════════════════════════════════════════ */

var XLSX = require('xlsx');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var xlsxPath = path.join(root, '无限团兑换列表（雾岛）.xlsx');
var outPath = path.join(root, 'data', 'worlds', 'mainspace', 'items.json');

if (!fs.existsSync(xlsxPath)) { console.error('File not found: ' + xlsxPath); process.exit(1); }

// 类型映射：将 xlsx 中的道具类型映射为商店类别
function mapType(rawType) {
  if (!rawType) return '其他';
  var t = rawType.trim();
  // 取逗号分隔的第一个词
  var first = t.split(/[,，、]/)[0].trim();
  var catMap = {
    '枪械': '武器', '步枪': '武器', '手枪': '武器', '散弹枪': '武器', '狙击枪': '武器',
    '组件': '道具', '药剂': '道具', '消耗品': '道具', '工具': '道具',
    '服装': '防具', '鞋': '防具', '手套': '防具', '配饰': '防具',
    '肉体强化': '强化',
  };
  if (catMap[first]) return catMap[first];
  if (t.indexOf('强化') >= 0) return '强化';
  if (t.indexOf('药剂') >= 0 || t.indexOf('消耗') >= 0) return '道具';
  if (t.indexOf('枪') >= 0) return '武器';
  return '道具';
}

// 阶位推断
function mapRank(sheetName, rawType) {
  if (sheetName.indexOf('一阶') >= 0) return '一阶';
  if (sheetName.indexOf('二阶') >= 0) return '二阶';
  if (sheetName.indexOf('三阶') >= 0) return '三阶';
  return '特殊';
}

var wb = XLSX.readFile(xlsxPath);
var allItems = [];

wb.SheetNames.forEach(function(sheetName) {
  var ws = wb.Sheets[sheetName];
  var data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (data.length < 2) return;

  var header = data[0];
  var rank = mapRank(sheetName, '');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[0] || String(row[0]).trim() === '') continue;

    var name = String(row[0] || '').trim();
    // 过滤表头行和角色专属购买行
    if (name === '道具名称' || name === '能力名称' || name === '技能名称' ||
        name === '专长名称' || name === '类别' || name === '施展时间' ||
        name === '角色专属购买选项' || name === '金子洪' || name === '顾清' ||
        name === '彭同志' || name === '李棠王' || name === '严渠' || name === '丰川祥子') continue;

    var rawType = String(row[1] || '').trim();
    var xpCost = parseInt(row[2]) || 0;
    var desc = '';
    var badgeCost = '';
    // 来源世界标签
    var sourceWorld = '主神空间';
    if (sheetName.indexOf('雾岛') >= 0) sourceWorld = '迷雾岛';
    else if (sheetName.indexOf('动物园') >= 0) sourceWorld = '十全十美动物园';

    // 不同 sheet 的列布局略有不同
    if (sheetName === '道具列表一阶' || sheetName === '雾岛列表') {
      desc = String(row[3] || '').trim();
    } else if (sheetName === '能力强化一阶') {
      desc = String(row[3] || '').trim();
    } else if (sheetName === '十全十美动物园列表') {
      desc = String(row[4] || '').trim();
    }

    // 从名称中提取阶位
    var nameRank = name.match(/\*([一二三四五六]阶)/);
    if (nameRank) rank = nameRank[1];

    // 从名称中提取铭牌
    var badgeMatch = name.match(/[（(]([青铜白银黄金钻石]+)[）)]/);
    if (badgeMatch) badgeCost = badgeMatch[1];

    allItems.push({
      type: mapType(rawType),
      rank: rank,
      name: name.replace(/\*[一二三四五六]阶/, ''),
      desc: desc,
      xpCost: xpCost,
      apCost: 0,
      badgeCost: badgeCost,
      sourceWorld: sourceWorld
    });
  }
  console.log('Sheet [' + sheetName + ']: ' + (data.length - 1) + ' rows -> ' + allItems.length + ' total items');
});

// 写入
var output = {
  version: '2.0',
  lastModified: new Date().toISOString().split('T')[0],
  items: allItems
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log('\nDone: ' + allItems.length + ' items -> ' + outPath);
