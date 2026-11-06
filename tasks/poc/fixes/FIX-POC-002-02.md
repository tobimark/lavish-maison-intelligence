> CLOSED · 主控已复查通过，见docs/reviews/POC-002-ACCEPTANCE.md。

# FIX-POC-002-02 · 字幕解析不得丢弃cue

### Task ID
FIX-POC-002-02

### Goal
关闭POC-002最后一项P2：VTT额外/不支持cue被静默忽略导致textMatched假阳性。

### Dependencies
阅读docs/reviews/POC-002-RECHECK-01.md，保留FIX-01已通过的播放、同源、ffprobe、脚本匹配修复。

### Context
docs/POC_MEDIA_RULES.md；tasks/poc/fixes/FIX-POC-002-01.md；evidence/poc/reviews/POC-002/subtitle-recheck.mjs及其JSON。

### Files
允许scripts/poc/verify-media.mjs（仅VTT解析/诊断）；tests/poc/media-validation.test.ts；tests/fixtures/poc/media/**（只增TEST_ONLY VTT）；evidence/poc/media/fix-02/**；docs/reviews/FIX-POC-002-02-DSH.md。
禁止改公共Schema/依赖/配置/业务页面/客户场景/门禁，禁止覆盖旧报告与证据。

### Implementation Requirements
- 每个字幕内容块必须被解析为cue，或被识别为合法非cue块，或产生明确格式错误；禁止遇到无法匹配时间行直接continue。
- 处理完整HH:MM:SS.mmm以及MM:SS.mmm格式。若选择明确子集，必须拒绝未支持格式并在文档/错误中说明，不许静默忽略；支持两者为推荐实现。
- 检查合法时间分量、箭头及cue结构；混合有效cue与坏cue必须整体失败。正确识别WEBVTT头与NOTE/STYLE/REGION等非cue块，不能把普通任意块当作注释跳过。
- 保留文本、数量、顺序、范围及绑定脚本比较；额外cue无论格式都应被计入后拒绝，或以格式错误拒绝。
- 新增回归：主控两cue/脚本一cue案例，混合好/坏时间行，不支持/非法时间分量，合法非cue块不被错计；原19项覆盖保持通过。

### Visual Specification
无UI，只有媒体工具与技术测试。

### Data & API Contract
公共契约不变；遇到坏字幕输出assets.json及该asset定位、明确错误码，CLI exit1、字幕status fail。ffprobe缺失保持NOT_RUN。

### Acceptance Criteria
主控subtitle-recheck不再exit0/textMatched=true；正确额外cue触发数量不匹配，非法cue触发格式错误；现有19项及新增针对性测试通过。

### Test Commands
```powershell
npm run typecheck
npm run test:unit -- tests/poc/media-validation.test.ts
```
浏览器使用本机已安装Chromium。新证据独立存放，包含实际命令/exitcode和NOT_RUN。

### Expected Deliverables
限定修复、回归测试、交付报告、主控复现案例的失败结果与错误定位。

### Failure Conditions
仍静默漏cue；仅删除坏cue来通过；改写其他已通过逻辑；将NOT_RUN改PASS；启动POC-003。

### Definition of Done
提交review，经主控复跑后决定POC-002是否accepted。

### DeepSeek Execution Prompt
执行tasks/poc/fixes/FIX-POC-002-02.md，只关闭VTT未识别cue被忽略的问题。先读POC-002-RECHECK-01和subtitle-recheck证据，仅改Files。让全部字幕块被解析、明确识别非cue或明确报错，不能直接跳过不支持格式。新增两cue混合格式、好坏cue混合、非法时间和合法非cue块测试，保留原19项。运行Test Commands，提交独立新报告及错误定位/exitcode。不要重写已通过修复，不改公共契约/设计/场景，不覆盖旧证据，不自行accepted或启动POC-003。
