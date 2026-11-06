# FIX-NV-BATCH-01 · 主控复查通过

2026-11-05。**FIX-NV-BATCH-01 accepted并关闭；NV-001 / NV-002 / NV-003集中accepted。** 范围限当前用户指定的content-only Demo：三场景、情报/分析/脚本/分镜、文案包模拟交付与导出。视频制作、MP4/poster及完整视频链验收继续deferred；不宣称客户最终批准或AR母语审稿完成。

## 原问题关闭依据

**R1关闭**：Subject、Body、收件人编辑统一设置dirty；成功/失败模拟按钮均禁用并提示先保存。丢弃交付修改恢复已保存数据；普通邮箱不能借旧.invalid稿确认。确认弹窗展示已保存稿revision、主题、收件人、正文和附件，提交使用同一draftRevision。主控实际运行了“旧稿→修改但未保存→禁止确认→保存v2→取消→失败→重试成功→实际ZIP”的浏览器路径。

对实际下载ZIP解压/CRC与附件SHA检查：revision=2，主题`[SIMULATED · CONTENT ONLY] Browser delivery saved v2`，首位收件人`changed-recipient@lavish-demo.invalid`；邮件文本、attempt快照和脚本ID对应，没有旧未保存主题。五项真实文件可打开，无MP4/poster；记录明确noVideo/noRealEmail。

**R2关闭**：restoreActiveScriptDraft统一恢复state/ref及选中ID；直接Discard edits、Discard and leave和脏稿切换版本均使用恢复逻辑。主控浏览器测试修改标题/镜头文字/字幕后丢弃，再保存、刷新，仍是恢复后的值，没有丢弃内容复活。通过弹窗离开/返回、切换AR后保存刷新也通过。

相关类型清理通过代码复查：有效资产类型收窄去掉双重断言；未知JSON在loader中经结构守卫后再adapt，不直接强转新包类型。守卫明确只作受控已发布内容的客户端边界，不能替代完整构建时Schema/语义验证；此限制已记录，不新增基础设施门禁。规划视频数据保留的注释已准确修正，执行仍被profile阻止。

## 本轮实际验证

| 检查 | 主控结果 |
|---|---|
| npm run typecheck | exit0 |
| npm run build | exit0，修复后的生产构建 |
| 受影响content-only/content-delivery单元测试 | exit0，2文件9项通过 |
| 两份内容Playwright spec | exit0，7项通过，独立3112端口启动本次构建 |
| 两个实际下载ZIP | 标准解压/CRC、4附件bytes/SHA、邮件/attempt/script关系通过 |
| 完整Schema、content-only Schema、Tokens | 与冻结SHA一致 |
| 三场景30份作者JSON | 与接收内容逐字节一致 |

本轮不重复已通过128项基础回归及39项全量浏览器测试；那些记录保留在NV-BATCH-MAIN-REVIEW。实际复跑的7项包含三场景入口、编辑确认/刷新、分镜、模拟交付/取消/失败重试、导出、回放与reset、两条缺陷回归及390布局。

主控查看了实际复跑生成的1440未保存状态、保存v2确认弹窗、1366交付布局截图；与此前通过的HTML视觉方向/统一组件一致，修改未破坏可读性或操作层级。此前非阻断视觉备注继续保留，不为此新开阻断轮次。

## 证据与范围

主控证据：`evidence/poc/fix-nv-batch-01-main/main-verification.json`、`browser-rerun/`。DSH提交时证据已保留到同目录`dsh-submitted/`；原报告、上一轮主控错误探针与ZIP没有覆盖。未将旧recheck.cjs的exit0当通过依据。

M1主控核心视觉/操作门禁按**content-only原型范围**通过；不等于旧完整视频或全部历史业务页面已验收。没有部署到外部站点、没有运行视频或发送真实邮件；当前只同一浏览器本地持久化。AR客户审稿、Firefox/WebKit、公开视频广告许可等仍未验证，均非本轮阻断。

本轮只完成验收和状态更新，没有启动下一开发任务。以后若恢复视频，应另按原完整媒体契约接收并验证，不能因本次accepted放宽视频guard。
