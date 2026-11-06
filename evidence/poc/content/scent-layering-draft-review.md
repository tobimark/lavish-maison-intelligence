# Scent Layering 草案主控内容检查

2026-11-05。结论：**ChatGPT 内容草案已产出；非完整场景 accepted，非 ready，未启动 POC-006。**

本轮按用户确认从 Lavish 官网获取 LAVISH OUD 与 PERLA 原图，检查了两张2000×2000图像及瓶身身份，未编辑原图。商品事实来自对应官方商品页面；源 HTML 留在 assets/sources/lavish/，原图/哈希/项目使用范围留在 evidence/brand/product-images-receipt.json。未将公开可下载推导为公开广告授权。

业务审查：三条模拟证据/信号与两条模拟趋势共享可追溯引用；稳定礼赠对照避免将全部主题解释为上涨。分析明确区分模拟观察、受众假设、官方商品描述和未测试的叠喷创意。Brief、EN/AR脚本、四镜头、VTT、视频占位需求、模拟交付内容与25条事件互相关联。产品名保留官方拉丁名称；无虚构容量、价格、销量、持香或已验证叠喷效果。

技术检查：使用既有 validate-scenario --replay；L2 PASS、L3 PASS，五个独立写出的检查点与同一领域 reducer 一致。manifest九项JSON的真实字节/哈希由作者工具生成。现有Logo、产品图、VTT副本已在草稿media内；未复制进public。完整报告见同目录 scent-layering-draft-validation.json。

预期未通过项：L1六个问题均为待收MP4/poster的bytes/sha/rightsStatus；L4七项为尚未发布的public媒体路径；L5 NOT_RUN。不能把这些结果改写为“通过”，也不能填伪造哈希。草稿本地媒体另有实际文件及哈希核对记录（draft-local-media-check.json）；此检查不替代L5。

人工/媒体待办：收到MP4后实际查看完整15秒，复核四镜头、文字与Logo、导出/接收poster、登记真实参数和来源；本地化人员审AR。AR未审核不包装为客户批准，且不影响英文单一入口片的接线准备。video disclosure中的pending描述应在实际收片并复核后更新，重新绑定manifest哈希。

操作边界：不改公共Schema、Tokens、DESIGN_SYSTEM、业务UI、catalog或任务accepted状态；不发布测试夹具。用户稍后提供MP4即可沿既有POC-006交接集中完成，不再重复技术审计。
