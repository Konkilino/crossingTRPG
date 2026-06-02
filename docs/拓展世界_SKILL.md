# 拓展世界 · 操作指南

## 概述

穿越团 TRPG 终端支持多世界拓展。每个世界独立维护一个 JSON 数据文件，通过统一数据层 `dataService.js` 自动读取和保存。新增一个世界通常只需 **3 个步骤**。

---

## 快速上手：三步加一个新世界

假设要新增一个「星际迷航」世界。

### 第 1 步：创建数据文件

在 `data/` 目录下新建 JSON 文件，命名规则为 `{世界名}_items.json`：

```json
// data/star_trek_items.json
{
  "version": "1.0",
  "lastModified": "2026-05-30",
  "world": "星际迷航",
  "items": [
    {
      "type": "武器",
      "rank": "C级",
      "name": "相位手枪",
      "desc": "标准星联军官配枪，可设置眩晕/杀伤模式",
      "sect": "星联",
      "category": "能量武器",
      "cost": 500,
      "xpCost": 500,
      "apCost": 5
    },
    {
      "type": "道具",
      "rank": "B级",
      "name": "三录仪",
      "desc": "便携式扫描分析设备，可探测生命信号和环境数据",
      "sect": "星联",
      "category": "设备",
      "cost": 200,
      "xpCost": 200,
      "apCost": 2
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | 是 | 物品类型（如：武器、防具、道具、功法、天材地宝、神兵利器） |
| `rank` | string | 是 | 品质/阶位（如：C级、B级、A级、S级） |
| `name` | string | 是 | 物品名称 |
| `desc` | string | 是 | 物品描述 |
| `sect` | string | 否 | 所属门派/势力 |
| `category` | string | 否 | 物品种类细分（如：内功、剑法、能量武器、设备） |
| `cost` | number | 是 | 学习费用（显示在剑侠风格页面） |
| `xpCost` | number | 是 | 经验值价格（显示在商店页） |
| `apCost` | number | 否 | 成就点价格（默认 0） |

### 第 2 步：在主页加按钮

在 `index.html` 的主页按钮区添加新世界的入口按钮：

```html
<!-- 在 .main-buttons 容器内添加 -->
<div class="main-btn trek" onclick="navigateTo('startrek')"
     style="background:linear-gradient(135deg,rgba(0,150,255,.2),rgba(100,200,255,.15));
            border-color:rgba(0,150,255,.4)">
  <div class="icon">🚀</div>
  <div class="label">星际迷航</div>
  <div class="hint" style="color:#64c8ff">STAR TREK WORLD</div>
</div>
```

同时添加 hover 样式（内联或放到 `<style>` 标签中）：

```css
.main-btn.trek:hover {
  background: linear-gradient(135deg, rgba(0,150,255,.4), rgba(100,200,255,.3));
  border-color: #0096ff;
}
```

### 第 3 步：在导航路由加页面

在 `index.html` 中添加页面容器（放在 `</body>` 之前，`<script>` 标签之后效果更佳，但也可以放在现有页面之间）：

```html
<!-- 星际迷航页面 -->
<div class="page" id="startrekPage" style="background:var(--bg-primary)">
  <div class="shop-content">
    <div class="shop-header">
      <h1 style="color:#0096ff">🚀 星际迷航 · 世界</h1>
      <p>武器 · 设备 · 科技 查询</p>
    </div>
    <div class="shop-search">
      <span style="font-size:16px">🔍</span>
      <input id="trekSearch" placeholder="搜索名称、描述…" oninput="filterTrek()" style="flex:1;background:var(--bg-primary)">
      <select id="trekTypeFilter" onchange="filterTrek()" style="background:var(--bg-primary)">
        <option value="">全部类型</option>
        <option value="武器">武器</option>
        <option value="防具">防具</option>
        <option value="道具">道具</option>
      </select>
      <select id="trekRankFilter" onchange="filterTrek()" style="background:var(--bg-primary)">
        <option value="">全部品质</option>
        <option value="C级">C级</option>
        <option value="B级">B级</option>
        <option value="A级">A级</option>
        <option value="S级">S级</option>
      </select>
    </div>
    <div class="shop-count" id="trekCount"></div>
    <table class="shop-table">
      <thead>
        <tr>
          <th style="width:60px">类型</th>
          <th style="width:50px">品质</th>
          <th style="width:50px">势力</th>
          <th style="width:50px">类别</th>
          <th style="width:auto">名称</th>
          <th style="width:30%">描述</th>
          <th style="width:80px">费用</th>
        </tr>
      </thead>
      <tbody id="trekBody">
        <tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-muted)">数据加载中…</td></tr>
      </tbody>
    </table>
  </div>
