> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 测试策略

当前实际执行的是参考HTML浏览器探针与规划结构自检。以下为实施阶段必须提供的测试，不代表已经运行。

| 测试 | 可重复输入 / 断言 | 阶段 |
|---|---|---|
| Replay Determinism | 固定seed，1/2/4倍速、seek不同路径，相同t业务hash一致 | M2 |
| Seek & Restore | 30→5→20、刷新、旧snapshot schema拒绝 | M2 |
| Parallel Session Isolation | 两session游标独立、不同namespace不可读写 | M2 |
| Run Lifecycle | worker kill/租约重领/失败3次/重试，无重复可观察效果 | M2 |
| Browser Independence | 关闭全部浏览器5分钟，Feed继续有持久tick | M2 |
| Campaign Idempotency | 相同key并发10请求返回同ID；不同body同key409 | M3 |
| Opportunity Mapping | 地区、商品、来源、证据快照与Brief一致 | M3 |
| Score Contract | 80/85/90/70=82，缺值score=null，前端无第二算法 | M3 |
| Asset Versioning | 编辑/回退生成新版本，旧sha256不变 | M4 |
| Offline Preset | 断外网仍能运行场景、文案、字体/图片与视频模板 | M4/M5 |
| AI Failure Honesty | provider503不自动preset；显式切换后标Preset | M4 |
| Approval State Machine | 不合法状态409，批准后改内容不覆盖 | M5 |
| Scheduled Post | 精确批准version、时区、并发冲突、到期一次执行 | M5 |
| MP4 Verification | ffprobe1080×1920/15s/30fps、450帧，完整decode/浏览器播放 | M5 |
| Reset Isolation | namespace A重置不影响B和品牌资产；旧worker结果不能复活 | M6 |
| Playwright E2E | A全链两次、B/C短链、刷新、下载文件非空且可解码 | M6 |
| Visual Regression | 同浏览器字体DPR/视口/seed/时间；人工对照HTML与已验收页面 | 每个前端任务 |

前端主尺寸1440×900、1366×768、1920×1080，移动390×844；补200%缩放与Reduced Motion、键盘、EN/AR。截图不能用CSS隐藏错误、来源标记、缺图来“过关”。自动diff仅检测回归，语义/构图仍由主控查看。只更新受影响基线，基线改动附批准理由。

规划命令约定：`npm run typecheck`、`npm run build`、`npm run test:unit -- <spec>`、`npm run test:e2e -- <spec>`；后端`python -m pytest backend/tests/...`；TASK-001负责创建对应脚本。所有输出记录命令、版本、exit code、失败日志与截图路径，不把计划命令放到“已通过”。
