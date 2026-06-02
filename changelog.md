# 穿越团 TRPG 终端 · 更新日志

> 本文档基于代码实际状态与 git 历史重建, 非实时记录. 部分日期为近似值.
> 最后更新: 2026-06-02

---

## v2.0 (2026-05-31) — 架构重构

### 数据层

- 数据文件从单体 `characters.json` 拆分为 `data/characters/{name}.json`, 共 12 个独立角色文件
- 引入 `world_registry.json` 世界注册表, 支持动态世界发现
- 商店数据重组: 按世界分目录存放, `data/worlds/mainspace/items.json` (22KB) 和 `data/worlds/jianxia/items.json` (10KB)
- 新增 `dataBundle.js` + `buildDataBundle.js` 内嵌数据包机制, 将数据打包到 JS 变量中, 绕过 `file://` 协议下 fetch() 的 CORS 限制
- 新增 `dataService.js v2.1`, 实现"无服务器模式": 加载优先级 `localStorage` → `window._CROSSING_DATA`, 写入走 `localStorage`
- 角色文件支持保存/删除, 服务器模式作为可选通道

### 新增功能

- **穿越者凭依系统**: 基因锁等级/开关/熟练度, `geneLockProfs` 分阶存储
- **疲劳值自定义标签**: 8 个预设 (疲劳值/查克拉/真气/灵能/死灵精华/魔力/怒气/法力)
- **角色选择弹窗**: 支持多角色加载, 全选/取消全选
- **角色管理**: 导出/导入/保存当前角色/删除角色
- **背景特质效果字段**: `bgEffects` 子字段 (personality/traits/ideals/bonds/flaws)
- **DM 面板增强**: 单角色发放, 目标选择, 批量导入, 显示/隐藏角色
- **衍生属性扩展**: 新增警惕值(vigilance), 意志(will), 幸运(luck), 悟性(enlightenment)

### Bug 修复

- `navigateTo` 增加 `jianxia` 页面路由处理, 剑侠页面可正常加载
- 成就点路径统一: `property.mainAp` 双向读写, 消除旧版 `wealth.achievePoints` 断裂
- 经验值字段统一为 `xpMax`, 兼容旧版 `xpNext` 字段
- `statusDetail` 缺失时自动 fallback (默认: 人类/学生/未转职)
- 商店加载增加 4-item 硬编码兜底, 替换旧版 5-item 逻辑
- 商品展示不再被 `if (window.electronAPI)` 门控阻塞

### 基础设施

- `main.js`: 最小化 Electron 壳 (21 行, 无 IPC 通道)
- `server.js`: HTTP 读写服务器 (GET 静态文件 + POST `/api/data/` + DELETE `/api/data/`)
- `package.json`: 引入 electron + electron-builder, 新增 `buildBundle`/`pack`/`dist` 脚本
- 工具脚本: `importCharacters.js` 和 `importShopItems.js` 用于数据迁移
- 遗留问题: `preload.js` 仍未创建, Electron 上下文隔离未启用

---

## v1.0 (2026-05-30 前) — 初始版本

### 架构

- Electron 壳 + 原生 JavaScript SPA, 无框架, 无构建工具
- 4 个页面路由: main(主界面), character(角色面板), shop(商店), dm(DM 面板)
- 角色创建功能嵌入在 character 页面内, 无独立 creation 页面
- 单体 `characters.json` 文件存储全部角色数据
- 商店数据分两个文件: `shop_items.json` (25 件商品) 和 `jianxia_items.json` (剑侠世界商品, 实际为空)
- DM 模式通过 `body.dm-mode` CSS 类切换

### 角色面板功能

- 身份信息区: 姓名/血脉/种族/职业/等级
- 基础属性区: 力量/敏捷/体质/智力/感知/魅力
- 衍生属性区: HP/MP/攻击/防御/速度/负重/经验值
- 状态区: HP 条/疲劳值/经验值
- 技能面板: 6 大类别 (通用/武学/术法/生活/通用专长/种族专长)
- 背景信息: 可编辑文本域
- 装备栏: 武器/防具/饰品槽位

### 商店功能

- 商品卡片展示 (名称/价格/属性/背景故事)
- 关键词标签筛选
- 购买操作 (扣除成就点)

### DM 面板功能

- 角色列表展示
- 属性分发 (扣除成就点)
- DM 模式视觉切换

### 已知问题 (v1.0 遗留)

- `xpNext` vs `xpMax` 字段不兼容, 经验值始终显示为 0/100
- `characters.json` 缺少 `statusDetail` 字段, 血脉/种族/职业下拉选择无法持久化
- 成就点路径断裂: 写入 `wealth.achievePoints`, 读取 `property.mainAp`
- `file://` 协议下 `fetch()` 被 CORS 阻止, Electron 壳未配置相应豁免
- 商店不显示剑侠世界商品, `fetch` 调用位于 `if(window.electronAPI)` 门控内
- DM 视图存在异步加载时序问题
- 剑侠页面路由未注册, `navigateTo` 缺少对应 handler, 页面无法加载
- `jianxia_items.json` 商品列表为空

---

## 附录

### 数据文件清单

| 路径 | 说明 |
|------|------|
| `data/characters/*.json` | 12 个角色数据文件 |
| `data/worlds/mainspace/items.json` | 主神空间商品 (22KB) |
| `data/worlds/jianxia/items.json` | 剑侠情缘商品 (10KB) |
| `data/world_registry.json` | 世界注册表 |

### 运行方式

- `npm start` — Electron 直接启动 (含内嵌数据包)
- `node server.js` — HTTP 服务器模式 (浏览器访问)
- `npm run buildBundle` — 重新生成内嵌数据包
- `npm run dist` — 打包为 Windows exe
