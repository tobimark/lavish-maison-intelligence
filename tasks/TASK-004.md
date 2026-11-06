# TASK-004 — 登记Demo实际使用的Lavish品牌与商品素材

### Task ID
TASK-004

### Title
登记Demo实际使用的Lavish品牌与商品素材

### Goal
登记Demo实际使用的Lavish品牌与商品素材，支持高保真前端演示。

### Dependencies
无

### Context
- PROJECT_CONSTRAINTS.md
- docs/FRONTEND_DEMO_SCOPE.md
- docs/DESIGN_SYSTEM.md
- docs/BRAND_ASSETS.md
- docs/pages/INTELLIGENCE_RADAR.md
- docs/pages/CREATIVE_ATELIER.md

### Files
- assets/brand/**
- assets/products/**
- assets/licenses/**
- assets/manifest.json
- docs/BRAND_ASSETS.md
- scripts/validate-assets.mjs

### Implementation Requirements
使用已收到的正式294px Logo并保留比例。核验本次出镜商品名称、SKU与原图，完成场景A选用商品即可；第三款仅在演示需要时补。登记来源、哈希、像素与使用范围。缺图显式标注，不造假瓶，不额外要求矢量Logo来阻塞常规导航原型。

### Visual Specification
遵循HTML与DESIGN_SYSTEM；图片保持比例。此任务不开发业务页面。

### Data & API Contract
沿用BRAND_ASSETS素材manifest字段；无需品牌API或数据库。

### Constraints
仅修改白名单，不建设后端，不修改全局视觉，不把预置数据冒充实时结果。

### Acceptance Criteria
每一出镜图对应准确商品；无失真或冒牌图；缺项清楚。素材缺件不阻塞字体和壳体开发。

### Test Commands
实现时运行，当前未执行。

```powershell
node scripts/validate-assets.mjs
```

### Expected Deliverables
指定文件、来源/缺项清单、实际验证结果。

### Failure Conditions
对象引用失效、假商品、来源标识错误、越界改动、未测却称通过。

### Definition of Done
交付完整，经主控审查通过；不自行写accepted。

### DeepSeek Execution Prompt
执行TASK-004：登记Demo实际使用的Lavish品牌与商品素材。本期仅前端Demo。先读Context，依赖无，仅改Files。实现：使用已收到的正式294px Logo并保留比例。核验本次出镜商品名称、SKU与原图，完成场景A选用商品即可；第三款仅在演示需要时补。登记来源、哈希、像素与使用范围。缺图显式标注，不造假瓶，不额外要求矢量Logo来阻塞常规导航原型。 契约：沿用BRAND_ASSETS素材manifest字段；无需品牌API或数据库。 验收：每一出镜图对应准确商品；无失真或冒牌图；缺项清楚。素材缺件不阻塞字体和壳体开发。 实际运行：node scripts/validate-assets.mjs。交付变更文件、来源/缺项、命令与exit code，等待主控review；不扩展后端或更改视觉。
