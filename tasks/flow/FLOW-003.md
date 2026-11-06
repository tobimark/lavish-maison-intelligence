# FLOW-003 · 视频＋文案的社媒帖子与模拟发布

## Goal / Dependencies / Context

用真实社媒帖子形态结束营销主链。依赖FLOW-001、FLOW-002；阅读CONNECTED_MARKETING_FLOW、SOCIAL_MOCK_CONTRACT、DESIGN_SYSTEM、旧NavigationGuard/编辑保存修复及Deliverables实现。

## Allowed Files

- apps/web/components/product/journey/social/**（新增，Journey第四段）
- apps/web/components/product/journey/**（仅Social模块接线）
- apps/web/app/campaigns/[campaignId]/social/[attemptId]/page.tsx（新增内部模拟帖子详情）
- apps/web/components/product/deliverables/**（同Campaign的模拟帖子记录入口，邮件保持次级）
- apps/web/tests/product-social-publish.spec.ts；docs/reviews/FLOW-003-DSH.md；evidence/product/connected-flow/flow-003/**

## Functional / Visual Specification

第四段左侧选择EN/AR发布文案、Edit/Save/Review和明确Instagram模拟账号，右侧同视频+caption+hashtags/CTA帖子预览。预置可直接看，显式Edit/Review才prepare稿。真播放、真实Save与刷新，确认框必须显示已保存的准确语言/文案/视频，未保存不能发布旧稿；缺script确认提供Review creative入口走既有机制，不能代替用户确认。

按契约Simulate publish，成功后立即显示内部模拟帖子卡、时间和View simulated post，刷新可看；编辑创建新revision不改旧帖子。错误保留稿和实际Retry，不提前成功。只有Instagram一条实做路径，别的平台不放假按钮。标Simulated、No content was sent to Instagram；不加真实平台链接或假统计。视频不裁切为9:16，不为社媒重新生成视频。

同页清楚展示“将发到哪里、发什么视频、配什么文字、当前做了什么”；编辑字段与预览统一16/14px，按钮统一位置；不以发送日志开场。Download pack沿用AS-005作为辅助，不能拿邮件回执/下载完成替代模拟社媒记录。

## Data / Acceptance / Tests

所有读写走FLOW-001统一MockApi，post snapshot与已审阅draft同revision/hash/语言/视频。Preview不写状态，选择EN/AR不覆盖另一稿。检查Review后修改需重新审阅、重复点击不重复发、发布后改稿不改旧帖、侧栏返回保留已保存数据。与脚本确认/版本及现有guard一致。

```powershell
npm run typecheck
npm run build
npm run test:e2e -- product-social-publish.spec.ts
```

## Deliverables / Failure / DoD / Prompt

交可运行UI、真实帖子/确认/历史截图和操作测试报告。仅toast/假发布按钮、发错稿、需要实际账号/密钥、假外部成功均未完成。最终A整链等待内容，但可先完成测试与页面接线；不自行accepted。

> 执行FLOW-003，把同一视频与EN/AR发布文案做成可编辑、可审阅、可模拟发布的Instagram帖子。使用原生视频、统一MockApi/本地状态及NavigationGuard。准确快照、保存刷新、历史不可变，成功只在本地记录提交后显示，明确无真实平台发送。第一条主链走通即可，不增加平台连接/广告预算/日历/假效果数据。提交实际截图与核心操作验证。
