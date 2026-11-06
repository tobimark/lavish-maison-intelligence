# DeepSeek 交接单 · Fully Mocked POC

本轮仅启动 **POC-001**，完成后提交主控review并停止。本交接单不等于已远程派发。

## 直接复制给DSH

> 执行 tasks/poc/POC-001.md。先读 PROJECT_CONSTRAINTS.md、docs/POC_SCOPE.md、docs/SCENARIO_DATA_CONTRACT.md、contracts/poc/scenario.schema.json及任务Context。实现标准Schema校验、十文件装配/静态语义规则与公共类型生成，严格遵守Files白名单、Acceptance Criteria、Test Commands及DoD。四步全部Mock，不调用真实平台/LLM/视频生成/邮件服务；不自行生产客户营销场景，最小合成测试夹具只放tests并标TEST_ONLY。不要恢复旧TASK-005或008–014，不修改Tokens、DESIGN_SYSTEM与公共契约。需要改变契约时报告主控。运行实际测试，交付文件变化、命令/exitcode、错误定位、媒体缺项及NOT_RUN，写docs/reviews/POC-001-DSH.md。仅提交review，不自行accepted，不启动下一任务或业务页面。

## 后续顺序

- POC-001主控通过后，才实施POC-002媒体检查及POC-003状态机。
- TASK-007已有提交，主控独立复查；不直接接受下游PASS结论。
- POC-006等待ChatGPT完整A包和真实匹配媒体，不补写假数据。
- M1/POC-009实际视觉门禁通过前，不启动POC-010及以后的业务UI。

[任务总目录](INDEX.md)中的16项任务均含目标、依赖、读取/修改白名单、功能/视觉/数据契约、验收、测试、失败条件、DoD与完整Prompt。
