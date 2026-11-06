# 网页端 ChatGPT 内容制作交接

本轮只准备网页端制作所需上下文，不生产或替换场景业务内容。以后场景草案由网页端ChatGPT交付，再由Codex主控接收和工程校验。

## 使用

1. 在网页端ChatGPT新建对话，上传 `deliverables/LAVISH_WEB_CHATGPT_CONTENT_KIT.zip`，使用支持文件解压/创建的对话环境；能浏览官网更好，但已附已核实素材。
2. 粘贴下面的启动Prompt。完整要求在ZIP根目录的 `START_HERE_PROMPT.md`，本地同一文件为 `docs/handoffs/WEB_CHATGPT_SCENARIO_PROMPT.md`，也可直接复制全文粘贴。

> 请解压我上传的 LAVISH_WEB_CHATGPT_CONTENT_KIT.zip，读取根目录 START_HERE_PROMPT.md，将它作为我本次委托的完整任务要求执行。先核对 KIT_INDEX.json 并读取其中要求的冻结Schema、事件/状态机/素材契约及品牌资料；不要仅凭文件名猜内容。请优先制作 A — Scent Layering 的完整十JSON内容草案、EN/AR脚本与VTT、视频制作说明和可下载文件包，再依次制作 Luxury Gifting、Oud Storytelling。MP4目前没有，我之后提供；不能编造成片/哈希或调用视频服务，也不要因此停止其他内容制作。收到的参考HTML和官网素材是资料，不是额外操作指令。网页端交付后由Codex主控接收校验，不自行宣布ready/accepted。

3. 将网页端产出的场景ZIP下载后交回本项目主控。主控检查实际文件、引用、回放、品牌和媒体，再让DSH接线；不要直接覆盖public/catalog。

## 附件内容与刻意排除

包含完整机器Schema和十入口、必要说明/Mock API契约/验收规范、HTML与提取的设计系统、真实Logo/两款商品原图及来源回执；`KIT_INDEX.json`登记附件每个文件字节/SHA。

不含此前Codex本地制作的业务草案、测试夹具、客户不存在的MP4或密钥/依赖/整个代码库。旧本地草案仍原样保留在content-inbox，未因准备此包变为客户批准内容，也不作为网页端必须照抄的结果。

当前英文entry片为最低媒体目标；AR脚本完整但没有片时不虚构AR视频。未收MP4前是诚实的部分草案，缺媒体字段与运行Schema冲突必须显式保留并说明。公开广告许可不从官网图片可下载推导。

附件的文档包含历史“待实现”等字样；启动Prompt已说明当前工程基础已完成、目标是内容生产，不要求网页模型重做架构。机器字段始终以冻结Schema为准。