</div>
```

然后在 `scripts/` 下新建世界专属 JS 文件（或追加到 `shop.js`），实现加载和筛选逻辑。推荐新建独立文件 `scripts/world_trek.js`：

```javascript
// scripts/world_trek.js
let _trekItems = [];

async function loadTrekData() {
  try {
    const data = await loadJSON("data/star_trek_items.json");
    _trekItems = data.items || [];
  } catch(e) {
    console.warn("星际迷航数据加载失败:", e);
    _trekItems = []; // 可选：提供内联默认值
  }
  filterTrek();
}

function filterTrek() {
  var tb = document.getElementById("trekBody");
  var cnt = document.getElementById("trekCount");
  if (!tb || !cnt) return;

  var search = document.getElementById("trekSearch").value.trim().toLowerCase();
  var typeFilter = document.getElementById("trekTypeFilter").value;
  var rankFilter = document.getElementById("trekRankFilter").value;

  var result = _trekItems.filter(function(item) {
    if (typeFilter && item.type !== typeFilter) return false;
    if (rankFilter && item.rank !== rankFilter) return false;
    if (search) {
      var n = (item.name || "").toLowerCase();
      var d = (item.desc || "").toLowerCase();
      if (n.indexOf(search) < 0 && d.indexOf(search) < 0) return false;
    }
    return true;
  });

  tb.innerHTML = "";
  if (result.length === 0) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">暂无数据</td></tr>';
    cnt.textContent = "0 项";
    return;
  }

  result.forEach(function(item) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td><span style='color:#0096ff;font-weight:600;font-size:12px'>" + (item.type || "-") + "</span></td>" +
      "<td style='font-size:11px;color:var(--text-secondary)'>" + (item.rank || "-") + "</td>" +
      "<td style='font-size:11px;color:var(--text-muted)'>" + (item.sect || "-") + "</td>" +
      "<td style='font-size:11px;color:var(--text-secondary)'>" + (item.category || "-") + "</td>" +
      "<td style='font-weight:600'>" + (item.name || "-") + "</td>" +
      "<td style='font-size:12px;color:var(--text-secondary)'>" + (item.desc || "") + "</td>" +
      "<td style='font-weight:600;color:#6a8ac4'>" + (item.cost || "-") + "</td>";
    tb.appendChild(tr);
  });
  cnt.textContent = "显示 " + result.length + " / " + _trekItems.length + " 项";
}
```

最后，在 `index.html` 的 `</body>` 前引入新 JS：

```html
<script src="scripts/world_trek.js"></script>
```

在 `scripts/app.js` 的 `navigateTo()` 函数中加一行路由：

```javascript
if (page === 'startrek' && typeof loadTrekData === 'function') {
  loadTrekData();
}
```

---

## 使用 dataService 加载数据的规范

所有世界数据必须通过全局 `loadJSON()` 读取，该函数在 `scripts/dataService.js` 中定义：

```javascript
// 读取世界数据（推荐写法）
const data = await loadJSON("data/世界名_items.json");
_items = data.items || [];
```

不要使用 `fetch()` 直接调用，也不要使用 `XMLHttpRequest`。统一走 `dataService.js` 的好处：
- 路径自动处理（相对于项目根目录）
- 错误处理统一
- 将来切换后端存储只需改一个文件

---

## 让世界物品出现在商店页

如果想在「主神空间·商店」页面同时展示各世界物品，在 `scripts/shop.js` 的 `loadShopData()` 中加入：

```javascript
// 加载星际迷航物品（合并到商店页）
try {
  var td = await loadJSON("data/star_trek_items.json");
  if (td && td.items) {
    // 这些物品会出现在商店页，标记为 [星际迷航]
    // 不需要额外代码，shop.js 的 merge 逻辑自动处理
  }
} catch(e) { /* 忽略 */ }
```

然后在 `filterShop()` 中，这些物品会被自动标记 `_world = "星际迷航"` 并显示在商店列表中。

---

## 最佳实践

1. **命名规范**：世界名用英文小写 + 下划线，如 `wuxia`、`star_trek`
2. **数据文件**：统一放 `data/` 目录，文件名 `{世界名}_items.json`
3. **JS 文件**：复杂世界单独建 `scripts/world_{世界名}.js`，简单世界可以直接写在 `shop.js` 中
4. **内联默认值**：在 JS 中提供 fallback 数据，避免 JSON 文件加载失败时页面空白
5. **颜色主题**：每个世界使用不同的主色调（蓝色 #0096ff、红色 #ff6b6b、紫色 #b388ff 等）
6. **CSS 前缀**：世界专属样式使用 `.world-{世界名}` 前缀，避免冲突
