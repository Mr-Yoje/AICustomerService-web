# AICustomerService-web

金融催收对话引擎（赛题08）前端：对话台、运营管理台、案件与审计台。

- 后端仓库：[Mr-Yoje/AICustomerService](https://github.com/Mr-Yoje/AICustomerService)
- 技术栈：TypeScript + React + Vite + Ant Design；接口类型由后端 OpenAPI 通过 `openapi-typescript` 生成；流式输出走 SSE。
- 部署：打包为静态文件，由后端 FastAPI 托管，单端口访问。
