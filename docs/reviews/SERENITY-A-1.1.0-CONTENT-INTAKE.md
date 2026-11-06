# SERENITY A 1.1.0 · 主控内容接收结论

2026-11-05，依据用户提交的`D:/下载/LAVISH_SERENITY_A_1.1.0_HANDOFF.zip`及AS-003接收清单。

**结论：规范接收副本已获主控批准用于内部Demo接入，AS-003内容等待解除，可以继续发布/绑定。** 这是内容审查结论，不是AS-003实现完成或FAST_06整批accepted。网页作者的reviewStatus=pending原样保留，主控批准以本报告为准；AR仍为待客户母语审稿的演示草案。

## 唯一接收来源

- 原包：7,533,938 bytes，63 ZIP entries，CRC通过。
- 原包SHA-256：`a8d1ef5f54da532cbe180bd3ce9c9726d7974ef5ef78f29ee6677708c5e71029`。
- 只读归档及原样解包：`content-inbox/web-chatgpt-received/a8d1ef5f54da/`。
- **DSH使用的接收副本：`content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0/`。** 十JSON直接在此目录，真实场景媒体在`media/`，作者解释文档同目录；不从旧A或此前EN导出包重建。
- 接收副本manifest/packageHash：`709abfdeb11f28a316ca6709c751f21cbcabdcb7cf30e4756418d9d8f46f854d`。
- 原作者manifest hash：`e5c8c67df98e162050f7a4c164a100c64e851df18eda4fa7e0118288c4216297`。二者不同的原因仅为下述声明规范，不能混用。
- 附件中的contracts/docs只作输入参考，未用附件文件覆盖当前工程规范。12份Schema与当前工作区逐字节一致；sidecar与工程现有登记相同。

## 两条技术声明规范

首次真实执行`validate-content-only.mjs`：L1/L4通过，L2/L3因两个固定词匹配失败。原文已经说明未发信及影片未制作，失败不涉及品牌/营销逻辑。

1. `delivery.json /data/plans/0/disclosure`前加`Simulated delivery only. `，满足模拟交付的明确声明。
2. `video.json /data/videos/0/disclosure`前加`Planned pre-produced concept film; NOT PRODUCED OR SUPPLIED. `，描述未来预制方案，明确并未制作或提供，不声称现有成片。
3. 重新计算manifest中上述两文件的bytes/SHA。其余7份作者JSON逐字节未改，营销脚本/分析/品牌事实/事件/字幕与原提供媒体均未改。

仅接收副本有这两条补充；原ZIP/解包留存。完整前后值与哈希见`evidence/product/assets/as-003/intake-a8d1ef5f54da/normalization.json`。没有放宽校验器、冻结Schema或修改Token。

## 实际核对结果

| 内容 | 结果 |
|---|---|
| 十JSON / manifest / ID引用 / 静态事件语义 | 现有content-only校验L1/L2/L3/L4全部通过，contentRunnable=true |
| 产品与Brief | sole product=`scn-scent-layering.product.serenity`；Brief商品引用一致；单品“SERENITY — A Story in Layers”创意，不再是OUD/PERLA配对 |
| 双语脚本 | `scn-scent-layering.script.en-v2/ar-v2`，version=2；各4镜头，0至15000ms连续覆盖 |
| EN/AR VTT | 复用现有VTT解析器；各4条cue，文字/起止时码逐条等于script.json，合法且无重叠 |
| 场景媒体 | 5真实文件bytes/SHA全部通过；3张PNG实际解码且宽高符合登记；2项未来15秒影片/poster继续pending |
| 提供素材 | Hero、identity、10.08秒MP4与此前核验的3份原文件逐字节一致；未重新生成或转码 |
| 事件 | 28条MOCK事件sequence连续、时间非递减，每条scenarioVersion=1.1.0 |
| 实际领域回放 | 发现/分析前16条，cursor 0/9/16三个checkpoint使用现有reducer全部匹配 |
| 浏览器loader入口结构 | 现有isContentPackageInput判定通过，不只是作者自检 |
| 包内未来video/delivery回放、核心15秒影片L5 | NOT_RUN，仍不属于本轮可运行内容/提供片能力 |
| 新A页面绑定/浏览器/ZIP整链 | NOT_RUN，属于DSH接下来的AS-003..006 |

