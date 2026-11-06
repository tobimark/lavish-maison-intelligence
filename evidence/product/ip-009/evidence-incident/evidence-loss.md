# IP-BATCH-FIX-01 · evidence/m1/shell 不可恢复证据清单

检查时间：2026-11-05T18:33:31.8064960+08:00

## 结论

`evidence/m1/shell/**` 的原始 M1 shell 证据（7 张截图 + browser-report.json）在 IP-009 回归运行 `shell.spec.ts` 时被覆盖（18:26）。已对全工作区做归档副本搜索：目录名含 submitted/backup/archive/m1/shell，`**/*.zip` 内条目，任意位置的 `shell-*.png` / `browser-report.json`。**未找到任何可恢复的原始副本**；因此不重拍旧 UI、不伪造原图，仅保留覆盖后状态归档。

## 被覆盖文件（当前大小与 18:26 mtime；原图不可恢复）

| 文件 | 当前 bytes | 当前 mtime | SHA-256（覆盖后状态） |
|---|---:|---|---|
| browser-report.json | 2850 | 2026-11-05 18:26:05 | a9583f9c7bcf7e447f33e739c4d7e329a8c4dfe065b508abf3412102402faf67 |
| shell-1366x768-default.png | 128816 | 2026-11-05 18:26:02 | 147964a1c2eb06fc2ee21fafdbf99cd27339bb3d70ed1cff3019b538702377b7 |
| shell-1440x900-collapsed.png | 130658 | 2026-11-05 18:26:04 | 72f8bc282bb6d5aff944f41aecdce70cf103df9569107236d8e089a97ffabc10 |
| shell-1440x900-default.png | 153310 | 2026-11-05 18:26:01 | 9afdbd75079fa8a771f22782047034b0fc26cebdb0f7d910bd13003a346d91be |
| shell-1440x900-focus.png | 154241 | 2026-11-05 18:26:04 | 1f1c20c73514c90f9d3e3eace42660ea52991baa301d9db3e79000eb6cfde496 |
| shell-1920x1080-default.png | 168617 | 2026-11-05 18:26:00 | 727c39117734f5a65b9b7c7930e4c5a2a51a5360fb7dfbf09f9317f8483aebec |
| shell-390x844-default.png | 72203 | 2026-11-05 18:26:02 | f5d7872f96205630c6ccfb975b97864d18c7e3bf277a131309f40571eeb5b316 |
| shell-390x844-menu-open.png | 41348 | 2026-11-05 18:26:05 | 56d2fa3b167dd20d81c6a8f7894f8ec1b15b1d3e8f7404d38e8e0c2a7e50835a |

## 覆盖后状态归档（非原始证据）

- `evidence/product/ip-009/evidence-incident/overwritten/m1-shell/`：本次覆盖后的 8 个文件原样副本，附 `archive-manifest.json`（bytes/sha256/mtime）。

## 搜索记录

- 全工作区目录：命中 `submitted` 目录仅 POC-005-007 / POC-008 / TASK-006 / fix-nv / nv-main-review，均不含 M1 shell 文件。
- 全部 `.zip`（<20MB）条目：无 `shell-*` / `evidence/m1` / 匹配 browser-report 的 M1 条目（含 `deliverables/LAVISH_POC_PRODUCT_REVIEW_KIT.zip`）。
- 任意位置 `browser-report.json`：仅 `evidence/m1/shell`、`evidence/m1/theme`、`evidence/reviews/TASK-006/**`（后两者为不同任务，未覆盖）。
- 任意位置 `shell-*.png`：仅 `evidence/m1/shell` 当前 7 张（覆盖后版本）。

未删除任何文件；本清单只记录事实，不冒充恢复。
