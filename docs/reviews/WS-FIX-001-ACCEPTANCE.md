# WS-FIX-001 · 主控复审

2026-11-06。范围仅Library同路径切换Campaign后的左栏上下文与版本清理（P1），不扩大到P2排版或其它后续能力。

## 结论

**WS-FIX-001：accepted，P1关闭。** 未发现需要返回DSH的阻断修复。原WS批次通过结论见WS-BATCH-MAIN-REVIEW.md，本次补充不将P2、失败UI、390 AR、真实平台、15秒片或正式AR审稿认定为已完成。

### 补充复审：新增证据事故披露

用户后续披露DSH在17:05回归时重写旧WS证据：`workspace-integration/ws-001/`4张、`ws-002/`8张截图。主控读取当前12文件mtime，确认均在2026-11-06 17:05（Asia/Shanghai），已记录当前SHA/bytes；原字节身份未验证，不称已恢复。证据见本轮新目录`supplemental-evidence-incident.json`。

**限定原结论：P1功能accepted保留；DSH本次交付的证据隔离要求未满足，初始DSH报告遗漏此事故，现已追加披露。** 上表“20个文件未变”仅覆盖主控独立复测期间的保护清单和17:11提交根，不覆盖此前DSH17:05回归，也不能证明旧WS截图未被覆盖。AS/FLOW旧事故与此次12张WS截图覆盖是不同记录，不合并掩盖。

当前源码SHA和buildId仍与已通过11项浏览器复测的版本相同，本次不重复运行。P2排版保持未做。未知/非法上下文仍由侧栏携带原参数：页面诚实报错、不回退A，本次按非阻断后续记录，不擅自将错误态导航降级或自动纠正成A。

后续运行回归时，设置EVIDENCE_ROOT并不足以证明隔离：旧WS spec仍有硬编码输出目录，必须逐一确认支持该参数，或采用主控此次的隔离副本及新outputDir；不得直接重跑写旧路径的spec。当前没有进一步测试任务，不自动启动改动。

## 代码审查

- AppShell的ReactiveSidebar直接使用响应式useSearchParams派生href，同pathname query变化不再依赖pathname effect。局部Suspense未包住整个业务编辑器；无轮询、history覆写或新存储。
- Library从只读listCampaigns解析所选Campaign版本，切换清理旧versionId/sessionId和预览；All/Clear分别按规格清理；明确非法版本不自动更正为A，缺版本的B解析为1.0.0。
- workspace-routes/useCampaignWorkspace及核心写命令未修改。源文件SHA与DSH提交记录匹配；本轮仅检查和新证据，不修改业务代码。

## 本轮独立执行

| 检查 | 结果 |
|---|---|
| npm run typecheck | exit 0 |
| WS-FIX-001定点E2E | 2 passed |
| navigation + legacy connected-flow E2E | 9 passed |
| pageerror | 所有11项测试附加独立监听与断言，0 |
| 真实select | A→B，点击前href已是B/1.0.0；进入Atelier、刷新、Back、Deliverables均保持B；B→C→A及AR同步通过 |
| 清理与异常 | 旧精确引用在换Campaign后清除；All无Campaign/版本；Clear仅/library；未知Campaign/非法版本诚实报错；B缺版本自动解析1.0.0 |
| 只读 | 前后sessions/exports/social聚合计数一致，未因浏览/切换创建业务记录 |
| 截图 | 实际查看本轮Library B及Deliverables B截图，B自身内容/缺项状态正确，未借SERENITY视频或文案 |
| 保护检查 | 20个源文件/媒体/提交证据的SHA及mtime前后不变，提交源码hash匹配 |

使用工作区已有生产构建`EyeTyB_09phuk7IAEkABn`，独立临时3184端口与新浏览器context，服务测试后退出；本轮未重build，不把DSH build结果写作本轮执行。

测试为原三份spec的隔离副本：仅调整证据根并加pageerror断言，不改变原业务断言。全部输出在`evidence/product/workspace-integration/ws-fix-001/main-review-2026-11-06/`：fix.log、regression.log、result.json、immutability-check.json及6张新截图。未覆盖DSH的run-2026-11-06T1711证据。

## 保留项

- P2排版未做，本次不作新增视觉精修通过声明。
- 失败/Retry真实UI、390 AR、15秒片/AR正式审稿等保留原状态，不自动启动。
- 之前WS批次覆盖历史证据的事故继续以WS-BATCH-DSH/MAIN-REVIEW披露；本轮20文件未变检查只证明此次复审未新增覆盖，不证明历史原字节已经恢复。
- 本结论是主控P1验收；用户报告的task-28 completed不等同外部任务系统已由本轮修改。仓库验收登记已同步，无自动后续派发。
