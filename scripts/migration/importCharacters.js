#!/usr/bin/env node
/* ═══════════════════════════════════════════════════
   角色卡 XLSX → JSON 转换脚本 v2
   精确解析穿越团角色卡【合集】1.xlsx
   ═══════════════════════════════════════════════════ */

var XLSX = require('xlsx');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var xlsxPath = path.join(root, '穿越团角色卡【合集】1.xlsx');
var outDir = path.join(root, 'data', 'characters');

if (!fs.existsSync(xlsxPath)) { console.error('File not found: ' + xlsxPath); process.exit(1); }
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 技能标签到内部 ID
var SKILL_MAP = {
  '豁免': { str:'saveStr', dex:'saveDex', con:'saveCon', int:'saveInt', wis:'saveWis', cha:'saveCha' },
  '威力':'powerStrike','承重':'athCarry','跳跃':'athJump','攀爬':'athClimb','游泳':'athSwim',
  '运动-跳跃':'athJump','运动-攀爬':'athClimb','运动-游泳':'athSwim','运动-自定义':'athCustom',
  '体操':'dexGymnastics','骑乘':'dexRide','隐匿':'dexStealth',
  '巧手-偷窃':'sleightSteal','巧手-开锁':'sleightLock','巧手-拆除':'sleightDisarm','巧手-自定义':'sleightCustom',
  '专注':'dexFocus','耐力':'dexEndurance',
  '欺瞒':'socDeceive','恐吓':'socIntimidate','说服':'socPersuade',
  '表演-歌唱':'perfSing','表演-舞蹈':'perfDance','表演-自定义':'perfCustom',
  '宗教':'knoReligion','调查':'knoInvestigate','估价':'knoAppraise','伪造':'knoForge','读唇':'knoLipRead',
  '逻辑':'knoLogic','学习':'knoLearn',
  '奥秘-魔法学识':'arcMagic','奥秘-炼金术':'arcAlchemy','奥秘-炼金':'arcAlchemy',
  '奥秘-神奇道具':'arcItem','奥秘-多元宇宙':'arcMulti',
  '知识-历史':'genHistory','知识-地理':'genGeography','知识-人文':'genHumanity',
  '知识-政治':'genPolitics','知识-神秘学':'genOccult','知识-工程学':'genEngineer',
  '知识-珠宝学':'genJewelry','知识-计算机':'genComputer','知识-医药':'genMedicine',
  '知识-烹饪':'genCooking','知识-自然':'genNature','知识-驯兽':'genAnimal',
  '知识-刑侦':'genEducation','知识-草药学':'knoLearn','知识-自定义':'genCustom',
  '洞悉':'senInsight','聆听':'senListen','察觉':'senPerception'
};

