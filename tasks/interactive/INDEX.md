> 当前：IP-001..009 已实现，功能链路经主控独立验证通过；不单独accepted，移交FAST_06与AS任务合并验收。依据docs/reviews/IP-BATCH-MAIN-REVIEW.md，保留现有实现，不重写；条件控件DOM审计随AS-006/IP-009补齐。下方初始ready/planned为规划历史，registry.json为当前状态。

# Interactive Mock Product任务目录

2026-11-05。范围/API/页面已由主控冻结；仅IP-001 ready，其余按实现依赖同批放行，未自动派发。

| Task | 目标 | 依赖 |
|---|---|---|
| [IP-001](IP-001.md) | 统一只读产品查询与业务投影视图 | NV基础已accepted |
| [IP-002](IP-002.md) | 显式编辑上下文与独立内容包导出 | IP-001 |
| [IP-003](IP-003.md) | 六主路由、Overview与统一导航接线 | IP-001, IP-002 |
| [IP-004](IP-004.md) | Radar自由筛选、热点证据与Agent活动 | IP-001, IP-002, IP-003 |
| [IP-005](IP-005.md) | 三营销机会与可解释策略详情 | IP-001, IP-003 |
| [IP-006](IP-006.md) | Atelier结果预览与按需编辑版本 | IP-001, IP-002, IP-003 |
| [IP-007](IP-007.md) | Creative Library统一内容浏览与版本定位 | IP-001, IP-002, IP-003, IP-006 |
| [IP-008](IP-008.md) | Deliverables真实导出与次级模拟交付 | IP-001, IP-002, IP-003, IP-006 |
| [IP-009](IP-009.md) | 全站点击矩阵、跨页一致性与产品视觉验收 | IP-003, IP-004, IP-005, IP-006, IP-007, IP-008 |
