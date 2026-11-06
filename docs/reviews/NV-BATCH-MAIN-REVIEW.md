# NV-001 / NV-002 / NV-003 · 主控集中复查

2026-11-05。**结论：changes requested，暂不accepted。** 已完成实际构建、核心测试、浏览器运行和截图对照。仅两项常见编辑/交付错误阻断本批验收，集中修复见`tasks/poc/fixes/FIX-NV-BATCH-01.md`；无需重做架构、内容或等待视频。

## 主要发现

### R1 · P1：确认框与实际交付快照不一致

位置：`apps/web/components/poc/ContentOnlyFrame.tsx:878–890,969`。Subject/Body/收件人修改仅置deliveryDirtyRef；两个模拟按钮不检查脏稿，弹窗取当前表单收件人，而simulateContentDelivery读取旧已保存draft。

实际复现：保存主题`[SIMULATED] MAIN SAVED SUBJECT`，随后未保存改为`[SIMULATED] MAIN UNSAVED DISPLAY SUBJECT`，首位收件人改为`changed-recipient@lavish-demo.invalid`；确认按钮仍启用，弹窗显示新地址，确认后记录和ZIP却是旧主题及`brand-review@lavish-demo.invalid`。这是普通编辑路径，不是边缘并发情况。

应在有任何交付脏稿时要求保存/明确丢弃后才可确认；弹窗主题、正文、收件人和附件全部绑定同一个已保存revision，提交也确认此revision。失败模拟同样受此规则约束。

### R2 · P2：已丢弃的脚本内容被保存回来

位置：`ContentOnlyFrame.tsx:805`以及saveScript对draftContentRef的读取。Discard edits只恢复React state，未同步恢复ref，saveScript优先读旧ref。

实际复现：预置标题`Your Scent, Your Expression`改为`MAIN DISCARDED TITLE MUST NOT RETURN`→Discard edits（画面恢复原题）→Save new version，新版本再次出现已丢弃标题。需要统一可见表单/命令输入快照，同步state/ref；同时检查Discard and leave/版本切换后的丢弃逻辑，不能将脏稿标clean但仍提交其内容。

独立主控浏览器探针与JSON：`evidence/poc/nv-main-review/recheck.cjs`、`recheck-results.json`；实际错误ZIP：`main-stale-delivery.zip`。探针截图仅记录复现，不以快速截图中的动画/滚动拼接现象判断产品视觉缺陷。

## 代码备注（同批小范围清理，不增设独立关卡）

`domain/content-only.ts:73`出现`as unknown as Asset[]`，`api/scenario-source.ts:49`出现`as unknown as ContentPackageInput`，与FAST_04禁止双重断言的约束不符。移除无必要资产cast，使用合法判别字段/类型谓词；loader在已有实际输入验证边界解析为真实新类型，不能以断言自称已校验。不要为此新建大型验证框架或修改冻结Schema。注释称video data已清空，但实现保留原video数组，也应改成准确说明“规划元数据保留、API禁止执行”。

## 已通过的实际检查

- `generate-content-types.mjs --check` exit0，`npm run typecheck` exit0，生产`npm run build` exit0。
- 主控重跑8文件128项单元/核心回归全过（含旧状态机/API/storage/replay/media验证技术测试）。
- 主控启动生产页面，重跑完整Playwright共39项全过，包含三场景开始、EN/AR派生稿保存/刷新、确认、四镜头、模拟失败/成功、ZIP下载、回放、Home导出/reset、现有组件/主题/壳体。
- 三场景主控重跑`validate-content-only.mjs`：均L1–L4 PASS；前两步16事件前缀检查点通过；每场5真实媒体/2待收媒体。报告在`evidence/poc/nv-main-review/*-validation.json`。
- 公开的30份JSON与网页端接收副本逐字节相同；原完整Schema和Tokens哈希未变，未捏造MP4/poster。
- 实际打开两份测试ZIP和主控错误路径ZIP，标准ZIP解压/CRC通过，四项附件bytes/SHA与记录一致，脚本/字幕/邮件/README/回执可打开，没有MP4/poster。通过的是文件一致性；R1说明文件可能一致地装入错误旧稿，不能靠hash通过推导业务正确。

首次沙箱构建遇Windows路径访问限制、媒体回归遇沙箱Chromium缓存不存在；使用宿主已有环境重跑后全部通过，不作为产品缺陷，也未改依赖/配置。

DSH原始提交证据在复跑前保留至`evidence/poc/nv-main-review/dsh-submitted/`；主控浏览器复跑截图/文件另存browser-rerun。未覆盖DSH原报告或此前主控报告。

## 视觉检查

实际查看本轮生产浏览器截图，对照`evidence/reference/reference-1440x900.png`与DESIGN_SYSTEM。Home、分析AR、分镜、交付1440/1366的暖白/黑色壳体、金色点缀、正文可读性与统一控件基本一致，未改成另一套SaaS视觉。没有假视频播放器或真实发信暗示。编辑与实际交付错误未闭合，故本批和M1完整内容Demo仍不宣称通过。

非阻断备注：顶部/分镜重复技术说明偏多；分镜只取首张asset，A的双商品镜头未呈现PERLA参考图；Logo被扩到整块图片区域，建议限制到约147 CSS px；AR编辑字段未显式dir/lang（仅分镜字幕有dir），建议按语言设置并隔离Latin名称/ID。这些可在同批顺手改善，不要求为它们另开大改版或额外浏览器矩阵。

## 后续

执行FIX-NV-BATCH-01，补能真实抓住R1/R2的浏览器测试和对应截图；类型/构建及受影响内容测试运行一次即可，无需再次全量39+128。修复完成主控只复查受影响路径，再决定accepted。视频、原完整媒体验收仍deferred，不能重新阻塞文案Demo。
