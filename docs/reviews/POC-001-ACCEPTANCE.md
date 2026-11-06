# POC-001 主控复查 · accepted

2026-11-04。裁决：**POC-001 accepted；FIX-POC-001-01 closed**。主控已独立检查修复代码、复跑测试并重做原缺陷探针。此验收覆盖POC-001限定的校验/类型生成范围；不代表完整场景、媒体、回放引擎或M1视觉通过。

## 修复确认

- validateEntityNamespaces遍历实体索引中的全部对象，包含未引用的基础元数据、嵌套镜头/字幕和事件；validateSemantics实际调用该校验，错误定位实体自身id字段。原有跨场景引用校验保留。
- 实际Schema的analysisEntry/videoEntry与文件包装分离，缺陷列表为空；缺陷检测回归测试在内存副本中故意制造错误，不要求真实Schema保持错误。
- 重新生成三份类型/清单，AnalysisEntry与VideoEntry为实体，Analysis/Video为文件包装。生成器警告改为按缺陷条件显示，技术夹具注释已同步。
- 原有负向用例保留；补充未引用evidence/asset、嵌套shot、event自身跨场景ID四类负测。

## 主控实际执行

| 检查 | 结果 |
|---|---|
| npm run poc:types | exit0，类型hash与提交一致 |
| npm run poc:types:check | exit0 |
| npm run typecheck | exit0 |
| npm run test:unit -- tests/poc/validation.test.ts | exit0，24 passed，13.10s |
| 独立探针fix-recheck.mjs | exit0；标准Ajv接受有限正例；原漏检案例返回CROSS_SCENARIO_ENTITY，discovery.json /data/evidence/1/id |

单测实际验证有限正例L1/L2/L4 pass、errors为空，L3/L5 not_run、runnable=false；非strict exit0、strict exit1。坏输入继续产生结构化失败报告。

证据：evidence/poc/reviews/POC-001/fix-recheck.mjs、fix-recheck.json。原main-probe及原DSH/主控报告未覆盖。source-hashes.json记录本次复查文件指纹。

Schema SHA-256仍为`6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a`；types为`a5583f08345fd353336ffb897d8c9bb857640669f91493e1d17a8f7eda2ba71b`；Tokens仍为原已验收版本，未修改产品UI。

## 保留边界与下一步

L3实际checkpoint投影比较须POC-005接入领域reducer；L5实际HTTP/解码/播放/seek/download须POC-002实现。三套客户场景仍awaiting_content，未验收任何真实场景内容或视频。本任务无UI，不需要浏览器视觉验收；M1门禁仍未通过，TASK-007仍待单独主控复查。

POC-002设为ready，只放行媒体校验工具开发，不宣称已启动DSH。实现时可使用tests内技术媒体，不能将其发布为客户场景成片。POC-003后续按任务次序另行安排，不因本次通过同时铺开业务页面。
