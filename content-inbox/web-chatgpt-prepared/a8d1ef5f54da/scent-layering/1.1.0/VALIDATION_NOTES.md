# A 1.1.0 · 作者侧校验说明（未接受 / NOT READY）

**版本:** `scenarioId=scn-scent-layering`, `scenarioVersion=1.1.0`, `schemaVersion=1.0.0`。  
**Manifest 实际文件 SHA-256:** `e5c8c67df98e162050f7a4c164a100c64e851df18eda4fa7e0118288c4216297`。该指纹是本次生成的 `manifest.json` 实际 UTF-8 字节散列，不是外部原始素材的假设哈希。  
**Producer:** ChatGPT · `authoring.reviewStatus=pending`。

## 结构化作者校验
- 十份 JSON（顶层恰好十份）：存在、版本/场景一致，manifest 准确引用其余九份的实际 bytes/SHA。
- 用附件冻结的 JSON Schema 2020-12 定义（不改变 Schema）检验所有十份 JSON。
- 结果：九份 JSON 严格 Schema 通过；`assets.json` 仅 6 项预期不通过，全部属于 **未提供的15s概念影片/海报** 两行的 `bytes=null`、`sha256=null`、`rightsStatus=pending`。**不能当作严格 Schema PASS**。
- 全局 Entity ID 无重复；类型化业务引用有效；manifest entryBrief/script/video/delivery 可解析为同版本新实体。
- `script.en-v2`、`script.ar-v2` 均四镜头连续覆盖 0–15000ms；每个字幕在范围内，VTT 文本与脚本一致。
- 28 事件 sequence 连续、虚拟时间非递减、阶段开始顺序 discovery→analysis→video→delivery；包括可见实体扩展在内的五个 expected checkpoints 与事件输出静态核对一致。
- 核心已提供素材及原创字幕的实际 bytes/SHA 与 `assets.json` 一致；三份用户提供文件的复制件与原始资料包 byte-for-byte 一致；sidecar 未改写。
- 原始logo、两个新PNG图像尺寸已由图像解码核对。Provided MP4 由 ffprobe 独立核对 10.08s/720×960/H.264；先前上游浏览器报告是附件原有证据，**不是我本轮对产品 UI 的 Playwright 复验**。
- 作者层 45 项检查全部通过、零额外异常；原始报告在 `evidence/A_1.1.0_AUTHOR_VALIDATION_REPORT.json`，位于十份 JSON 的内容目录之外。

## 尚未执行 / 不得标通过
- 冻结 Schema 对缺失核心影片/海报的上述六项是 FAIL，非已解决问题。
- 同一工程 POC-003/005 Reducer、状态门禁、可重放确定性测试：**NOT_RUN**（此包不是完整可运行仓库）。
- 对新内容的实际 HTTP、浏览器媒体播放、seek、ZIP 导出、UI/sidecar 绑定：**NOT_RUN**。
- 已提供 MP4 的脚本逐镜头对应检查：**NOT_VERIFIED**，且媒体长度/画幅明确不匹配。
- 阿拉伯语母语审校、品牌法务、公开广告素材/音乐授权：**PENDING**。
- DSH 实现的 `AS-004-DSH.md`、`FAST_06` 综合验收：**NOT_RUN / NOT ACCEPTED**，本包不能改变其状态。

## 交付与主控交接
1. 请先在主控仓库用当前校验器对新 `1.1.0` 十 JSON 做静态复核，并检查 `brand.products` 只含 `SERENITY`。
2. 将真实 media 复制到 `public/scenario-media/scent-layering/1.1.0/`，将三份 Provided assets 放入原 sidecar 所引用的 `/provided-assets/scent-layering/1.0.0/` 路径。不要转码或重绘。
3. 检查 `design/presentation-assets/scent-layering.json` 已指向 1.1.0 与 `scn-scent-layering.product.serenity`，但仍 `contentStatus=awaiting_serenity_content`；主控在内容审查后决定绑定状态，内容作者不代为批准。
4. 在自由探索的 Overview/Opportunities/Brief/Atelier/Deliverables 中让用户看到 SERENITY 的单品商业叙事、原图和10.08秒已提供预览，并清楚标注模拟来源与独立提供的视频。
5. 核心 15 秒视频或 poster 的缺失不能挡住其他页面/导出接线；但严禁说完整冻结十文件包已经 strict runnable。
6. 用户已经认可的首页修正**保持通过结论**，该工程会话的 DSH 可继续推进；本包不修改代码、不发出 accepted 指令。
