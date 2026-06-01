# 穿越团 · 主神空间终端 — 通览分析与优化方案

> 项目版本：v1.0 (Electron 壳 + 原生 JS SPA)
> 分析日期：2026-05-30
> 基于完整代码审查 + data/ 全量文件审查

---

## 一、项目全景理解

基于 **Electron + 原生 JS + 纯 CSS 暗色主题** 的 TRPG 角色管理桌面终端。核心功能：
角色卡管理、商店交易、世界观数据浏览。

### 目录结构

```
crossing/
├── index.html              # 单页应用壳 (所有页面DOM + 内联样式)
├── scripts/
│   ├── app.js              # 导航系统、数据层 (load/save/export/import)、DM Mode
│   ├── character.js        # 角色面板全部逻辑 (含DM面板)
│   └── shop.js             # 商店 + 剑侠世界页面逻辑
├── styles/
│   └── theme.css           # 全暗色主题系统 (约740行)
└── data/
    ├── characters.json     # 角色数据持久化 (1个角色：李棠王)
    ├── shop_items.json     # 主神空间商店 (25件商品)
    ├── jianxia_items.json  # 剑侠情缘世界观 (items数组为空)
    └── status_refs/
        ├── bloodline.json  # 血脉 (2项)
        ├── race.json       # 种族 (2项)
        ├── base_class.json # 基础职业 (7项)
        └── promotion.json  # 一转职业 (8项)
```

### 页面/路由

| 页面 ID | 功能 | 初始化函数 |
|---------|------|-----------|
| `#mainPage` | 主页 → 三个导航按钮 | — |
| `#creationPage` | 角色创建引导 | `showCreateGuide()` |
| `#characterPage` | 角色面板（核心） | `initCharacterPage()` |
| `#jianxiaPage` | 剑侠世界浏览 | **无 init handler ← BUG** |
| `#shopPage` | 主神空间商店 | `initShopPage()` |
| `#dmPage` | DM 全览 | `renderDmOverview()` |

### 数据流

```
[持久层] data/*.json
    ↓ (通过 electronAPI bridge 或 fetch)
[内存] characters / _shopItems / _jianxiaItems / _bloodlineData 等
    ↓
[UI] 各页面渲染
    ↓ (用户编辑)
gatherCharData() → autoSave() → characters.json
```

---

## 二、Bug 诊断报告（含根因分析）

### 🔴 P0 — 致命 Bug

#### B1. 剑侠情缘页面永远无法加载数据

**症状**: 从主页点击"剑侠情缘"按钮 → 页面显示"数据加载中…" 永久卡住。

**根因 1 — 缺少路由初始化**:
`navigateTo()` 函数处理了 `character` / `shop` / `dm` 三个页面的初始化，但**没有处理 `jianxia` 页面**：

```js
// app.js navigateTo() 中
if (page === 'character' && typeof initCharacterPage === 'function') { ... }
if (page === 'shop' && typeof initShopPage === 'function') { ... }
if (page === 'dm' && typeof renderDmOverview === 'function') { ... }
// ✗ 缺少: if (page === 'jianxia' && typeof loadJianxiaData === 'function') { ... }
```

`loadJianxiaData()` 仅在 `DOMContentLoaded` 时被检查（app.js 第26行），但此时 `currentPage === 'main'`，条件不满足。所以 **`loadJianxiaData()` 在应用整个生命周期中永远不会被调用**。

**根因 2 — `jianxia_items.json` 的 `items` 数组为空**:
```json
{ "version": "1.0", "items": [] }
```
即使修复了加载路径，也没有数据可显示。

**根因 3 — 字段名不匹配**:
`filterJianxia()` 使用 `item.type / item.rank / item.sect / item.category / item.name / item.desc / item.cost`，这些字段在 `shop_items.json` 格式中对应不同的命名体系，需要统一 schema。而且 `item.desc` 和 `item.cost` 与 `shop_items.json` 中的 `desc` / `xpCost` 不匹配。

---

#### B2. 商店页面不显示剑侠商品

**症状**: 商店中只显示主神空间商品，计数器显示"剑侠情缘 0 件"。

**根因**: `loadShopData()` 中加载 `jianxia_items.json` 的 `fetch()` 被包裹在 `if(window.electronAPI)` 之内（shop.js 第16行）。当 `electronAPI` 不存在时，该分支完全跳过，`_jianxiaItems` 永远是 `[]`。

---

#### B3. 血脉/种族/职业下拉框无法加载/保存

**症状**: 刷新页面后下拉框恢复默认选项，之前的选择不持久化。

