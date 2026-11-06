# POC Contract v1.0

`scenario.schema.json` 是交付场景文件的结构权威；`files/*.schema.json` 是十个文件入口。2020-12 `$id` 使用保留 `.invalid` 域作命名，不联网解析。校验器注册本地Schema再解析 `$ref`。

主控可通过 `node scripts/poc/build-contract.mjs` 重建契约；生成器只是契约编写工具，不生成任何业务场景。下游不得自行修改Schema/生成器；结构变更由主控同步文档与版本。不得将旧 `contracts/openapi.json` 用作POC API。

L1标准Schema检查由 POC-001 实现；语义/引用/时间轴规则以 docs/SCENARIO_DATA_CONTRACT.md 和 docs/POC_EVENT_PROTOCOL.md 为准；L5实际媒体验证由 POC-002 实现。Schema自身不证明脚本/产品/画面准确。

2026-11-04主控勘误：实体定义analysisEntry/videoEntry与文件包装analysis/video分离；文件字段、入口及schemaVersion不变。防止envelope重名覆盖的检查已加入生成器。旧Schema哈希920974b0…92933停止使用；新哈希6676cc09…0222a，生成类型必须更新。尚无客户场景包使用旧版，不涉及内容迁移。详见docs/reviews/POC-001-MAIN.md。
