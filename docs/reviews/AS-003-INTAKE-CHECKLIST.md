# AS-003 · SERENITY A 1.1.0 内容接收与绑定检查单

日期：2026-11-05。用途：主控/执行者按此顺序接收、校验、发布、绑定。**新A内容已到并获主控内部Demo接入批准**，依据`SERENITY-A-1.1.0-CONTENT-INTAKE.md`；使用其中指定规范接收副本。发布/绑定/整站验收仍由原DSH续作，本检查单不是整批通过记录。

## 1. 交付物（缺一不可）

manifest、events、expected属于下面十份JSON，不是额外三份。现成Hero/identity/MP4已经在仓库和网页制作资料包中，按引用复用并检查真实字节；不向用户重复索取或要求重新制作。实际提供片仍走sidecar，不作为规划15秒VideoEntry的伪造完成媒体。

- 十份 JSON：`brand / discovery / analysis / script / video / delivery / events / assets / expected / manifest`。
- 真实媒体：SERENITY hero（2560×1440）、白底 identity（2000×2000）、Logo；如需海报/字幕按内容需要，不伪造 MP4。
- 作者说明：EN/AR 脚本、内容推理、缺失资产说明、校验说明（如提供）。
- 目标身份：`scn-scent-layering` v`1.1.0`，`product.serenity`，EN/AR 新版本（如 `en-v2`/`ar-v2`）；旧 `1.0.0` 原样保留。

## 2. 内容规则（主控预检）

1. 15 秒四镜头概念脚本仍按冻结 `scenario.schema.json`；不得把用户提供的 **10.08s/720×960/3:4** 视频写成 15s/9:16 的 VideoEntry 或“脚本实时生成”。
2. 不得把旧 OUD/PERLA 包仅换图/字符串替换当 SERENITY；旧稿/旧 session/旧导出只作历史。
3. `authoring.reviewStatus` 保持 pending，不自行改成 reviewed；不新增客户未提供的产品/成分/容量/功效声明。
4. 十 JSON 文件名与 Schema 不变；`manifest` 记录真实字节 hash；媒体引用须存在且 hash 匹配。
5. 15 秒概念 VTT 与 Provided 10.08s 片不挂同一字幕；不伪造 poster/封面。

## 3. 接收与校验（建议命令）

```powershell
# 1) 解压/归档到 content-inbox 接收区（原样保留 zip 字节）
# 2) Schema/语义/引用/媒体/hash/回放前缀校验
node scripts/poc/validate-content-only.mjs --dir scenarios/scent-layering/1.1.0 --report evidence/product/assets/as-003/serenity-content.json
# 3) 类型与现有回归
npm run typecheck
npm run test:unit -- tests/poc/product-read.test.ts tests/poc/product-assets-api.test.ts
# 4) 如需角色/媒体交叉检查，复用现有 validator 与 assets.json report
```

校验通过标准：L1/L2/L4 与语义、events/expected checkpoints 通过；缺媒体/坏引用/错误 hash 必须失败；L3 静态规则通过，实际回放 L3/L5 视内容执行。

## 4. 发布与版本索引

- `scenarios/scent-layering/1.1.0/**` 与 `apps/web/public/content-scenarios/scent-layering/1.1.0/**` 逐字节一致；媒体到 `apps/web/public/scenario-media/scent-layering/1.1.0/**`。
- 更新 `apps/web/public/content-scenarios/catalog.json`：新增 A 1.1.0 `content_ready` 条目，`packageHash` = manifest 真实字节 SHA-256；旧 1.0.0 条目保留为历史。
- 如缺 `version-index.json`，由 AS-003 创建并记录 1.0.0/1.1.0 显式版本关系；默认 A 选择 1.1.0，旧 1.0.0 仅显式历史读取。
- 仅主控审核通过后，将 `design/presentation-assets/scent-layering.json` 与 public 副本 `contentStatus` 改为 `bound`；不得提前绑定。

## 5. 绑定后必须重验的页面/API

- Overview：保留已通过的用途优先及identity→Hero→视频预览布局；机会/Brief/Campaign 指向新 1.1.0，旧 OUD/PERLA 不再作为默认 A 内容。不得恢复旧素材仓库式首屏或重新打乱三阶段顺序。
- Campaign Brief：SERENITY identity/hero（白底图只作 identity），Brief/analysis/推荐理由为 1.1.0 内容；不再显示旧产品字段。
- Atelier：默认结果预览含 EN/AR、四镜头、identity、Provided 视频（3:4 contain/controls/无 autoplay/无未对齐 VTT）；编辑脚本不更新视频。
- Library：Hero/identity/video 三类 ProvidedAsset 可筛选/预览；已保存 1.1.0 版本立即可见；旧 1.0.0 仅历史。
- Deliverables：EN/AR 版本选择、含 Hero/identity/原 MP4 的 campaign pack（`noVideo:false`）、独立 MP4 下载；旧包原字节可重下；模拟邮件仍次级。
- 矩阵：补齐 119 行中剩余 AS 控件（AS-SHOT/AS-VIDEO-PLAY/SEEK/REPLAY/AUDIO/ERROR、AS-LIB-TYPE、AS-HANDOFF-EXPAND），扩展/更新后重跑 `product-matrix-dom.spec.ts` 与 `product-as-audit.spec.ts`。

## 6. 最终验收前置

- [ ] AS-003 报告 + 校验 JSON + 发布目录/hash 证据
- [ ] AS-004 报告（Overview/Brief/Atelier/Library 资产面 + 1440/1366/AR/390 截图）
- [ ] AS-005 报告（含 MP4 的 ZIP 标准解压、bytes/hash、`noVideo:false`、旧包原字节）
- [ ] AS-006 报告（完整 119 行矩阵 DOM/click/媒体/跨页/视觉；1440/1366 + AR/窄屏；实际播放与 ZIP/MP4）
- [ ] 主控实际看图、试主路径、打开真实 ZIP/MP4 后才可 accepted

## 7. 明确禁止

- 用旧 OUD/PERLA 素材/文案冒充 SERENITY；只换图不换内容；把 10 秒提供片伪填 15 秒原 VideoEntry；称实时生成/真实邮件发送；为通过验收伪造截图、hash 或 NOT_RUN 为 PASS。
