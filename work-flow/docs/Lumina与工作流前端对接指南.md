# Lumina 与工作流前端对接指南

本文面向在 **`lumina/`** 根目录已搭建主前端（步骤向导：意图 → 抓取 → 清洗 → … → 报告）、并 clone 了同伴的 **`work-flow/`** 仓库的开发者，说明如何与 **`work-flow/workflow_engine/frontend`** 及后端 API 对接。

更完整的仓库说明见 [项目详解.md](./项目详解.md)。

---

## 1. 先理清三件事

### 1.1 三个「进程」

| 进程 | 典型目录 | 典型端口 | 作用 |
|------|-----------|----------|------|
| Lumina 主应用 | `lumina/` | **3000**（见根目录 `vite.config.ts`） | 舆情步骤向导 UI |
| 工作流前端 | `work-flow/workflow_engine/frontend/` | **5173**（Vite 默认） | React Flow 画布 + 对话 + 执行 UI |
| 工作流 API | `work-flow/workflow_engine/`（FastAPI） | **8000 或 8123**（见下文） | 唯一业务后端 |

三者可同时运行；是否「合并成一个前端」取决于你选的对接方案。

### 1.2 API 路径以谁为准

**唯一权威**：[`work-flow/workflow_engine/frontend/src/api/workflowApi.ts`](../workflow_engine/frontend/src/api/workflowApi.ts)。  
所有接口均为 **`/api/v1/...`**。

[`前端接入.md`](../workflow_engine/frontend/前端接入.md) 里部分示例使用 `/api/workflows`（无 `v1`），集成时请改为与 `workflowApi.ts` 一致。

### 1.3 端口必须对齐（常见踩坑）

| 配置位置 | 当前内容 |
|----------|----------|
| [`api/server.py`](../workflow_engine/api/server.py) 末尾 `start()` | `uvicorn` 监听 **8123** |
| [`scripts/start_services.sh`](../workflow_engine/scripts/start_services.sh) | 默认 **8000**（`BACKEND_PORT`） |
| [`frontend/vite.config.ts`](../workflow_engine/frontend/vite.config.ts) | 开发代理 `/api` → **http://localhost:8000** |
| [`frontend/.env`](../workflow_engine/frontend/.env) | `VITE_API_BASE_URL=http://localhost:8000` |

**结论**：若直接执行 `python api/server.py` 而得到 **8123**，工作流前端默认代理到 **8000** 会失败。请任选其一统一：

- **推荐**：用 uvicorn 显式指定与文档一致的端口，例如：  
  `python -m uvicorn api.server:app --host 0.0.0.0 --port 8000`  
  （工作目录与 `PYTHONPATH` 需满足项目内 `workflow_engine` 包的导入方式，以团队 README 为准。）
- 或：把后端改为 8123 时，同步修改 **工作流前端** 的 `vite.config.ts` 代理目标与 `VITE_API_BASE_URL`。

### 1.4 CORS 与 Lumina 端口

[`api/server.py`](../workflow_engine/api/server.py) 中 `CORSMiddleware` 的 `allow_origins` 已包含 **`http://localhost:3000`**。  
若你修改 Lumina 的 `vite.config.ts` 端口，需在服务端 `allow_origins` 中追加对应 origin。

### 1.5 关于 `API_SPECIFICATION.md` 的响应形状

[`workflow_engine/frontend/docs/API_SPECIFICATION.md`](../workflow_engine/frontend/docs/API_SPECIFICATION.md) 中部分示例使用 `{ code, message, data }` 包装。  
当前 FastAPI 实现中，许多接口返回的是 **扁平 JSON**（例如列表接口直接 `{ "workflows": [...] }`）。  
**联调时不要假设存在统一包装**；以 **`/docs`** 或浏览器网络请求中的实际 JSON 为准。

---

## 2. `workflowApi.ts` 端点一览（对接用速查）

以下与方法名对应，便于在 Lumina 中自行封装 `fetch` 或复制模块。

| 方法（workflowApi） | HTTP | 路径 |
|---------------------|------|------|
| `getWorkflows` | GET | `/api/v1/workflows` |
| `getWorkflow` | GET | `/api/v1/workflows/{workflowId}` |
| `createWorkflow` | POST | `/api/v1/workflows` |
| `saveWorkflow` | PUT | `/api/v1/workflows/{workflowId}` |
| `startConversation` | POST | `/api/v1/conversations/start` |
| `continueConversation` | POST | `/api/v1/conversations/continue` |
| `generatePublicOpinionWorkflow` | POST | `/api/v1/workflows/generate-public-opinion` |
| `executeWorkflow` | POST | `/api/v1/workflows/execute` |
| `getExecutionDetail` | GET | `/api/v1/executions/{executionId}?include_node_traces=...` |
| `getWorkflowExecutions` | GET | `/api/v1/workflows/{workflowId}/executions?limit=&offset=` |
| `getExecutionReport` | GET | `/api/v1/executions/{executionId}/report` |

后端另有 **`POST /api/v1/workflows/generate`**（自然语言生成）等，若需要可在 Lumina 中按 `server.py` 补充调用。

**Base URL 行为**：`workflowApi.ts` 使用 `import.meta.env.VITE_API_BASE_URL ?? ""`。  
- 空字符串时，请求为 **相对路径**（适合主应用 Vite 代理 `/api` 到后端）。  
- 非空时，请求发往绝对地址（适合跨域直连，需 CORS 允许）。

---

## 3. 对接方案（由浅到深）

