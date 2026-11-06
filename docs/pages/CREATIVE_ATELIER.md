> 当前四阶段页面规格为 [POC_WORKFLOW.md](POC_WORKFLOW.md)。下文旧业务布局仅供历史参考，不按其生成独立页面。视觉系统仍沿用HTML标杆。

# Creative Atelier 页面规格

引用 ../DESIGN_SYSTEM.md、../UX_SPEC.md、../CREATIVE_WORKFLOW.md。路由 `/atelier/:projectId`。核心工作：把机会转化为可编辑、可版本化、可审批的营销素材。

## 布局

共享Sidebar/Header。页面标题为Campaign名称29；标题下机会来源链接、DEMO、Draft等独立标签；右侧主操作按上下文为“Save Brief”或“Generate assets”，不得同时堆三个黑按钮。工作流条 Brief → Concept → Assets → Review → Schedule，后续未实现步骤显示状态而非空页面。

Brief态：主体单一编辑纸面，字段分为目标/受众/商品/方向/渠道/语言/排期，双列仅用于短字段。右侧摘要320，≤1170收抽屉。必填错误内联，保存后显示版本。

Assets态：工具条含渠道格式、EN/AR、缩放、预览；中间最大面积给画布，深色媒体底，作品按原始4:5/9:16/2:3等格式 contain；右侧320编辑器（文案/素材/属性tab）；下方版本缩略条96高。左边不再嵌一个额外侧栏。Copilot 默认关闭，右下“Ask Creative Agent”打开同一320编辑区的tab，不增加第三栏/覆盖作品。

## 具体交互

- 从Radar交接后Brief预填opportunityId、证据快照、真实productId、地区、DEMO，不自动生成假商品。
- 选择Concept（Editorial Luxury/Arabian Heritage/Modern Minimalism/Sensory Storytelling/Premium Gifting）只改变创作方向，不改变系统UI主题。
- 改Brief保存新版本，未保存离开确认；生成按钮明确预置/真实模式，loading不制造进度百分比，失败可重试或显式切Preset。
- 文案可逐字段编辑/语气调整/单独再生成，EN与AR独立版本且互相关联；AR正文RTL，标点和数字正确；不压窄阿文以强塞一行。
- 版本点击只预览；恢复旧版会创建新Draft。批准内容上编辑另建Draft，已有排期保持旧版并显示更新提示。
- 图片选择从核验资产库；不可用资源有说明与替换入口。产品本体contain，背景cover；M1缺图保留标记，不能用AI瓶补图。
- Copilot提交→目标标识与差异预览→Apply as new version；取消无变更；Brief/Caption/Storyboard之间不得连带改写。
- M1仅Brief、EN/AR文案、画布布局与版本切换本地原型。真实生成、审批、排期、视频渲染不伪装成完成，待M4/M5实装。

## 适配与验收

1440画布约占主区65%以上，属性面板320；1366画布不得被聊天区挤没；≤1170属性改Drawer；≤880单列画布→编辑器→版本列表，输入字体≥16以避免移动缩放。工具栏折行不能遮画布。

截图：Brief default/invalid/dirty，Assets EN/AR，版本历史，Copilot diff，loading/error，移动编辑Drawer；真实商品图入库后重拍。验收产品长宽比误差≤1%，无文字压边/遮Logo，内容居中留安全边；共享按钮/抽屉/表单必须与Radar一致。
