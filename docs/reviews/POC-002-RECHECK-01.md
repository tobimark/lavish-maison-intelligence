# FIX-POC-002-01 主控复查 · changes_requested

2026-11-04。POC-002暂不accepted；仅剩一项字幕解析漏检，执行FIX-POC-002-02后复查。POC-003仍不启动。

## 已实际通过的修复

- typecheck exit0；媒体测试19 passed、exit0，32.97s，使用本机已安装Chromium。
- 独立探针fix-recheck.mjs：seek到14500ms后禁用播放，before=after=14500、delta=0、played=false；实际镜头点2000/5000/9000/14500均定位正确。
- 跨端口重定向exit1、EXTERNAL_REDIRECT，目标服务请求数0。
- ffprobe缺少duration返回FFPROBE_DURATION_INVALID；纯函数及测试覆盖无效值，实际ffprobe仍NOT_RUN。
- 代码核对确认VTT文本/时码/数量/顺序开始与精确ScriptVersion比较；原证据和公共Schema/Tokens指纹保持不变。

## 剩余P2：未识别的cue被静默丢弃，造成假匹配

scripts/poc/verify-media.mjs的parseVtt在block找不到HH:MM:SS.mmm正则时直接continue。主控用包含两条cue的文件复现：第一条HH:MM:SS格式匹配脚本，第二条MM:SS格式有额外文案。解析器只返回第一条，不报错。

进一步实际调用CLI：脚本只有第一条字幕，工具返回exit0、errors=[]、media.status=pass、cues=1、textMatched=true，额外cue未被检测。虽然总L5因缺ffprobe仍not_run，字幕项已构成错误通过。

这属于FIX-POC-002-01第4项明确要求“不能静默忽略无法解析的cue”的未完成部分。允许工具只支持明确的VTT子集，但任何不支持的cue必须明确拒绝，不能从校验输入里消失。NOTE/STYLE/REGION等非cue块应明确识别，不能靠任意continue跳过其他内容。

完整独立复现：evidence/poc/reviews/POC-002/subtitle-recheck.mjs及subtitle-recheck.json；只使用临时TEST_ONLY元数据和本地字幕字节，未创建客户包。

## 下一步与边界

仅修复parseVtt完整消费输入及相应测试，其他已验证修复不重写。无客户媒体/ffprobe仍允许NOT_RUN；不要求本轮补真实场景或业务UI。修复任务：tasks/poc/fixes/FIX-POC-002-02.md。
