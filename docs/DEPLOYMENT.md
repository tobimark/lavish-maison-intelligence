> 2026-11-04 范围更新：当前实施以 [Fully Mocked POC](POC_SCOPE.md) 为准。下文旧业务流程/后端/实时服务要求为历史，不能用于派发；当前数据/API/事件/状态机及验收见新POC文档。设计原则仍有效，具体四步布局见 pages/POC_WORKFLOW.md。本次未重做或撤销历史验收。

> 当前生效范围为[前端 Demo](FRONTEND_DEMO_SCOPE.md)。下文涉及后端、数据库、API与服务端任务的内容保留作未来参考，不是本期实施或验收条件。

# 部署设计

目标Docker Compose单机演示：web3000、api8000、postgres5432内部网络、worker与render-worker独立服务。只对外暴露入口代理；API/DB不直接公开。反向代理支持SSE禁缓冲。静态reference目录不进入生产镜像。

持久卷：Postgres、assets、render outputs；临时渲染目录按job隔离，限并发1以控制资源。M5记录实测渲染耗时/内存后再定机器规格，不凭空承诺速度。健康检查区分liveness/readiness，Worker心跳与租约可查。

环境变量示例需在TASK-034提供：DATABASE_URL、ASSET_ROOT、DEMO_MODE、DEFAULT_MARKET_TIMEZONE=Asia/Dubai、LLM_PROVIDER/MODEL/KEY（仅服务端）、RENDER_CONCURRENCY。仓库只提交.env.example，不提交密钥。

启动流程：build→db health→migrate→seed版本校验→api/worker/render-worker/web。不得每次启动自动reset。离线包需包含依赖镜像、本地字体、已核验产品素材、preset、模板、FFmpeg及许可清单。

M6验收：空卷一键部署，A完成两次，杀worker恢复，重启会话恢复，预览/下载MP4；备份恢复与只清当前演示namespace。当前没有部署、未发布任何网站。
