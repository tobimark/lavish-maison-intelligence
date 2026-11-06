# Lead review artifacts · Interactive Mock Product (FAST_05)

2026-11-05。主控独立复核证据。本目录不属于 DSH 提交的 ip-00x 证据，用于记录主控在 DSH 提交后的实际验证。

## 内容

- `zip-revalidation.json`：主控重跑产品 E2E 后，对 `evidence/product/ip-007` 与 `ip-008` 的 6 个真实 ZIP 做内容级复核。
  - 6/6 `allChecksPass=true`：EXPORT.json 附件 manifest（bytes+sha256）、脚本版本/语言/标题、VTT cue、四镜头 storyboard、真实媒体与源 assets.json hash、无 MP4/poster、Draft/Confirmed 披露。
  - `byteIdenticalToAudit=false` 是预期差异：Playwright 重跑会重新生成 ZIP（导出时间/ID 不同），归档字节与 DSH 提交时 `zip-audit.json` 记录的 sha 不再逐字节一致。DSH 原始审计保留为历史；本文件记录当前字节与内容核对结果。

## 背景

- 主控为独立确认 30/30 产品 E2E，重新运行了 7 个 product spec；Playwright 按固定路径重写了 `evidence/product/ip-007/ip-008/ip-009` 中部分 ZIP/截图。
- 原始归档字节未单独备份（主控备份置于 `test-results/`，被 Playwright 运行清理）。因此以内容级复核 + 披露代替字节还原。
- 该重跑没有影响 DSH 的矩阵/截图主体（`ip-009/01–36` 由独立脚本生成，未被产品 spec 覆盖）。

## 其他主控记录

- 完整审查结论：`docs/reviews/IP-BATCH-MAIN-REVIEW.md`
- 证据覆盖事故与恢复：`evidence/product/ip-009/evidence-incident/`
- 主控实测：dev `http://localhost:3000` 与 prod `http://localhost:3100` 的六路由加载、NAV 6 / SHELL 4 / OV 8 个 `data-control-id`、typecheck/build exit 0。
