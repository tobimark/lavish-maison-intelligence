# AS-003-DSH · 接收 SERENITY A 1.1.0 内容并绑定

日期：2026-11-05 · 状态：发布/绑定/查询验证完成，等待主控集中验收（不自行 accepted）

## 来源与发布

- 唯一来源：`content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0`（主控接收报告 `docs/reviews/SERENITY-A-1.1.0-CONTENT-INTAKE.md`）。
- 十 JSON 原字节发布：
  - `scenarios/scent-layering/1.1.0/**`
  - `apps/web/public/content-scenarios/scent-layering/1.1.0/**`
  - 两处与接收副本逐字节一致；逐文件 bytes/SHA 与 manifest 全部匹配。
- 场景媒体发布 `apps/web/public/scenario-media/scent-layering/1.1.0/**`：
  - `lavish-logo.png` 114,691B `f504781a…f3966`
  - `serenity-hero.png` 2,513,070B `1c4e337b…b37499`（2560×1440）
  - `serenity-product-original.png` 538,290B `f75fa10b…026af62`（2000×2000）
  - `serenity-concept-en-v2-15s.vtt` 237B、`serenity-concept-ar-v2-15s.vtt` 264B
  - 两项 15s video/poster 仍为 pending，未伪造文件；10.08s 提供片仍只走 sidecar。
- catalog：新增 A 1.1.0 `content_ready` 条目，`packageHash=709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d`；旧 1.0.0 条目保留历史。
- 新建 `apps/web/public/content-scenarios/version-index.json`：`defaultVersion=1.1.0`；1.0.0 标记 historical/explicitOnly。
- `product-queries` 默认按 scenario 选择最高版本（1.1.0），旧 1.0.0 仍可通过显式 scenarioVersion/session 读取；未删除旧 session/导出。

## 绑定

- 先验证查询确实返回新 A 1.1.0（3140 生产构建：Overview/Atelier/Brief 标题与产品均为 SERENITY，无 console/page error；`evidence/product/assets/as-003/query-probe.json`）。
- 验证通过后，`design/presentation-assets/scent-layering.json` 与 public 副本 `contentStatus` 改为 `bound`；两副本 SHA 一致 `72D02286D4320916095D097756359C2F2AA37A2B5AB7CBBAE714C498B880C3A4`。
- 首页 awaiting 单句消失；Brief/Atelier 读取的新 A 对象与 identity/Hero/video 均为 1.1.0/SERENITY。

## 命令与真实 exitcode

| 命令 | exit | 结果 |
|---|---:|---|
| `node scripts/poc/validate-content-only.mjs --dir scenarios/scent-layering/1.1.0 --report evidence/product/assets/as-003/serenity-content.json` | 0 | L1/L2/L3/L4 pass；contentRunnable=true；5 real / 2 pending |
| `npm run typecheck` | 0 | 通过 |
| `npm run test:unit -- tests/poc/product-read.test.ts tests/poc/product-assets-api.test.ts` | 0 | 17 passed（默认 A 1.1.0 未破坏读视图） |
| `npm run build` | 0 | 生产构建通过（随后用于 3140 查询验证） |

证据：
- `evidence/product/assets/as-003/serenity-content.json`、`validate.log`
- `evidence/product/assets/as-003/typecheck.log`、`unit.log`、`build.log`、`build-after-AS004.log`
- `evidence/product/assets/as-003/query-probe.json`
- `evidence/product/assets/as-003/brief-before-AS004-1440.png`、`atelier-before-AS004-1440.png`

## NOT_RUN / 已知限制

- 新 A 的完整页面/跨页/ZIP/矩阵验收属 AS-004..006；本任务仅发布/绑定与查询验证。
- 核心 15 秒影片与 poster 仍为 pending（作者声明未制作）；提供片仍为独立 10.08s 预览，不挂 15s VTT。
- 旧 1.0.0 OUD/PERLA 包保留原字节/历史 session/导出，不重标 SERENITY。
- 作者 `reviewStatus=pending` 保持；AR 母语/对外广告审稿不在内部 Demo 接收范围。
