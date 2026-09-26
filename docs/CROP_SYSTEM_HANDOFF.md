> Historical handoff only. The separate Supply Lab and its files were removed at the user's request. Current gameplay and acceptance are defined in [ACCEPTANCE_SIX_CROPS.md](ACCEPTANCE_SIX_CROPS.md). References below to `/supply`, `supplyUnits.ts`, and the Python script describe removed code.

# 六作物系统：合作者接口与改动指南

本次底版为已上传 GitHub 的 `origin/dev`，提交 `f1ebfe4`。改动仅在本地，未提交或推送。保留原正式游戏 `/game`；容量模型在 `/supply`。两者现在共享作物 ID、周期、素材元数据，但**资源与产量算法尚未合并**。

## 1. 单一配置源

`src/data/crop-catalog.json` 是六作物唯一配置源。TypeScript、Python、选种卡、图鉴和正式游戏下拉列表均读取或派生它。

| 稳定 ID | 名称 | 周期 | 电 | 水 | 温控 | 农业收成/批 | 样本/批 |
|---|---|---:|---:|---:|---:|---:|---:|
| lettuce | 生菜 | 2 | 2 | 1 | 1 | 10 | 0 |
| radish | 萝卜 | 2 | 2 | 1 | 1 | 12 | 0 |
| chili-pepper | 辣椒 | 6 | 4 | 2 | 1 | 35 | 0 |
| potato | 土豆 | 7 | 4 | 2 | 1 | 90 | 0 |
| soybean | 大豆 | 7 | 4 | 2 | 1 | 50 | 0 |
| arabidopsis | 拟南芥 | 3 | 1 | 1 | 1 | 0 | 1 |

每座温室采用相同的种植面积假设。生菜/土豆部分比值沿用前序实验参考，不能将整行称为实测。其他作物为暂定平衡值，均在 `evidence` 与 `evidenceNote` 中标注。拟南芥周期与样本点数也是游戏设定。

字段：
- `label` / `labelEn` / `subtitle` / `description`：显示文案。
- `role`：`food` 或 `research`。研究植物不能有食物或农业收成。
- `cycle`：正常供给下所需生长回合。
- `power` / `water` / `thermal`：容量模型每回合需求。
- `yield`：容量模型每批农业收成点数；`researchYield`：每批样本份数。
- `legacyFoodValue`：仅供旧网络模拟器使用的食物转换系数，不是 kcal。
- `sensitivity`：旧接口保留参数；现有旧生长公式暂未使用它，不要声称调整它会改变生长。
- `artColumn`：上传六列作物素材中的列号，0–5；与 ID 对应，禁止按可选项数组位置猜列。
- `evidence` / `evidenceNote`：来源可信程度及假设说明。

更改数值后更新 `balanceVersion`。更改字段结构、单位或状态含义时提升 `schemaVersion`，同时补迁移方案与测试。不要为了通过测试而盲目更新预期结果。

## 2. 依赖方向

```text
crop-catalog.json
  ├─ cropCatalog.ts（类型、校验、只读注册表）
  │    ├─ supplyUnits.ts（容量回合模拟）
  │    ├─ crops.ts（旧模拟兼容视图）→ simulation/crops.ts
  │    └─ content/crop-art.ts、CropPicker、AgricultureSprite、正式选种UI
  └─ scripts/supply_simulation.py（独立校验脚本）
```

配置不得反向导入 UI、Phaser 或 GameState。UI 不计算作物生长或收成。渲染只消费状态与回合报告。

## 3. 公共 TypeScript 接口

从 `src/data/cropCatalog.ts` 导入：

```ts
import {
  CROP_CATALOG, CROP_IDS, isCropId, requireCropId,
  CROP_SCHEMA_VERSION, CROP_BALANCE_VERSION,
  type CropId, type CropDefinition,
} from './src/data/cropCatalog.ts';
```

`CropId` 由 JSON 键派生，禁止在组件里再写一套 union。`GameState` 中原 `CropKind` 保留名字，但已经是 `CropId` 的别名。任何外部输入先过 `isCropId` 或 `requireCropId`。

容量模型 API，位于 `src/game/simulation/supplyUnits.ts`：

