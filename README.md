# AICustomerService-web

金融催收对话引擎（赛题08）前端：对话台、案件与审计台、运营管理台。

- 后端仓库：[Mr-Yoje/AICustomerService](https://github.com/Mr-Yoje/AICustomerService)，接口与页面设计见其 `docs/superpowers/specs/2026-10-24-api-frontend-design.md`
- 技术栈：TypeScript + React + Vite + Ant Design；接口类型由后端 OpenAPI 通过 `openapi-typescript` 生成；对话流式输出走 SSE
- 部署：打包为静态文件，由后端 FastAPI 托管，单端口访问

## 目录约定

两个仓库放在同级目录：

```text
<工作目录>/
  26HackSong/                 # 后端仓库（AICustomerService）
  AICustomerService-web/      # 本仓库
```

## 运行

```powershell
npm install
npm run build          # 输出 dist/，后端启动时自动托管
```

一键启动请在后端仓库根目录执行 `.\start.ps1`（会先打包本仓库），然后访问 `http://127.0.0.1:8000`。

开发模式（热更新，`/api` 代理到后端）：

```powershell
# 先在后端仓库启动：python backend/scripts/serve.py --port 8000
npm run dev            # 访问 http://127.0.0.1:5173；可用环境变量 API_TARGET 指定后端地址
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run test` | vitest：SSE 解析、对话状态更新、配置草稿与 YAML 转换 |
| `npm run lint` | oxlint |
| `npm run gen:api` | 从后端导出 OpenAPI 并重新生成 `src/api/schema.d.ts`（后端接口变更后执行） |

## 页面

- 对话台 `/`：客户搜索与档案卡片；对话流（运营、客户、坐席话术审核、人工坐席四种身份）；发起与结束催收、模拟时间；人工接管时展示移交包并可完成处理；右栏实时处理轨迹与本轮结论。
- 案件与审计 `/cases`：案件筛选与详情（对话记录、催收报告、移交包、后置任务与重试、待办、会话记忆纠正与清除、归档）；`/cases?tab=audit` 审计日志筛选与 CSV 导出。
- 运营管理台 `/admin`：业务包表单与 YAML 编辑、保存前校验与错误展示、版本历史与载入旧版本、复制新建；评分与策略表单；合规检查点、意图映射 YAML 编辑；合规规则库、分期模板、工具注册表只读。
