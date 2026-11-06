# POC-002 主控验收 · accepted

2026-11-04。裁决：**POC-002 accepted；FIX-POC-002-01、FIX-POC-002-02 closed**。仅验收媒体校验工具及技术测试范围，不代表真实客户媒体L5、内容审核或M1视觉通过。

## 实际复查结果

| 检查 | 主控结果 |
|---|---|
| npm run typecheck | exit0 |
| npm run test:unit -- tests/poc/media-validation.test.ts | 本机Chromium环境exit0，25 passed，46.14s |
| 独立subtitle-recheck-final.mjs | 重放此前假匹配案例；子CLI exit1、L5 fail、SUBTITLE_CUE_COUNT_MISMATCH；实际cues=2、textMatched=false |
| 文件指纹 | Schema、Tokens、原technical-sample-report均保持已记录哈希 |

主控已检查VTT解析代码：完整HH:MM:SS与MM:SS格式均参与cue解析，坏时间/结构/未知块明确报错，合法非cue块显式识别；parseErrors会阻止textMatched为true。新增测试覆盖混合格式额外cue、好坏cue混合、非法时间、合法非cue块和未知块；原19项有效覆盖保留。

FIX-01中播放时间增量、严格origin拦截、ffprobe缺失/无效时长、字幕与精确脚本比较、实际镜头起点seek等修复在本次25项测试中回归通过；其独立探针结果保留在fix-recheck.json，本次未改写原文件。

## 证据

- evidence/poc/reviews/POC-002/subtitle-recheck-final.mjs / subtitle-recheck-final.json：主控本次独立CLI复测，原subtitle-recheck证据未覆盖。
- evidence/poc/reviews/POC-002/acceptance-source-hashes.json：本次代码、测试和保留资产指纹。
- docs/reviews/FIX-POC-002-02-DSH.md与evidence/poc/media/fix-02/：下游交付，已核对代码并实际复跑；不单凭其自报PASS验收。

Schema hash仍为6676cc09ff186ce88b84f733f98867b5fb16586c053cb8e4a460cf06c150222a；Tokens仍为07f8b08de74dde44ecdb6dad8b0d107233f394085d7aed3405b619aad5c01814；原媒体报告仍为8bd1b2d6656847a53004d4890b0b56fc17cfb3a57a888e17645b1f1445e746c7。

## 保留边界与放行

本机无ffprobe，实际编码/像素格式容器探测NOT_RUN；只有其解析与错误逻辑测试通过。未收到A/B/C完整客户场景及媒体，真实L5仍NOT_RUN，技术样例不能进入客户catalog。L3实际投影比较仍待POC-005；无产品UI改动，本次不进行产品视觉验收。

POC-003“四阶段纯状态机”设为ready，可交给DSH按既有白名单执行；没有自动派发或启动。只实现纯领域逻辑及技术测试，不扩展业务页面，完成后提交主控review。TASK-007和M1仍保留待审门禁。
