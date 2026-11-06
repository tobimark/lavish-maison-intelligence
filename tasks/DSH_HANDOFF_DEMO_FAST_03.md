# 下一批 · A内容接收与现有页面接线

POC-008首页/四步空态框架已主控accepted，M1完整业务视觉未通过。当前A包未到，POC-006状态awaiting_content；不要继续制作空面板或随机填业务结果。

## 输入到齐后的执行指令

> 收到ChatGPT Scent Layering十JSON和匹配媒体后，按POC-006接收，同时补接现有POC-008框架；遵循DEMO_DELIVERY_POLICY快速集中交付。读取POC-008-ACCEPTANCE、Scene Contract、页面规格和既有API/domain，不重新设计架构。校验使用--replay接入真实L3；媒体检查实际执行，缺失项诚实记录。发布已接收的静态包，给scenario-source提供loadPackage，保证ready条目能真正createSession。browser-api使用会话相对虚拟clock处理排期，不将Date.now直接当作场景毫秒。把A真实信号、分析、Brief、脚本、视频与模拟交付元数据填入现有四步页面；移除重复技术解释，保持HTML设计系统和Mock/Pre-produced标识。先跑通现有已实现动作，实际试Start/Continue、四步导航、回放与刷新、脚本确认、视频播放/下载及会话Export/Reset；不要宣称尚未实现的编辑/交付操作完成。最后给主控一个可重复操作的入口和桌面截图，集中review。不要自行accepted，不把客户实际素材缺失换成TEST_ONLY视频。

## 允许文件

沿用POC-006文件白名单；另允许apps/web/demo/poc/api/scenario-source.ts、apps/web/components/poc/browser-api.ts、HomeDashboard.tsx、WorkflowFrame.tsx、home.module.css、workflow.module.css、apps/web/public/scenarios/**（仅已接收包）、apps/web/tests/poc-prototype.spec.ts；新证据evidence/poc/scenario-a-integration/**、报告docs/reviews/POC-A-INTEGRATION-DSH.md。

不改公共Schema/设计系统/domain/依赖，不发布测试夹具或调用真实外部服务。若需要修改既有API以连接相对clock，明确列出具体调用问题由主控扩白名单，不自行增加第二套状态机。

## 验证

运行typecheck、build与相关浏览器核心测试；场景文件运行POC-006规定的--replay、媒体检查及合并报告。没有实际包时本批不启动，只列缺项；前端框架已通过，不需要为等待内容再做一轮技术审计。