**根因 1 — `characters.json` 缺少 `statusDetail` 字段**:
`loadCharacterIntoUI()`（character.js 第311行）读取 `data.statusDetail` 来设置下拉框值，但 **characters.json 中根本没有这个字段**。下拉框永远得不到正确的初始值。

**根因 2 — `file://` 协议下 `fetch()` 被阻断**:
Electron 以 `file://` 加载 HTML 时，`fetch()` 默认被 CORS 阻止。列表中所有依赖 `fetch` 的路径都可能失效：

| 目标文件 | 加载函数 | 影响 |
|---------|---------|------|
| `data/status_refs/bloodline.json` | `loadStatusRefs()` | 血脉下拉框空白 |
| `data/status_refs/race.json` | `loadStatusRefs()` | 种族下拉框空白 |
| `data/status_refs/base_class.json` | `loadStatusRefs()` | 职业下拉框空白 |
| `data/status_refs/promotion.json` | `loadStatusRefs()` | 一转下拉框空白 |
| `data/jianxia_items.json` | `loadJianxiaData()` | 剑侠页面空白 |

这是**多个"无法加载 json"问题的统一根因**。

---

#### B4. 经验值数据断裂

**症状**: 加载已有角色时经验值始终显示 "0 / 100"，而非应有的 "450 / 900"。

**根因**: `characters.json` 中存储 `xpNext: 900`，但代码 `character.js:302` 读取 `xpMax`：

```js
_xpNext = data.derived && data.derived.xpMax ? data.derived.xpMax : 100;
//                          ^^^^^^ 应为 xpNext
```

而 `gatherCharData()`（第329行）保存为 `xpMax`，与存量数据格式不兼容：

```js
data.derived.xpMax = _xpNext;  // 写 xpMax
// data 中是 xpNext            // 读不到
```

---

### 🟠 P1 — 重要问题

#### B5. DM 视图无法正常显示

**症状**: DM 页面显示"暂无角色数据"或无法打开。

**根因**:
1. `renderDmOverview()` 依赖全局 `characters`——如果 `loadAllData()`（异步）未完成，显示空
2. `toggleDM()` → `navigateTo('dm')` → `renderDmOverview()` 是同步调用，无等待/重试
3. 在 `DOMContentLoaded` 中 `loadAllData()` 之后没有主动刷新 DM 视图

#### B6. 成就点读取路径断裂

`characters.json` 中成就点位于 `wealth.achievePoints: 85`，但代码从 `property.mainAp` 读：

```js
_mainAp = (data.property && data.property.mainAp) || 0;
// data.property.mainAp 不存在 → _mainAp = 0
```

而 `gatherCharData()` 保存到 `property.mainAp`，导致编辑时设为 0，保存覆盖，循环丢失。

#### B7. 货币字段不匹配

`characters.json` 中 `wealth.currencies` 有 5 种货币（金币/银币/铜币/代币/灵魂碎片），`createNewCharacter()` 只创建 2 种（银两/铜币）。虽然加载时可正确读取 5 种，但 `gatherCharData()` 可能覆盖为创建模板的 2 种。

---

### 🟡 P2 — 架构问题

#### B8. 缺少 Electron 壳文件

项目目录中没有 `main.js` / `preload.js` / `package.json`。`window.electronAPI` 的来源不明，项目不可直接作为 Electron 应用启动。

#### B9. 数据层分散

角色数据、商店数据、四项参考数据分别通过三个不同的路径加载（`electronAPI.loadCharacters` / `electronAPI.loadShop` / `fetch`），没有统一的加载管理器。

---

## 三、紧急修复方案

### 实施顺序：按"最少改动解决最多问题"排序

#### Fix 1 — 剑侠页面路由（app.js +3 行）

在 `navigateTo()` 函数中追加 jianxia 初始化：

```js
// 约第 76 行处追加
if (page === 'jianxia' && typeof loadJianxiaData === 'function') {
    loadJianxiaData();
}
```

同时，在 `DOMContentLoaded` 中初始化逻辑也建议加上（以确保首次加载也触发）：

```js
// 约第 27 行处，在 shop 判断之后追加
if (currentPage === 'jianxia' && typeof loadJianxiaData === 'function') {
    loadJianxiaData();
}
```

**影响**: 剑侠页面从"永久转圈"变为"能加载数据"（虽然目前数据为空）。

---

#### Fix 2 — 统一 JSON 加载函数（character.js + shop.js）

创建一个统一的跨平台 JSON 加载辅助函数：

