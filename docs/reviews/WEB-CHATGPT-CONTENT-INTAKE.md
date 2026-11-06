# 网页端三场景草案 · 主控接收复查

日期：2026-11-05。结论：**三套内容草案已接收，非媒体结构与回放可用；完整场景未accepted/ready。** 不要求网页端返工整包，下一关键输入是A的匹配MP4。客户可先只交A，B/C视频不阻塞A黄金路径。

## 接收与归档

- 输入：`D:/下载/Lavish_All_Three_Scenarios_DRAFT_v1.0.0.zip`，5,322,845字节，85项。
- ZIP SHA-256：`be3d777ab2e27db5b44671267ef3f6056a42ac27b2f11d1e779f96469352556a`。
- 原样归档：`content-inbox/web-chatgpt-received/be3d777ab2e2/`。
- 整理后接收副本：`content-inbox/web-chatgpt-prepared/be3d777ab2e2/<slug>/1.0.0/`。
- 网页端作者脚本没有执行；附件说明仅作为待审资料。未覆盖旧本地A草案、公共Schema、Tokens、业务UI、public或catalog。

归档Schema与仓库冻结Schema逐字节相同。解压检查路径位于接收目录内，没有将附件contracts/tools写回工程目录。

## 实际校验结果

| 场景 | 十JSON | L2引用/entry链 | L3事件及真实reducer检查点 | 本地已交媒体 | 待收 |
|---|---|---|---|---|---|
| Scent Layering | 齐全 | PASS | PASS，28事件、5检查点 | 5文件核对通过 | EN MP4、poster |
| Luxury Gifting | 齐全 | PASS | PASS，28事件、5检查点 | 5文件核对通过 | EN MP4、poster |
| Oud Storytelling | 齐全 | PASS | PASS，28事件、5检查点 | 5文件核对通过 | EN MP4、poster |

实际执行现有 `scripts/poc/validate-scenario.mjs --dir <prepared-path> --replay --report <evidence-path>`，调用项目同一TypeScript领域reducer，不仅采用作者的Python检查声明。manifest文件绑定检查未报坏哈希。每套cursor0及四阶段结束（9/16/24/28）的期望投影通过，共15个检查点。

本地额外核对了15个实际媒体文件：每场Logo、OUD原图、PERLA原图与已核实工程原件逐字节相同；图片解码/尺寸、文件字节/SHA一致；EN/AR VTT的四条字幕文本与毫秒时码匹配各自脚本。VTT合法NOTE块不计为字幕。AR仅审稿字幕，没有伪造AR成片或错绑EN视频。

**完整报告仍是L1 FAIL、L2 PASS、L3 PASS、L4 FAIL、L5 NOT_RUN，runnable=false，命令退出1。** 每场剩余13条：缺MP4/poster的6个Schema字段（null bytes/sha、pending rights）以及未发布public的7个媒体URI。后者含草稿media中已有的5文件，不能解读为Logo/产品图/字幕未收到。没有实际MP4就不能完成编码/浏览器播放/seek/下载/画面语义验收。

证据：`evidence/poc/content/web-chatgpt-be3d777ab2e2/`，包括原样接收校验、整理后校验、`intake-local-media.json`及作者报告原件。

## 已处理的小问题

三套均多放了一个 `VALIDATION_REPORT.json` 在只允许十份JSON的包目录，原样运行触发UNEXPECTED_FILE。接收副本把这三份辅助报告移至上述证据目录的`authoring-reports/<slug>/`。十份客户JSON、Markdown、媒体字节未改，manifest指纹未变；整理后已复跑确认额外文件问题消失，无需网页端重新推演。

`CONTENT_INDEX.json`中的`/mnt/data/...`是网页端工作环境路径，不能作为本机或运行时位置。后续工程以本报告的prepared路径接收，不改包内ID/URI来适配磁盘。

## 内容审阅与限制

A概念“Your Scent, Your Expression”：模拟个性表达/叠喷信号→两款已核实描述的创意对照→探索式四镜头，不承诺经过测试的混合效果。B“A Gesture, Considered”：用PERLA讲礼赠心意，不杜撰礼盒SKU、服务、折扣、节日需求。C“Let the Scent Lead”：围绕OUD官方简要香调叙事，不虚构产地、传承或文化背书。三套不是只替换标题，模拟序列各有稳定/不确定对照；事实与假设、Mock披露明确。

英文四镜头与阿语文本已阅读；AR仍需母语/客户复核，本轮不声称已完成正式本地化验收。三套AR message/caption较通用、部分对外文案带较长内部免责声明，可在后续网页内容迭代中润色；不作为当前接收阻断，不由DSH擅改业务故事。UI保留清楚的Mock标识并避免重复技术说明。

成功黄金回放引用预置attempt=2的成功记录，attempt=1失败作为独立failureCase数据，时间轴没有伪造一条未发生的失败事件；它们不是实际会话发送历史。运行时的交付attempt由真实本地操作独立从1分配，不能把包内attempt直接冒充本次已重试记录。

收片时必须同步处理草案中的“planned/pending/not supplied”等描述，包括video disclosure、邮件正文及authoring limitations；不能仅填哈希就显示影片已经完成。保持网页端内容为作者来源；若实际影片不同，明确匹配并修订脚本/VTT/manifest，不在metadata中假称一致。

## 下一步

用户提供A的`scent-layering-en-15s.mp4`（15秒、1080×1920、H.264、对应本次四镜头脚本；目标30fps以实际探测为准）。封面可同交或收片后提取。精确分镜/字幕起止以prepared目录中的`VIDEO_DELIVERY_BRIEF.md`与`script.json`为准，不能继续沿用旧本地A草案的不同时间线。

随后按既有POC-006/DSH_HANDOFF_DEMO_FAST_03集中完成媒体接收与现有页面接线；无需再做一轮独立架构审计。reviewStatus仍pending，catalog仍awaiting_content，POC-006未启动；未验收实际业务页面或M1完整主链。
