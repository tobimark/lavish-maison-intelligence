# ChatGPT 场景生产与交接规范

这是内容生产接口，不授权 DeepSeek自行填充营销故事。先交 A：Scent Layering，经内容与文件验收后再按相同契约交 B/C。三套最终均完整四步。业务内容文件目前未收到，不创建貌似完成的空包。

## ChatGPT 可直接使用的生产指令

> 请为 Lavish Perfumes 制作 Scent Layering 的完整演示场景。先阅读 docs/POC_SCOPE.md、docs/SCENARIO_DATA_CONTRACT.md、contracts/poc/scenario.schema.json、docs/POC_EVENT_PROTOCOL.md、docs/POC_STATE_MACHINES.md、docs/POC_MEDIA_RULES.md 和已核实的 docs/BRAND_ASSETS.md。输出十个独立 JSON 文件及素材需求/缺项清单，schemaVersion=1.0.0、scenarioId=scn-scent-layering。信号均为模拟，不声称当前真实趋势；分析应展示从证据→假设→受众→产品匹配→营销概念→Brief→四镜头15秒脚本的可检查业务依据。提供完整EN和AR脚本文案、镜头画面、旁白、画面文字、时码字幕、CTA和交付邮件。品牌与商品只使用已核实事实，不能虚构香调、文化背书或产品图。所有对象ID互相闭合，事件顺序与预期checkpoints一致。明确不确定性和人工本地化待审项。交付收件人为模拟身份，邮箱只用.invalid。实际素材未知时列入缺项清单，不伪造文件、哈希、MP4或权利许可；未完整则只是内容草案，不宣称runnable。严禁调用真实采集、LLM、视频生成或邮件发送服务完成运行流程。

以上“不要调用LLM服务”指 POC 工程与运行时；ChatGPT 本身按此指令事先生产内容正是用户指定接口。不得将这种离线内容生产标成演示时实时AI调用。

## 交付结构

```text
scenarios/
  catalog.json
  scent-layering/1.0.0/
    manifest.json
    brand.json
    discovery.json
    analysis.json
    script.json
    video.json
    delivery.json
    events.json
    assets.json
    expected.json
apps/web/public/scenario-media/scent-layering/1.0.0/
  ...真实MP4、封面、产品图片、Logo副本、字幕...
```

luxury-gifting/oud-storytelling 使用相同布局。仓库 `scenarios/catalog.json` 仅登记三套 awaiting_content，不虚构版本文件。内容草稿/素材清单可放 `content-inbox/<slug>/`，禁止运行时自动读取。测试专用包在 `tests/fixtures/poc/`，title和metadata标TEST_ONLY，永不进入public/catalog。

## 内容生产顺序

1. 输入核验：产品事实、Logo、授权素材、目标受众/渠道；不知道的明确列缺项，不自行“补全”。
2. 写模拟信号和证据说明；分析逐条引用，区分观察、假设与推荐。结论不能超出提供的证据，不能把预设主题都写成增长。
3. 完整 Campaign Brief；EN/AR四镜头脚本，镜头/字幕累加15000ms；AR人工审稿状态必须记录在 limitations，未审核不可声称客户已批准。
4. 素材需求单：每个 assetId 的用途、镜头ID、尺寸/时长、产品事实与权利要求。文字脚本不等于已经有成片。
5. 收到实际 MP4 后复核画面、字幕、Logo、产品身份、脚本时码，登记精确脚本版本及 SHA-256；内容变化发布新版本，不靠改metadata宣称视频同步。
6. 定义模拟收件人、完整主题/正文/附件列表、成功及可恢复失败样例；明确模拟时间、attempt与回执，无真实投递ID。
7. 按状态机写 events 与 expected；生成文件清单及真实字节/哈希；交主控内容审查与校验器。

## 接收状态

awaiting_content → received（仅暂存，不上线）→ validation_failed 或 ready。ready需要：十文件齐全、schema/引用/事件/媒体五层PASS、业务依据审核、素材与品牌审核。程序检查能确认时长/文件，却不能确认脚本与画面语义一致；必须主控实际看视频与内容，记录在 `evidence/poc/content/<slug>-review.md`。

初版无完整包：可运行验证器负向测试、建设无业务文案的布局实验；业务原型等待 A。开发不能把测试夹具改名当客户内容来绕过门禁。