```ts
newSupply(config?: SupplyConfig): SupplyState
chooseSupplyCrop(state: SupplyState, greenhouseIndex: number, crop: CropId): SupplyState
resolveSupply(state: SupplyState): SupplyReport
```

- 都返回新状态，不修改输入。
- `config.crops[index]` 是当前作物；`nextCrops[index]` 是预约作物或 `null`。
- 当生长进度为 0 时选种立即生效；否则只预约，成熟结算后切换。
- 选择与当前相同的作物取消预约。
- 生长进度由最弱的水、电、温控供给比例决定；成熟后自动采收，下一回合新批次生长。
- `harvested[index]` 累计农业收成；`research[index]` 累计样本。切换作物不清零历史。
- `SupplyReport.harvest` 与 `researchHarvest` 为本回合两类产出；`next` 为新状态。
- `coverage` / `growth` 用于 UI 预览。预览调用不提交 `next`，不能偷偷推进回合。
- `balanceVersion` 不匹配则拒绝旧状态，要求重置。界面刷新会新建状态，目前无中途存档。
- 温室数组顺序决定农业分配优先级；如增加拖动排序，必须同步重排所有按温室索引的状态数组。后续多人开发如需插入/删除温室，先升级为稳定 greenhouse ID 再开放中途增删。

示例：

```ts
let state = newSupply({ solar: 3, recyclers: 1, thermal: 2, batteries: 1, crops: [...CROP_IDS] });
state = chooseSupplyCrop(state, 0, 'radish');
const report = resolveSupply(state);
state = report.next;
```

## 4. 给 UI / 美术合作者

- `CropPicker`：传入 `state`、`index`，监听 `onChoose(crop)` 与 `onClose()`。不要自行写产量公式。
- `AgricultureSprite`：传 `crop: CropId`，素材列来自注册表。当前图片是物种示意，不代表精确生长阶段。
- `content/crop-art.ts` 保留旧图鉴 API，由注册表派生；无需手工维护第二个清单。
- `/supply` 地图点温室或卡片点“选择作物”打开六种选项；“六作物展示”预设便于验收。
- 科研作物显示“科研样本”，不能标成可食收获或用样本补足农业目标。
- 全局正常供需预览不承诺未来灾害、局部优先级或电池状态；页面明确提示。

## 5. 给模拟 / 后端合作者

- 正式 `/game` 仍走 `resolveTurn`；六种作物均能选择，周期由统一表提供。
- 旧食用收获仍按建筑 `baseYield` 和环境系数算，不等于 `/supply` 的每批 `yield`。兼容层在 `src/data/crops.ts`，不要把两模式的点数直接混用。
- 旧模拟器对拟南芥返回 `{yield:0, food:0, research:n}`；独立累计到 `production.researchCumulative`，旧状态缺失时按 0 处理。
- 样本写入 `RESEARCH` 事件、AI `productionMetrics.researchSamples`、数据库既有 `summary_json.state.researchSamples`，不需要新增数据库列。
- `strategy_json` 记录作物 schema/balance 版本。历史记录保留原貌，旧版小麦没有自动转换成大豆。恢复运行时遇到未知 ID 会拒绝；新导入功能必须让用户明确映射或重开。
- 原排行榜仍按旧规则计分；样本目前只独立展示，不影响通关/排行榜。若加科研任务，新增独立目标，不借用食物产量字段。
- 本次没有接入未合并的其他 GitHub 分支；合并农业 slot 分支时，请保留 `CropKind` 别名、统一列表和科研分流，按槽位保持相同行为。

## 6. 数值校准与测试入口

标准三温室示例变为生菜/大豆/土豆：正常总耗电 16、供水需求7、温控4；12回合基线农业收成200点。本版实验目标调整为180点，给少量延迟留空间。拟南芥会占设施能力却不贡献农业目标，这个取舍直接显示给玩家。

```sh
npm run typecheck
npm test
npm run test:crops
python3 scripts/supply_simulation.py
```

测试覆盖六种成熟、拟南芥不产粮、科研收获后预约换种、旧模拟科研分流、容量参考局、缺供、旧小麦 ID 拒绝。

当前不含：容量模式 AP、建造预算、应急抢救、真实逐小时供电；正式游戏的10回合旧规则未被静默改成12回合。应在模式合并任务中明确处理。
