> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 视频生成与渲染契约

输入StoryboardVersion有4镜头，durationMs总和15000，输出1080×1920/9:16/30fps；片尾计入第四镜头，不能额外加长。每镜头assetVersionId、durationMs、captionEn/Ar、captionIntervals、transition，素材和字体均本地可用且有来源。

M5先小型Remotion+FFmpeg验证：同一模板预览与离线渲染，核对阿文字形/RTL、视频codec与容器。若环境不支持，主控评估改为FFmpeg模板；DeepSeek不能自行替换管线或以浏览器动画冒充MP4。

RenderJob提交返回202 queued；render-worker领租约、锁输入版本哈希、校验资源、渲染、ffprobe、生成封面、原子写输出，最后succeeded。未知进度为null；显示阶段名，不虚构百分比。失败保留code/logRef，重试新attempt且不覆盖成功成品。取消作业清理临时文件，不删除其他版本。

输出验收：video/mp4，H.264/yuv420p，1080×1920，duration15s容许1frame误差，450帧，能完整decode并浏览器播放；封面PNG尺寸匹配；字幕不被裁切，品牌片尾/瓶身保持比例。下载URL校验namespace与版本，返回Content-Disposition与checksum；不能返回占位链接。