源事实与创意推演已人工阅读：五条预置信号、两个趋势均明确Mock；商品依据限定为既有官方资料中的SERENITY及citrus/floral/musk；没有把木枝、石片当作配方证明。单品视觉叙事、Brief、双语脚本与两张SERENITY图片一致。15秒概念和独立10.08秒提供片关系明确，无假视频或真实发信声明。

## 接入裁决

1. 继续由**提交AS-004-DSH并完成首页修正的原DSH会话**唯一实施AS-003..006剩余；主控不并行改产品代码。本轮未自动派发，未创建第二个实现者。
2. 将指定接收副本十JSON原字节发布至`scenarios/scent-layering/1.1.0/`及public场景目录；`media/`映射到`/scenario-media/scent-layering/1.1.0/`。作者解释文档留在接收档案/来源说明，不在UI倾倒交接段落。
3. 更新catalog与显式版本读取，默认A使用1.1.0，保留1.0.0原字节/历史session/已导出记录。新source/packageHash必须采用本报告批准的规范副本hash。
4. **已批准在发布后校验通过、查询确实返回新A1.1.0时，将design/public sidecar置bound。** 不需要再因内容接收重复询问；没有部署新内容前不能仅改状态掩盖未绑定。
5. 复用已通过首页：identity→Hero→video、等高框、真实预览；补齐Brief/Atelier/Library的SERENITY对象和版本。保留解释用途的一句话与清楚的Mock/Provided标识，长篇风险/来源/技术字段按需展开。
6. 新成果包含实际选定EN/AR版本、15秒概念VTT、分镜、Brief、Hero/identity及原MP4；包中说明10.08秒片独立于15秒脚本，不向播放器挂未对齐VTT。核验noVideo=false和真实附件字节。已有独立下载/双语包基础不重做。
7. 完成AS-006一次集中主路径/实际截图/视频/下载/跨版本验证后提交review，主控再决定FAST_06整批accepted。已有首页通过记录保留，不凭本报告扩大验收。

非阻断记录：作者事件runKey字符串仍包含`1.0.0`，但实际版本字段全为1.1.0；现有runtime不将该标签作为持久化身份。本轮保留作者字节。DSH按scenarioId + scenarioVersion + packageHash等现有版本契约读取，不以runKey混合历史数据。AR母语/对外广告审稿不在内部Demo接收结论内。

## 证据与命令

新证据根：`evidence/product/assets/as-003/intake-a8d1ef5f54da/`。

- `content-validation.json`：规范前失败报告，保留。
- `content-validation-normalized.json`：规范后现有校验结果。
- `preparation.json`、`normalization.json`：接收目录整理/有限变更记录。
- `semantic-media-replay.json`、`file-and-image-check.json`：字幕、镜头、产品、回放、媒体/冻结文件核对。
- `verify-content.mjs`：复用现有loader/解析器/reducer的检查入口；初次运行曾因本检查脚本import路径错误退出1，修正后完整运行退出0，无产品代码变更。

```powershell
node scripts/poc/validate-content-only.mjs --dir content-inbox/web-chatgpt-prepared/a8d1ef5f54da/scent-layering/1.1.0 --report evidence/product/assets/as-003/intake-a8d1ef5f54da/content-validation-normalized.json
node evidence/product/assets/as-003/intake-a8d1ef5f54da/verify-content.mjs
```

两命令最终exit 0。本轮只接收和审查内容，不运行无关全站构建或宣称新A页面已验收。
