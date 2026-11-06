> CLOSED · 主控已复查通过，见docs/reviews/POC-002-ACCEPTANCE.md。

# FIX-POC-002-01 · 媒体门禁误判与脚本匹配修复

### Task ID
FIX-POC-002-01

### Goal
修正实际播放、同源重定向、ffprobe完整性及脚本驱动字幕/镜头校验，避免L5误判通过。

### Dependencies
POC-002已提交；先读docs/reviews/POC-002-MAIN.md及独立探针。POC-001已accepted。

### Context
docs/POC_MEDIA_RULES.md、docs/SCENARIO_DATA_CONTRACT.md、docs/POC_EVENT_PROTOCOL.md、tasks/poc/POC-002.md、contracts/poc/scenario.schema.json只读。

### Files
允许修改scripts/poc/verify-media.mjs、tests/poc/media-validation.test.ts、tests/fixtures/poc/media/**（仅TEST_ONLY技术夹具）。允许新增evidence/poc/media/fix-01/**、docs/reviews/FIX-POC-002-01-DSH.md。

禁止修改公共Schema/build-contract、POC-001验证器、依赖/配置、Tokens/DESIGN_SYSTEM、业务页面、scenarios、public、原交付/主控报告和原证据、任务状态/门禁。

### Implementation Requirements
1. 播放前记录基准时间，比较真正播放后的时间/帧增量，确认canplay及无media.error；受控play仅resolve但无推进必须失败。报告记录before/after/delta（或帧证据），不能仅判断currentTime>0。timeout未就绪不得当作canplay成功。
2. redirect目标origin必须严格等于baseUrl.origin；在发出目标请求前拒绝跨端口/协议/host。浏览器侧也限制同源，测试断言被拒服务的请求计数为0。允许同源重定向且保留次数上限。
3. ffprobe必需时长必须存在、有限、正数且与期望相符；缺失/NaN/Infinity/不合法值均明确错误。保留H.264/yuv420p/尺寸/AAC检查。未安装工具仍NOT_RUN，不自行安装或使用伪ffprobe冒充真实探测。
4. VTT提取文本/时码，逐cue对照绑定ScriptVersion.subtitles，检查数量、顺序、start/end、文本；采用NFC和换行统一等最小规范化，不能丢弃语言差异后声称匹配。EN/AR绑定由精确scriptVersion决定；无法找到owner script时该项不得PASS。保留范围/格式负测，补错误文本、错语言版本、缺/多cue、乱序/重叠负例。若需限定VTT格式支持范围，在报告明确，不能静默忽略无法解析的cue。
5. 视频seek使用所绑定脚本的镜头起点（第一个0可单独验证）及片尾前点；补不等长4镜头样例，报告实际target/actual，避免只测固定百分比。缺owner脚本/镜头数据不得声称镜头点检查通过；技术夹具补全该项所需数据。
6. 保留现有14项有效覆盖；不通过删除校验或将fail/not_run改PASS变绿。新的技术样例报告与原报告分开；严禁填充客户数据。

### Visual Specification
无业务UI改动，无产品视觉验收。浏览器只用于真实媒体解码/播放/seek。

### Data & API Contract
既有Schema不变。主控允许媒体报告保留media/baseUrl/ffprobe/probeAttempted诊断扩展；公共envelope与packageHash必须一致。报告逐项可追溯，ffprobe缺失仍L5 not_run；检测失败exit1，IO/环境失败exit2。

### Acceptance Criteria
主控4项发现均有针对性回归证据；禁用播放时VIDEO_PLAYBACK_FAILED；跨端口跳转0目标请求；缺失/无效时长解析失败；错误字幕拒绝；不等长镜头实际seek定位正确。原负测保留，NOT_RUN不冒充通过。

### Test Commands
```powershell
npm run typecheck
npm run test:unit -- tests/poc/media-validation.test.ts
```
使用本机已安装Chromium；如果沙盒缓存路径不可见，报告环境问题并在可用本机环境复跑，不删除浏览器测试。另提供有限技术样例CLI报告和实际命令/exitcode。

### Expected Deliverables
白名单修复、新回归测试与独立存放的技术证据、报告、命令/exitcode、NOT_RUN与已知限制。ffprobe不存在时可用纯函数/受控子进程测试验证解析与调用失败处理，但不能写成真实容器探测PASS。

### Failure Conditions
上述假阳性仍存在、跳过脚本匹配、被拒目标仍收到请求、删测试/伪造媒体、改白名单外文件、自行accepted或启动POC-003。

### Definition of Done
提交review，主控复跑代码/浏览器媒体探针后决定是否accepted；不用本任务提前实现客户视频或业务页面。

### DeepSeek Execution Prompt
执行tasks/poc/fixes/FIX-POC-002-01.md。先读主控POC-002-MAIN报告和main-probe证据，仅改Files白名单。修复播放推进判定、严格同源重定向/浏览器请求、ffprobe缺失无效时长检查；按精确脚本版本比对VTT字幕并使用真实镜头起点seek。保留原有效测试，补4类针对性回归及不等长镜头、错字幕等用例。所有技术素材TEST_ONLY，不进入客户场景/public。运行Test Commands、输出独立新证据与实际exitcode/NOT_RUN；不改公共契约/设计，不覆盖旧证据，不自行accepted，不启动POC-003。
