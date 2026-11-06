# POC-002 主控复查 · changes_requested

2026-11-04。裁决：**不 accepted，先执行FIX-POC-002-01再复查**；POC-003不启动。未修改媒体工具/公共Schema/设计或产品页面。

## 实际验证

- npm run typecheck：exit0。
- npm run test:unit -- tests/poc/media-validation.test.ts：本机环境exit0，14 passed，15.89s。首次沙盒执行4通过10失败，原因为Chromium缓存路径不可见，非媒体代码缺陷；已使用本机已安装浏览器重跑，没有为此安装新浏览器。
- 独立浏览器/HTTP/解析探针：evidence/poc/reviews/POC-002/main-probe.mjs、main-probe.json。探针只用TEST_ONLY技术媒体与本地服务，不涉及客户视频或业务视觉验收。

## 阻断验收的问题

### P1：播放检查把seek后的时间当作播放推进

scripts/poc/verify-media.mjs的videoMetadata在seek到13500ms后调用play，再以currentTime>0.02判定played。独立探针用真实Chromium加载/seek技术MP4，仅将play替换为立即resolve且不播放；工具仍返回played=true。检查必须比较播放开始前后的时间增量或解码帧推进，不能以绝对时间替代。未实际推进应报VIDEO_PLAYBACK_FAILED。

### P2：同一主机不同端口被当作同源

fetchAsset只检查目标hostname是否在LOCAL_HOSTS，没有比较origin。独立探针从127.0.0.1一个端口302跳到另一个端口，第二服务实际收到2次请求，工具errors=[]、asset status=pass、exit0。契约要求同源，scheme/host/port均须一致；须在跟随之前拒绝，并约束浏览器加载的资源请求。

### P2：ffprobe缺少/无效时长未拒绝

parseFfprobeJson仅在时长可解析且差值超阈值时追加错误。探针给出合法视频流但format缺duration、expected.durationMs=15000，返回[]。缺失/NaN/无限值等不能作为探测通过，尺寸/必需字段也应采用相同的完整性原则。此问题通过纯解析探针复现，与本机未装ffprobe无关。

### P2：字幕未对照绑定脚本，镜头定位覆盖不足

代码检查确认parseVtt只提取时码，不保存cue文本；调用方只传duration，不比较ownerScript.subtitles文本/顺序/语言版本。因此合法时码但错误文案仍无错误。媒体规则要求字幕与精确脚本一致。videoMetadata固定seek 25/50/90%，未使用脚本实际镜头起点；不同镜头时长时不能覆盖规定的镜头定位检查。需使用绑定脚本数据驱动，保留片尾前检查。

## 接受的范围边界

没有客户包及本机缺ffprobe，允许如实NOT_RUN，不要求本任务生成客户媒体或提前完成真实L5。现有HTTP/签名/hash、坏文件/尺寸/时长/404等测试有价值且应保留。阻断来自上述误判/漏检，不是NOT_RUN本身。

报告中media/baseUrl/ffprobe/probeAttempted作为诊断扩展字段允许保留，公共report envelope和packageHash关系仍必须遵守；这些扩展不能替代必测项或让NOT_RUN变PASS。

下一步仅提交tasks/poc/fixes/FIX-POC-002-01.md修复，主控再独立复跑。原报告和technical-sample-report保持原始证据，新证据单独存放。
