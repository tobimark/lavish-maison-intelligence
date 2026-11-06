> CLOSED · 主控复查通过，见docs/reviews/POC-001-ACCEPTANCE.md。

# FIX-POC-001-01 · 实体归属与契约勘误后的回归修复

### Task ID
FIX-POC-001-01

### Goal
修复主控复查发现的全实体namespace漏检，使用主控已修正的Schema重建类型并恢复正例回归测试。

### Dependencies
POC-001提交；主控已完成analysisEntry/videoEntry契约勘误。先读docs/reviews/POC-001-MAIN.md。

### Context
PROJECT_CONSTRAINTS.md、docs/SCENARIO_DATA_CONTRACT.md、tasks/poc/POC-001.md、当前contracts/poc/scenario.schema.json与主控探针。

### Files
允许：apps/web/demo/poc/validation/semantic-rules.mjs、semantic-rules.d.mts、index.ts；scripts/poc/generate-types.mjs；apps/web/demo/poc/generated/**；tests/poc/validation.test.ts；tests/fixtures/poc/build-fixture.ts（仅技术夹具/注释）；docs/reviews/FIX-POC-001-01-DSH.md。

不允许：公共Schema/生成器build-contract、Tokens、DESIGN_SYSTEM、产品页面、真实场景、任务状态/门禁、依赖升级。若CLI正例还有其他问题，先给主控复现和影响范围，不绕过校验。

### Implementation Requirements
1. 对index中每个实体id验证其属于manifest.scenarioId，而不依赖是否被引用。包括基础元数据、未引用实体、嵌套shot/subtitle和event；错误file/jsonPointer指向实际id字段。保留既有跨场景引用校验。
2. 用主控新Schema生成类型，AnalysisEntry/VideoEntry为实际业务实体，Analysis/Video为文件包装；所有生成指纹一致。
3. 实际契约的缺陷检测必须为空；将旧“缺陷存在”测试改为对局部Schema副本刻意重建冲突，确认检测仍工作。有限正例实际通过L1，L2/L4通过；L3/L5仍NOT_RUN；非strict exit0、strict exit1、runnable=false。
4. 更新测试中旧exit1/L1fail假设（包括L5 merge测试），不能删除负向测试来变绿。生成器banner与fixture注释不能继续无条件声称当前Schema有缺陷。
5. 增加有针对性的负测：未引用的外场景evidence/asset、嵌套实体和event自身外场景id；逐项确认错误code/file/pointer。测试不入客户catalog。

### Visual Specification
无UI改动，无视觉验收。品牌/素材不新增。

### Data & API Contract
新Schema SHA-256 `6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a`；JSON文件结构及schemaVersion仍1.0.0。所有实体均属本包namespace。

### Acceptance Criteria
原19项测试的有效语义全部保留且通过；新增namespace负测通过；正例不再因契约缺陷失败；生成类型检查通过；runnable门禁仍严格。

### Test Commands
```powershell
npm run poc:types
npm run poc:types:check
npm run typecheck
npm run test:unit -- tests/poc/validation.test.ts
```

### Expected Deliverables
修复文件、实际命令/exitcode、正例L1报告、namespace负例精确定位、已知限制。报告不得覆盖原DSH交付或主控复查证据。

### Failure Conditions
忽略未引用实体、删除校验/负测、将NOT_RUN改PASS、修改白名单外契约、把技术夹具发布成客户数据、自动开启POC-002。

### Definition of Done
提交review；主控复跑并核对后决定POC-001是否accepted。

### DeepSeek Execution Prompt
执行tasks/poc/fixes/FIX-POC-001-01.md。主控已修正analysis/video实体与文件包装的Schema命名冲突；不要修改公共契约。先读主控复查报告，只改Files白名单。补全所有实体自身namespace检查；更新旧缺陷预期测试为实际Schema无缺陷、合成破坏副本可检测；重建生成类型、修正无条件缺陷banner；保留现有负测，新增未引用/嵌套/event跨场景id用例。运行Test Commands，提交实际exitcode、正例L1通过及负例定位、NOT_RUN清单。L3投影与L5仍留待后续，不自行accepted，不启动POC-002。