```js
// character.js 顶部或单独文件
async function loadJSON(path) {
  if (window.electronAPI && window.electronAPI.readFile) {
    const text = await window.electronAPI.readFile(path);
    return JSON.parse(text);
  }
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}
```

然后将所有 `fetch("./data/...")` 替换为 `loadJSON("./data/...")`：

**`character.js` `loadStatusRefs()`**:

```js
// 第 522-529 行 替换为：
function loadStatusRefs() {
  return Promise.all([
    loadJSON("./data/status_refs/bloodline.json").then(d => { _bloodlineData = d; populateSelect("charBloodline", d, "bloodline"); }).catch(e => console.warn('bloodline fail', e)),
    loadJSON("./data/status_refs/race.json").then(d => { _raceData = d; populateSelect("charRace", d, "race"); }).catch(e => console.warn('race fail', e)),
    loadJSON("./data/status_refs/base_class.json").then(d => { _classData = d; populateSelect("charBaseClass", d, "baseClass"); }).catch(e => console.warn('class fail', e)),
    loadJSON("./data/status_refs/promotion.json").then(d => { _promoData = d; populateSelect("charPromotion", d, "promotion"); }).catch(e => console.warn('promotion fail', e)),
  ]);
}
```

**`shop.js` `loadShopData()`**:

```js
// 第 20-22 行 替换为：
const jd = await loadJSON("./data/jianxia_items.json");
if (jd && jd.items) _jianxiaItems = jd.items;
```

同时将 `loadJianxiaData()` 中的 `fetch` 也替换为 `loadJSON`。

---

#### Fix 3 — 修复角色数据字段不一致（character.js + characters.json）

**字符数据兼容读取**（character.js）：

```js
// 经验值（第 302 行）：兼容 xpMax 和 xpNext
_xpNext = 100;
if (data.derived) {
  _xpNext = data.derived.xpMax || data.derived.xpNext || 100;
}

// 成就点（第 301 行）：兼容 property.mainAp 和 wealth.achievePoints
_mainAp = 0;
if (data.property && data.property.mainAp) _mainAp = data.property.mainAp;
else if (data.wealth && data.wealth.achievePoints) _mainAp = data.wealth.achievePoints;

// statusDetail 兼容加载（第 311-318 行）：如果 data.statusDetail 不存在，从 identity/derived 反推
// 在 loadCharacterIntoUI 中增加 fallback：
if (!data.statusDetail) {
  data.statusDetail = {
    bloodline: "人类",
    race: data.identity && data.identity.race || "人类",
    baseClass: "学生",
    promotion: "无",
    promoState: "未转职"
  };
}
```

**保存时双向写入**（gatherCharData）：

```js
// 保存经验值统一用 xpMax
data.derived.xpMax = _xpNext;

// 成就点双向写入
data.property.mainAp = _mainAp;
if (data.wealth) data.wealth.achievePoints = _mainAp;
```

---

#### Fix 4 — 修复 characters.json（数据迁移）

直接修改 `characters.json`：

```json
{
  "李棠王": {
    ...保留所有原有数据...,
    "derived": {
      ...保留原有...,
      "xpCurrent": 450,
      "xpMax": 900,
      "hpCurrent": 28,
      "hpMax": 36,
      "fatigueCurrent": 3,
      "fatigueMax": 15
    },
    "statusDetail": {
      "bloodline": "人类",
      "race": "人类",
      "baseClass": "教师",
      "promotion": "无",
      "promoState": "未转职"
    },
    "property": {
      "mainXp": 450,
      "mainAp": 85,
      "badges": { "一阶铭牌": 2, "二阶铭牌": 1, "三阶铭牌": 0, "四阶铭牌": 0, "五阶铭牌": 0, "六阶铭牌": 0 }
    }
  }
}
```

---

#### Fix 5 — 填充 jianxia_items.json 数据

参考 `shop_items.json` 的 schema，补充至少 10-15 件剑侠世界观商品。示例结构：

```json
{
  "version": "1.0",
  "lastModified": "2026-05-30",
  "world": "剑侠情缘",
  "items": [
    {"type": "功法", "rank": "凡品", "name": "吐纳术", "desc": "基础内功心法，提升真气恢复速度", "sect": "无门派", "category": "内功", "学习费用": 50},
    {"type": "天材地宝", "rank": "良品", "name": "百年灵芝", "desc": "可提升内力上限50点", "sect": "无", "category": "药材", "学习费用": 200},
    {"type": "神兵利器", "rank": "上品", "name": "青釭剑", "desc": "削铁如泥，攻击+3", "sect": "铸剑山庄", "category": "剑", "学习费用": 500}
  ]
}
```

