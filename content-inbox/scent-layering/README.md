# Scent Layering · ChatGPT 内容交接草案

2026-11-05。**内容推演已交付；媒体未齐，未发布、非 ready。** 本目录不会被运行时加载，不能直接复制为已验收场景。用户已确认产品图可取自官网，广告 MP4 后续提供；本轮不制作或调用视频生成服务。

## 已交付

- `1.0.0/`：manifest、brand、discovery、analysis、script、video、delivery、events、assets、expected 十份 JSON。
- `1.0.0/media/`：两张未经修改的 2000×2000 官网产品原图、原 Logo 副本、EN/AR 两份实际 VTT。文件字节与 SHA 已登记。
- `VIDEO_DELIVERY_BRIEF.md`：可直接用于后续 MP4 制作/选片的四镜头、文案、时码和交付要求。
- `author-draft.mjs`：本草案的离线作者文件；确定性重建 JSON/字幕/副本/来源回执，不接入应用、不联网、不生成视频、不改变 catalog。

## 业务依据

概念：**Your signature. In layers.** 面向 UAE 成年香水爱好者，邀请探索 LAVISH OUD 与 PERLA 的个性表达；这是创意假设，不是已测试的叠喷配方。

| 模拟输入 | 分析含义 | 决定 |
|---|---|---|
| layering-guide：希望有易理解的叠喷介绍 | 用清楚、短促的解释降低理解成本 | 15 秒、四镜头、文字引导；不讲未经验证的喷洒比例 |
| personal-signature：个性香气表达 | 以个人选择为创意切入 | “Your signature”主题，不承诺混合后的具体气味 |
| gifting-control：稳定的礼赠对照 | 不将所有关注话题都判为上涨 | 本轮聚焦自我表达，礼赠保留为对照与后续场景 |
| 官网两款产品描述 | oud/spice/floral 与 floral/fruity/musk 可构成叙事差异 | 保持官方商品身份；无持香/效果/销售提升宣称 |

图表为特意设计的两条 synthetic index（30→58 与约42的稳定对照），只解释 Demo 内部为何选题，不是采集量、百分比、真实增长或当前市场事实。证据没有伪造真实账号、帖子链接或客户原话。模拟窗口为 2026-10-22 至 2026-10-30，所有历史时间均明确为虚构演示时间。

## ID 与演示路径

统一前缀 `scn-scent-layering`，版本 `1.0.0`。主链为：

`signal/trend → analysis.layering-opportunity → brief.signature → script.en-v1 → video.en-v1 → delivery.review-pack → record.simulated-success`。

25 条事件覆盖 0–50000ms 虚拟时间。阶段结束游标为 7/14/21/25；0 为初始状态。五个 expected 检查点由叙事边界独立列出，再用现有 reducer 对照通过；没有从 reducer 输出反写 oracle。

AR 脚本与字幕完整，但待本地化审查；官方产品名保持拉丁写法。**英文是唯一 entry 视频版本。** AR VTT 仅作为独立草案，不绑定到英文视频，不暗示已有阿语成片。英文黄金路径不以阿语视频为前置。

回放中的 script.confirmed / delivery.queued 为预置示例；操作模式仍必须要求用户确认脚本与模拟交付，不能由回放替代。`delivery.records` 的 attempt 1 成功属于黄金回放；attempt 2 失败是单独 failureCase 示例，不是同一回放中实际发生的第二次发送，邮件/收件人/结果全部 Simulated。

## 待补项及接收方式

1. 客户提供与 `script.en-v1` 对应的 MP4，规格见制作说明；当前 `signature-en.mp4` 只是目标文件名，实际不存在。
2. 匹配的竖屏 poster；可随片提供，或收到并查看实际影片后从该片导出。不用产品图冒充视频帧。
3. 收片后登记真实 bytes/SHA/媒体参数和来源/项目使用范围，复核四镜头、字幕、产品与 Logo。若现成片与本草案不同，应共同调整脚本/素材绑定，而不是仅改 metadata 假称一致。

`assets.json` 中 MP4/poster 的 bytes/sha256 为 null、rightsStatus 为 pending，刻意不满足 runnable Schema；这是诚实的缺项标记，不是应由 DSH 用虚假值“修复”的错误。manifest 绑定的是**当前草稿文件**真实哈希；收到媒体并改稿后须重新生成。

## 校验结果与后续 DSH

执行：

```powershell
node content-inbox/scent-layering/author-draft.mjs
node scripts/poc/validate-scenario.mjs --dir content-inbox/scent-layering/1.0.0 --replay --report evidence/poc/content/scent-layering-draft-validation.json
```

现有校验结果：L2 PASS、L3 PASS（真实 reducer 对照五个检查点）；L1 FAIL（两项待收媒体的六个缺项字段）；L4 FAIL（未向 public 发布的七项媒体路径）；L5 NOT_RUN。退出码1符合草稿状态，不能宣称完整包通过。来源图片本地已实际查看；字幕/副本存在不等于公网媒体已验证。

收到媒体前，POC-006 保持 awaiting_content，无需重跑框架验收。收到后以本草案补齐包并执行 `tasks/DSH_HANDOFF_DEMO_FAST_03.md`：集中接收、接线、浏览器操作与视觉审查，不要求再开发一套架构。不发布 TEST_ONLY 夹具，不调用真实外部服务。
