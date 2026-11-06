# POC 契约交付记录 · 2026-11-04

本次根据用户最新要求将项目转为四阶段Scenario-driven Fully Mocked POC。没有修改产品页面/组件、没有启动DSH、没有声称TASK-007或M1通过。

## 已交付

- 最终四阶段范围及浏览器内MockApi架构；全部外部平台/LLM/视频生成/邮件服务排除。
- 十文件Scene Data Contract、JSON Schema 2020-12总Schema与十个文件入口；稳定ID/关系/版本/字节hash。
- 统一MockApi方法/错误/幂等/并发/存储约束、事件discriminated union、四阶段状态机。
- ChatGPT完整场景生产接口、真实媒体引用/校验/下载规则、三场景awaiting_content目录。
- 四步页面详细规格、端到端和实际视觉验收门禁、16项DSH原子任务及首批交接单。
- 旧TASK-005与008–014已冻结；旧完整系统契约保留历史标记；TASK-006验收保留，TASK-007登记已提交待复查。

## 校验边界

`node scripts/poc/check-plan.mjs`验证结构引用、任务DAG、任务字段、目录状态与主题哈希，结果在evidence/poc/plan-validation.json。`node scripts/validate-baseline.mjs`验证参考/文档链接/任务字段等，结果在evidence/baseline-validation.json。

这些检查不是完整JSON Schema标准验证、场景内容验收、运行时测试或视觉验收。标准Schema校验器、场景静态/运行语义检查和实际媒体检查按POC-001/002/005实现。当前无完整场景数据，因此无法宣称ID引用、视频可访问、业务推演或脚本画面匹配已通过。

## 现在可以交DSH

只执行tasks/poc/POC-001.md，交接入口tasks/DSH_HANDOFF_POC_01.md。主控review通过后再推进002/003；A包和媒体到齐并校验后再启动有限视觉原型。后续业务UI继续受M1/POC-009门禁限制。
