> 2026-11-05素材范围更新：用户已提供SERENITY Hero/白底原图/10.08秒MP4，并确认以SERENITY统一A案例、另补相符脚本。以docs/PRODUCT_RESCUE_ASSET_INTEGRATION.md和FAST_06为最新增量；本轮不制作视频，但允许真实提供素材预览/下载。冻结15秒核心Schema保持，Provided片走独立sidecar/API，不伪称匹配成片。

# No Dead Controls · 执行与证据要求

主控2026-11-05。规范矩阵：`INTERACTION_AUDIT_MATRIX.csv`，列为用户指定八列。**当前是预期行为清单，所有新产品交互仍NOT_RUN，不能把规格表当通过报告。**

每个Control ID用于data-control-id；动态模板如signal-{signalId}、card-{analysisId}、version-{versionId}在实际DOM中用真实ID展开。每个可见核心button/link/input/select/tab/slider都应映射矩阵；没实现且不必要的功能移除，不留Soon或空白路由。新增控件必须同时补矩阵及测试，不靠注册一个空handler算实现。

Test ID是浏览器测试分组标识，例如IP-RAD-01；用例须断言业务影响/结果而非只hover/toast。参数化控件必须测试所有实际项：6导航、3机会/Campaign、15信号、全部实际来源、EN/AR、预置与一个保存版本；实体卡模板不是只测第一张卡的豁免。

最终证据`evidence/product/interaction-audit.json`：`{scope:'interactive_mock_product',checkedAt,buildRef,controls:[{controlId,page,label,testId,result:'pass'|'fail'|'not_run'|'guarded',evidence,observedEffect}],unexpectedControls:[],summary:{...}}`。guarded仅用于有业务前提的确认/未保存稿导出/邮件按钮，必须实测理由、恢复动作和恢复后有效行为；不能用guarded掩盖一级导航或只读内容不能访问。

对应截图/下载/断言位置必须真实存在，NOT_RUN诚实记录。点击后仅出现无实质信息toast、不改变任何目标内容、不打开目标路由/抽屉、导出无真实文件、链接返回与对象不符，均fail。

## 必测路径

1. 干净浏览器分别直接进入六主路由，均有实际预置内容；在任何只读页不先建session或跑Scenario。
2. Radar逐来源筛选、清除、打开15信号与证据、进相关机会；查看推荐理由/不确定性；再经侧栏Atelier打开同Campaign。
3. 先看AR/四镜头/版本再Edit，保存新AR版本、确认；Library按Campaign/AR/Saved找到它，Deliverables导出同版本，刷新/后退/前进后仍一致。
4. 直接访问Library或Deliverables，在从未运行的B/C上读取预置稿并导出；普通导出没有模拟邮件attempt、没有自动确认。Draft导出正确披露；真实ZIP解压并核对版本/文字/时码/图片与hash。
5. 上述只读sweep前后对业务sessions/revisions/history/active version/confirmation/export/attempt快照相等；不比较纯UI筛选偏好。Activity打开不写会话；显式Play/Step等可写独立activity session，不改编辑/导出/交付。
6. 重测已修复两条路径：Discard后Save/刷新不会复活内容；邮件脏稿不允许确认旧稿，确认弹窗/attempt/ZIP同revision/收件人。全局菜单离开编辑器也有保存/丢弃/取消保护。
7. 导出原稿→改存新稿→重下载旧记录，字节/版本仍为旧快照；模拟邮件失败/重试保留记录。没有假视频或真实发送文案。

## 视觉/理解验收

实际浏览器1440×900、1366×768查看六页及关键Drawer/Dialog，AR和一个窄屏样例。主控必须实际看图，不只看组件树。首屏评判：用户能否说出用途、当前机会、推荐理由、已有成果和主行动；说明不清楚即产品问题，不能用测试全绿抵消。

原工程accepted不自动扩展为自由探索产品accepted。相关任务可整批提交，只修正常路径/清晰视觉/对象关联/真实性的阻断，不开启罕见并发、所有浏览器或庞大可访问性矩阵。视频继续deferred且不作为当前门禁。