function get(data, r, c) {
  var v = (data[r] || [])[c];
  return v === undefined || v === null ? '' : String(v).trim();
}
function getN(data, r, c) {
  var v = (data[r] || [])[c];
  if (v === undefined || v === null || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

// 属性配置: 左列(C-G)=indices 2-6, 右列(H-L)=indices 7-11
// 每个属性: labelCol=label列, valCol=值列, profCol=熟练标签列, profValCol=熟练值列, rows=行范围
var STATS = {
  str: { valCol: 3, profCol: 5, profValCol: 6, rows: [2, 3, 4, 5, 6, 7, 8] },
  dex: { valCol: 3, profCol: 5, profValCol: 6, rows: [10, 11, 12, 13, 14, 15, 16, 17] },
  con: { valCol: 3, profCol: 5, profValCol: 6, rows: [19, 20, 21] },
  cha: { valCol: 3, profCol: 5, profValCol: 6, rows: [22, 23, 24, 25, 26, 27, 28] },
  int: { valCol: 8, profCol: 10, profValCol: 11, rows: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
  wis: { valCol: 8, profCol: 10, profValCol: 11, rows: [29, 30, 31] }
};

function parseChar(name, data) {
  var c = {
    identity: {},
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    derived: { level: 1, ac: 10, initiative: 0, speed: 30, attackBonus: 0, vigilance: 10,
               hpCurrent: 10, hpMax: 10, fatigueCurrent: 0, fatigueMax: 10,
               xpCurrent: 0, xpMax: 100, will: 1, luck: 1, enlightenment: 1,
               fatigueLabel: '\u{1F343} 疲劳值' },
    skills: {}, customNames: {}, otherProfs: ['通用语'],
    background: {}, talents: [], enhances: [],
    equipment: {}, wealth: { currencies: [{ name: '银两', amount: 0 }, { name: '铜币', amount: 0 }] },
    inventory: [], activeSlots: [], passiveSlots: [],
    property: { mainXp: 0, mainAp: 0, badges: {} },
    statusDetail: { bloodline: '人类', race: '人类', baseClass: '', promotion: '', promoState: '' }
  };
  var id = c.identity;

  // === 基础信息 A-B 列 ===
  id.charName = name;
  id.playerName = get(data, 1, 1);
  id.race = get(data, 3, 1) || '人类';
  id.gender = get(data, 4, 1) || '';
  c.derived.level = getN(data, 5, 1) || 1;
  c.derived.hpMax = getN(data, 7, 1) || 10;
  c.derived.hpCurrent = c.derived.hpMax;
  c.derived.fatigueMax = getN(data, 9, 1) || 10;
  id.age = getN(data, 11, 1) || 20;
  var hRaw = get(data, 12, 1); var hm = hRaw.match(/(\d+)/);
  id.height = hm ? parseInt(hm[1]) : 170;
  var wRaw = get(data, 13, 1); var wm = wRaw.match(/(\d+)/);
  id.weight = wm ? parseInt(wm[1]) : 65;
  id.eyeColor = get(data, 14, 1) || '';
  id.skinColor = get(data, 15, 1) || '';
  id.hairColor = get(data, 16, 1) || '';
  c.derived.will = getN(data, 18, 1) || 1;
  c.derived.luck = getN(data, 19, 1) || 1;
  c.derived.enlightenment = getN(data, 20, 1) || 1;

  // 基因锁
  var gl = get(data, 22, 1);
  if (gl && gl !== '无' && gl !== '未开启' && gl !== '无基因锁') {
    id.geneLockLevel = gl; id.geneLockEnabled = true;
    id.geneLockProf = getN(data, 23, 1) || 0;
  } else { id.geneLockLevel = '未开启'; id.geneLockEnabled = false; id.geneLockProf = 0; }
  id.geneLockProfs = { '一阶': 0, '二阶': 0, '三阶': 0, '四阶': 0 };
  if (id.geneLockLevel !== '未开启') id.geneLockProfs[id.geneLockLevel] = id.geneLockProf || 0;

  id.mainClass = get(data, 25, 1) || '';
  id.mainClassLevel = getN(data, 26, 1) || 1;
  id.subClass = get(data, 30, 1) || '';
  id.subClassLevel = getN(data, 31, 1) || 1;

  // 种族/血脉
  var raceRaw = id.race || '';
  if (raceRaw.indexOf('畸变兽') >= 0 || raceRaw.indexOf('史莱姆') >= 0 ||
      raceRaw.indexOf('巨人') >= 0 || raceRaw.indexOf('倪哥') >= 0) {
    c.statusDetail.bloodline = '畸变兽'; c.statusDetail.race = '畸变兽';
  } else { c.statusDetail.bloodline = '人类'; c.statusDetail.race = raceRaw || '人类'; }
  id.race = raceRaw || '人类';

  // === 六维属性 + 熟练项 ===
  Object.keys(STATS).forEach(function(stat) {
    var sc = STATS[stat];
    // 找属性值：在 rows 范围内找非熟练项标签的行
    for (var ri = 0; ri < sc.rows.length; ri++) {
      var r = sc.rows[ri];
      var labelCell = get(data, r, sc.valCol - 1); // 标签列
      // 检查该标签是否属于熟练项（属性值行的标签列应该是"力量/敏捷"等，不是熟练项名）
      var isProfLabel = false;
      Object.keys(SKILL_MAP).forEach(function(k) {
        if (labelCell === k || (k.indexOf('-') >= 0 && labelCell.indexOf(k.replace(/-.*/, '')) >= 0)) isProfLabel = true;
      });
      if (isProfLabel || labelCell === '' || labelCell === '类别') continue;
      var val = getN(data, r, sc.valCol);
      if (val !== null) { c.stats[stat] = val; break; }
    }
    // 熟练项
    for (var ri = 0; ri < sc.rows.length; ri++) {
      var r = sc.rows[ri];
      var label = get(data, r, sc.profCol);
      var pv = getN(data, r, sc.profValCol);
      if (!label) continue;
      var skillId = null;
      if (label === '豁免') skillId = SKILL_MAP['豁免'][stat];
      else skillId = SKILL_MAP[label];
      if (skillId) c.skills[skillId] = { checked: pv !== null && pv > 0, value: pv || 0 };
    }
  });

  // === 战斗信息 M-N 列 ===
  c.derived.initiative = getN(data, 2, 13) || 0;
  c.derived.speed = getN(data, 3, 13) || getN(data, 3, 12) || 30;
  c.derived.ac = getN(data, 4, 13) || getN(data, 4, 12) || 10;
  c.derived.attackBonus = getN(data, 5, 13) || getN(data, 5, 12) || 0;
  c.property.mainXp = getN(data, 28, 13) || 0;
  c.property.mainAp = getN(data, 32, 13) || getN(data, 31, 13) || 0;
  c.derived.vigilance = getN(data, 33, 11) || 10;

  // 铭牌
  var badgeRaw = get(data, 30, 13) || get(data, 30, 12) || '';
  var bm = badgeRaw.match(/([一二三四五六])阶.*?(\d+)/);
  if (bm) {
    var tm = { '一': '一阶铭牌', '二': '二阶铭牌', '三': '三阶铭牌', '四': '四阶铭牌', '五': '五阶铭牌', '六': '六阶铭牌' };
    c.property.badges[tm[bm[1]]] = parseInt(bm[2]);
  }

  // 其他熟练项
  var otherRaw = get(data, 32, 4) || get(data, 32, 3) || '';
  if (otherRaw) {
    c.otherProfs = otherRaw.split(/[,，、+]/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0 && !s.match(/^\d+$/); });
  }

  // === 主动技能 R-Y 列 ===
  for (var r = 2; r < data.length; r++) {
    var sn = get(data, r, 17);
    if (!sn || sn === '技能名称' || sn === '特殊专长列表' || sn === '专长名称') continue;
    if (r > 12 && get(data, 12, 17) === '特殊专长列表') break;
    c.activeSlots.push({
      name: sn, castTime: get(data, r, 18), range: get(data, r, 19),
      duration: get(data, r, 20), cost: getN(data, r, 21) || 0, category: get(data, r, 22)
    });
  }

  // === 被动技能 Z-AB 列 ===
  for (var r = 2; r < Math.min(14, data.length); r++) {
    var pn = get(data, r, 25);
    if (!pn || pn === '类别' || pn === '特殊专长列表') continue;
    c.passiveSlots.push({ name: pn, category: get(data, r, 26) || '', stage: get(data, r, 27) || '常驻' });
  }

  // === 专长 R-S 列 ===
  for (var r = 13; r < Math.min(25, data.length); r++) {
    var tn = get(data, r, 17), te = get(data, r, 18);
    if (tn && te && tn !== '专长名称' && tn !== '特殊专长列表') c.talents.push(tn + '：' + te);
  }

  // === 背景 行37-45 ===
  // 个性背景 (R38): B列可能含括号效果
  var persRaw = get(data, 38, 1) || '';
  var persMatch = persRaw.match(/^(.+?)[（(](.+)[）)]$/);
  if (persMatch) {
    c.background.bgPersonality = persMatch[1].trim();
    c.background.bgEffects = c.background.bgEffects || {};
    c.background.bgEffects.personality = persMatch[2].trim();
  } else {
    c.background.bgPersonality = persRaw;
  }
  // Also try L column (col 11) for personality effect
  var persEffL = get(data, 38, 11);
  if (persEffL) {
    c.background.bgEffects = c.background.bgEffects || {};
    c.background.bgEffects.personality = persEffL;
  }
  // 个人特点 (R39): B=描述, L=效果
  c.background.bgTraits = get(data, 39, 1) || '';
  var traitsEff = get(data, 39, 11);
  if (traitsEff) { c.background.bgEffects = c.background.bgEffects || {}; c.background.bgEffects.traits = traitsEff; }
  // 理念 (R41)
  c.background.bgIdeals = get(data, 41, 1) || '';
  var idealsEff = get(data, 41, 11);
  if (idealsEff) { c.background.bgEffects = c.background.bgEffects || {}; c.background.bgEffects.ideals = idealsEff; }
  // 牵绊 (R43)
  c.background.bgBonds = get(data, 43, 1) || '';
  var bondsEff = get(data, 43, 11);
  if (bondsEff) { c.background.bgEffects = c.background.bgEffects || {}; c.background.bgEffects.bonds = bondsEff; }
  // 缺点 (R45)
  c.background.bgFlaws = get(data, 45, 1) || '';
  var flawsEff = get(data, 45, 11);
  if (flawsEff) { c.background.bgEffects = c.background.bgEffects || {}; c.background.bgEffects.flaws = flawsEff; }
  // 汇总机制描述（兼容旧格式）
  var mechParts = [];
  if (c.background.bgEffects) {
    Object.values(c.background.bgEffects).forEach(function(v) { if (v) mechParts.push(v); });
  }
  c.background.bgMechanics = mechParts.join(' | ');

  // === 已经历强化（行6-11, O列 col14） ===
  var enhances = [];
  for (var r = 6; r < 12; r++) {
    var ev = get(data, r, 14);
    if (ev && ev !== '特殊专长' && !ev.startsWith('已经历强化')) enhances.push(ev);
  }
  c.enhances = enhances;

  // === 装备 ===
  for (var r = 47; r < Math.min(60, data.length); r++) {
    var el = get(data, r, 0), ev = get(data, r, 1);
    if (el.indexOf('主手') >= 0) c.equipment.weaponMain = ev;
    else if (el.indexOf('副手') >= 0) c.equipment.weaponOff = ev;
    else if (el.indexOf('防具') >= 0) c.equipment.armor = ev;
  }

  // === 物品清单 ===
  for (var r = 47; r < data.length; r++) {
    var il = get(data, r, 0);
    if (!il) continue;
    if (il.indexOf('主手') >= 0 || il.indexOf('副手') >= 0 || il.indexOf('防具') >= 0 ||
        il.indexOf('头部') >= 0 || il.indexOf('手部') >= 0 || il.indexOf('腰部') >= 0 ||
        il.indexOf('足部') >= 0 || il.indexOf('首饰') >= 0 || il.indexOf('装备槽') >= 0 ||
        il.indexOf('随身空间') >= 0 || il.indexOf('仓库') >= 0 || il.indexOf('背景') >= 0 ||
        il.indexOf('个性') >= 0 || il.indexOf('复活') >= 0) continue;
    var qm = il.match(/\*(\d+)/); var qty = qm ? parseInt(qm[1]) : 1;
    var nm = il.replace(/\*\d+.*/, '').trim();
    if (nm && nm.length > 1 && !nm.match(/^\d+$/)) c.inventory.push({ name: nm, qty: qty, weight: 0.5 });
  }

  return c;
}

// ═══════ 主流程 ═══════
var wb = XLSX.readFile(xlsxPath);
var allChars = {};
var count = 0;

wb.SheetNames.forEach(function(sheetName) {
  var charName = sheetName.replace(/[（(].*[）)]/, '').trim();
  console.log('Processing: ' + sheetName + ' -> ' + charName);
  var ws = wb.Sheets[sheetName];
  var data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  var cd = parseChar(charName, data);
  allChars[charName] = cd;

  // 单独文件
  var single = {}; single[charName] = cd;
  fs.writeFileSync(path.join(outDir, charName + '.json'), JSON.stringify({ characters: single }, null, 2), 'utf-8');

  // 打印摘要
  var sk = cd.skills, skNames = Object.keys(sk).filter(function(k) { return sk[k].checked && sk[k].value > 0; });
  console.log('  Stats: STR' + cd.stats.str + ' DEX' + cd.stats.dex + ' CON' + cd.stats.con + ' INT' + cd.stats.int + ' WIS' + cd.stats.wis + ' CHA' + cd.stats.cha);
  console.log('  Skills(' + skNames.length + '): ' + skNames.map(function(k) { return SKILL_MAP['豁免'] && SKILL_MAP['豁免'].str ? k : k; }).join(', '));
  console.log('  HP:' + cd.derived.hpMax + ' Lv:' + cd.derived.level + ' AC:' + cd.derived.ac + ' XP:' + cd.property.mainXp);
  count++;
});

console.log("\nDone: " + count + " characters -> data/characters/");