---

#### Fix 6 — 补全 Electron 壳（main.js + preload.js + package.json）

**main.js**:

```js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  mainWindow.loadFile("index.html");
});

ipcMain.handle("read-file", (_, relPath) => {
  return fs.readFileSync(path.join(__dirname, relPath), "utf-8");
});
ipcMain.handle("write-file", (_, relPath, data) => {
  fs.writeFileSync(path.join(__dirname, relPath), data, "utf-8");
});
```

**preload.js**:

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readFile: (relPath) => ipcRenderer.invoke("read-file", relPath),
  writeFile: (relPath, data) => ipcRenderer.invoke("write-file", relPath, data),

  // 向后兼容
  loadCharacters: async () => JSON.parse(
    await ipcRenderer.invoke("read-file", "data/characters.json")),
  saveCharacters: (data) => ipcRenderer.invoke("write-file",
    "data/characters.json", JSON.stringify(data, null, 2)),
  loadShop: async () => JSON.parse(
    await ipcRenderer.invoke("read-file", "data/shop_items.json")),
  exportCharacters: async (data) => {
    const { canceled, filePath } = await ipcRenderer.invoke("show-save-dialog");
    if (!canceled) fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  },
  importCharacters: async () => {
    const { canceled, filePaths } = await ipcRenderer.invoke("show-open-dialog");
    if (!canceled) return JSON.parse(fs.readFileSync(filePaths[0], "utf-8"));
    return null;
  },
});
```

**package.json**:

```json
{
  "name": "crossing-trpg-terminal",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": { "start": "electron ." },
  "dependencies": { "electron": "^33.0.0" }
}
```

---

## 四、Bug 修复清单（速查表）

| 优 | Bug | 根因 | 主文件 | 修复方式 |
|---|-----|------|--------|---------|
| 🔴 | 剑侠页面空白 | 缺少 navigateTo handler | app.js | +3行代码 |
| 🔴 | jianxia_items 空 | 数据从未填充 | jianxia_items.json | 补充商品清单 |
| 🔴 | 经验值显示 0/100 | xpNext vs xpMax | character.js + characters.json | 兼容读取 + 数据迁移 |
| 🔴 | 血脉/种族/职业不保存 | 缺 statusDetail 字段 | characters.json | 补充字段 + 兼容 fallback |
| 🔴 | fetch 在 file:// 被阻断 | Electron CORS 策略 | character.js / shop.js | loadJSON() 统一函数 |
| 🟠 | 商店无剑侠商品 | fetch 在 electronAPI 门控内 | shop.js:14-24 | 移出 if 条件 |
| 🟠 | 成就点显示为 0 | wealth.achievePoints 未同步到 property | character.js:301 | 兼容读取 + 双向写入 |
| 🟠 | DM 视图为空 | 异步加载时序 | app.js:258 | 加载后刷新 DM 视图 |
| 🟠 | 货币不匹配 | 模板 2 种 vs 数据 5 种 | character.js:308 | 动态适配展示 |
| 🟡 | 无 Electron 壳 | 缺少 main.js/preload.js | — | 新建完整壳文件 |

---

## 五、总结：最短修复路径

只需**修改 4 个文件 + 新建 3 个文件**即可解决所有 P0/P1 Bug：

### 修改 4 文件
| 文件 | 改动 |
|------|------|
| `app.js` | +3行：navigateTo 加 jianxia handler |
| `character.js` | 加 loadJSON() 统一函数 / xpNext 兼容 / 成就点兼容 / statusDetail fallback |
| `characters.json` | 加 statusDetail / xpNext→xpMax / mainAp |
| `jianxia_items.json` | 填充 10+ 剑侠世界观商品 |

### 新建 3 文件
| 文件 | 作用 |
|------|------|
| `main.js` | Electron 主进程 + IPC handler |
| `preload.js` | contextBridge 暴露完整 API |
| `package.json` | npm 项目描述 |

### 根本原因链路

```
Electron 未配置 file:// 下 fetch 支持
  + 未实现完整 main.js/preload.js
  ─────────────────────────────────────────
  = 所有 data/*.json 通过 fetch() 加载的路径全部失效
  = 剑侠页面、血脉下拉、种族下拉、职业下拉全部空白

独立 Bug：
  characters.json 字段名不统一 (xpNext vs xpMax)
  characters.json 缺少 statusDetail
  成就点路径不一致 (wealth.achievePoints vs property.mainAp)
  jianxia_items.json 数据为空
  缺少 navigateTo('jianxia') 的初始化调用
```