### 方案 A：双应用并行（最快验证）

1. 按 [项目详解.md](./项目详解.md) 启动 **PostgreSQL（若需要）**、**FastAPI**、**工作流前端**。
2. Lumina 照常 `npm run dev`（3000）。
3. 在 Lumina 某步（例如「编排」`Step5_Orchestration`）增加 **外链或按钮**：`window.open('http://localhost:5173')` 或说明文档链接。

**优点**：不改 Lumina 依赖，不合并代码。  
**缺点**：两套 UI，登录态与数据需自行约定（若以后需要）。

---

### 方案 B：Lumina 反向代理 + 只调 API（中等改动）

适合：在 Lumina 某一屏内用 `fetch` 触发「生成 / 执行 / 查列表」，**不要**完整画布。

1. 在 **`lumina/vite.config.ts`** 的 `server` 中增加 `proxy`，将 **`/api`** 转发到真实后端（端口与第一节对齐），例如：

```typescript
server: {
  port: 3000,
  host: '0.0.0.0',
  proxy: {
    '/api': {
      target: 'http://localhost:8000', // 若后端为 8123 则改为 8123
      changeOrigin: true,
    },
  },
},
```

2. 在 Lumina 中请求使用相对路径，例如：`fetch('/api/v1/workflows', { headers: { 'Content-Type': 'application/json' } })`。  
3. 不要将 `VITE_API_BASE_URL` 指到错误端口；若用相对路径，可不设或设为空（若你拷贝了 `workflowApi.ts`，保持 `VITE_API_BASE_URL` 为空即可走代理）。

**注意**：生产环境需在 Nginx 或网关上做同等反向代理，不能只依赖 Vite dev server。

---

### 方案 C：把工作流 UI 合并进 Lumina（工作量大）

1. 对比 [`work-flow/workflow_engine/frontend/package.json`](../workflow_engine/frontend/package.json) 与 **`lumina/package.json`**，将缺失依赖加入 Lumina（如 `@xyflow/react`、`zustand`、`@tanstack/react-query`、`@monaco-editor/react`、Radix 相关、`tailwind-merge`、`class-variance-authority` 等）。
2. 拷贝或引用子目录：`src/api`、`src/store`、`src/types`、`src/mappers`、`src/utils`、`src/components`、`src/features`（按需裁剪）。
3. 在 Lumina 中增加一个路由或步骤页，挂载工作流 [`App.tsx`](../workflow_engine/frontend/src/App.tsx) 或仅挂载 `CanvasPanel`（需外层 **`ReactFlowProvider`**，见 [`前端接入.md`](../workflow_engine/frontend/前端接入.md)）。
4. 合并 **Tailwind** 与 **全局样式**（`index.css`），避免与 Lumina 现有类名冲突；必要时用布局容器隔离。
5. 在合并后的 Vite 配置中同样配置 **`/api` 代理** 或 **`VITE_API_BASE_URL`**。

---

### 方案 D：Monorepo / npm workspace（长期维护）

将 `workflow_engine/frontend` 设为 workspace 子包，Lumina 通过 `"workspace:*"` 或 `file:../work-flow/workflow_engine/frontend` 引用。  
原则：单仓构建、统一锁文件、CI 中分别或联合构建。细节按团队包管理器（pnpm/npm/yarn）选型。

---

## 4. 与 `Step5_Orchestration` 的衔接思路

Lumina 的 [`App.tsx`](../../App.tsx) 中步骤 6 为编排（`Step5_Orchestration`）。可选衔接方式：

- **仅跳转**：打开工作流前端，用户在 5173 完成编排与保存。  
- **传参**：通过 `URL query` 传入主题或 `workflow_id`（需工作流前端支持读取，当前未在本文档范围默认实现）。  
- **API 联动**：在编排步骤调用 `generatePublicOpinionWorkflow` 或 `startConversation`，将返回的 `WorkflowDefinition` 存到 Lumina 状态或再 POST 到 `createWorkflow`。

具体产品行为需与同伴约定字段与持久化策略。

---

## 5. 最小联调检查清单

1. **健康检查**：`GET http://<后端host>:<端口>/health` 返回含 `status` 的 JSON。  
2. **列表**：`GET /api/v1/workflows`（数据库未就绪时后端可能返回空列表，属预期）。  
3. **工作流前端**：能加载列表、在聊天中发起一轮对话或生成舆情工作流（依赖 LLM Key 与网络）。  
4. **执行**：在 UI 中执行一次工作流，确认 `POST /api/v1/workflows/execute` 返回 `execution_id`，且轮询 `GET /api/v1/executions/{id}` 状态会变化。  
5. **Lumina**：若使用方案 B，在 3000 端口页面打开开发者工具，确认 `/api/v1/...` 请求被代理到正确后端且无 CORS 错误（同源代理时不应出现跨域）。

---

## 6. 相关文件速查

| 文件 | 用途 |
|------|------|
| [`lumina/vite.config.ts`](../../vite.config.ts) | Lumina 端口与可增加的 `proxy` |
| [`lumina/App.tsx`](../../App.tsx) | 步骤与编排入口 |
| [`workflow_engine/api/server.py`](../workflow_engine/api/server.py) | 路由与 CORS |
| [`workflow_engine/frontend/src/api/workflowApi.ts`](../workflow_engine/frontend/src/api/workflowApi.ts) | 前端 API 路径权威来源 |

完成以上任一对接方案后，建议把「团队统一的后端启动命令与端口」写进内部 README，避免 8000/8123 混用。
