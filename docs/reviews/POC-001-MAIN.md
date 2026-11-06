# POC-001 主控复查 · changes_requested

2026-11-04。本次裁决：**不 accepted；修复后复查**。没有启动POC-002或后续任务。本任务不涉及UI，不进行视觉验收。

## 已确认并由主控修正的契约错误

下游报告属实：旧生成器的analysis/video实体被同名文件envelope覆盖，有限正例不可能通过Schema。此错误来自主控此前契约编写，不归责于下游。

主控已将实体定义改名analysisEntry/videoEntry，数据数组引用对应Entry；analysis/video文件入口保持原名，JSON字段不变。envelope循环增加同名冲突即抛错的保护，并已重建Schema及十文件入口。

新scenario.schema.json SHA-256：`6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a`。这是未交付任何实际内容包之前对v1.0.0的阻塞勘误，不更改文件业务格式。现有生成类型需重新生成，不能继续使用旧指纹。

## 需要DSH修复

1. **P2：实体自身的场景归属漏校验。** collectEntityIndex纳入实体后，validateHeaders仅检查文件头；checkReference仅在实体被引用时检查前缀。独立探针向A包添加一条未引用的`scn-oud-storytelling.evidence.foreign`，L2返回空错误列表。契约要求所有ID属于本包，而非仅被引用对象。必须遍历全部实体（包含嵌套shots/subtitles及events）检查本包namespace，并准确定位实体id字段。
2. **P2：修正契约后的生成物和回归测试需同步。** 现有测试明确要求实际契约存在两个缺陷，并要求正例L1失败；新契约下不再成立。生成器banner仍无条件宣称有缺陷。保留缺陷检测测试时，应在测试内故意破坏一份Schema副本；实际冻结Schema必须无缺陷，有限正例L1/L2/L4通过，L3/L5仍NOT_RUN、runnable=false。CLI非strict正例应exit0，strict因L3未实现exit1。

修复白名单与完整指令见tasks/poc/fixes/FIX-POC-001-01.md。公共Schema已由主控修正，下游不再修改它。

## 主控实际验证

- 修订契约前：typecheck exit0；19项现有单测通过；poc:types:check exit0。它们当时验证的是含已知缺陷的契约，不能据此验收正例成功。
- 修订后独立探针：标准Ajv2020+formats编译新Schema，十文件有限技术正例通过；36个定义，两个Entry与文件包装已分离。
- 同一探针复现跨场景未引用实体漏检；null checkpoint能返回结构化失败报告，无崩溃（此项未发现问题）。
- 修订后poc:types:check exit1（三份生成物尚未更新）；单测15通过、4失败，失败项均是旧缺陷/exit1预期及过期生成物，需按FIX更新。不得沿用修订前19通过宣称当前通过。
- 证据：evidence/poc/reviews/POC-001/main-probe.mjs及main-probe.json。技术数据均来自tests夹具，未写入客户场景/public。

L3实际投影和L5媒体检查仍由后续任务完成，不因当前NOT_RUN额外要求下游提前开发。三套场景仍awaiting_content。
