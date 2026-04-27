# 点选数据生成报告：Backend Agents 工作流技术说明

本文档基于 `backend/` 目录当前代码，说明 **React 前端点选任意条文本数据** 后，如何通过 FastAPI 调用 LangGraph 多智能体工作流，最终生成 **Markdown 深度研判报告**。

---

## 目录结构与入口

- `backend/api.py`
  - FastAPI 服务入口：`POST /api/generate-report`
  - 接收前端传来的 `texts: string[]`，调用 `backend/workflow.py` 的 `run_workflow`
  - 配置 CORS，允许前端跨域访问
- `backend/workflow.py`
  - LangGraph 工作流编排（StateGraph）
  - 三阶段：事实锚定 → 五维并行分析 → 一致性校验/整合报告
- `backend/agents/`
  - `fact_anchor.py`：阶段一「事实锚定」Agent
  - `parallel_analysts.py`：阶段二「五维并行」Agents（异步并行）
  - `consistency_checker.py`：阶段三「一致性校验 + 生成最终 Markdown」Agent

---

## 端到端数据流（从点选到报告）

1. **前端点选数据**：用户在数据集页面勾选任意条目，前端将选中条目的 `content` 组装为 `texts: string[]`。
2. **调用后端 API**：前端发起：
   - `POST http://localhost:8000/api/generate-report`
   - Body：`{ "texts": ["文本1", "文本2", ...] }`
3. **后端运行工作流**：`backend/api.py` 校验 `texts` 非空 → 调用：
   - `run_workflow(selected_texts=texts)`
4. **输出 Markdown**：工作流返回 `final_report`（Markdown 字符串）→ API 返回：
   - `{ "report": "<markdown...>" }`

> 关键点：工作流入参是 `List[str]`，**天然支持用户选中任意数量** 的文本，不依赖固定条数。

---

## API 层实现细节（`backend/api.py`）

### 请求/响应契约

- 请求体（Pydantic）：
  - `texts: List[str]`
- 响应体：
  - `report: str`（Markdown）

### 校验与错误处理

- `texts` 过滤空字符串后若为空 → `HTTP 400`
- `run_workflow` 异常 → `HTTP 500`（封装错误信息）

### CORS

在 `CORSMiddleware` 中允许本地前端域名（项目中允许 `5173/3000` 常用端口），避免浏览器预检失败。

---

## 工作流编排（`backend/workflow.py`）

### 工作流状态 `WorkflowState`

工作流使用 `TypedDict` 定义状态（State），核心字段：

- `selected_texts: List[str]`
  - 用户点选的文本列表（工作流的唯一业务输入）
- `fact_anchor_result: Dict[str, Any]`
  - 事实锚定结构化输出（时间线/当事人/动作等）
- `parallel_results: Dict[str, str]`
  - 五维分析输出（每维一段 Markdown/文本）
- `consistency_check: bool`
  - 一致性校验结果（演示实现中通常为 True）
- `consistency_issues: str`
  - 不一致说明（如有）
- `final_report: str`
  - 最终 Markdown 报告（工作流主输出）
- `retry_count: int`
  - 重试次数
- `current_stage: str`
  - 当前阶段标记（用于进度回调）

### 节点（Nodes）

工作流由若干节点组成，每个节点是一个纯函数：输入当前 `state`，返回更新后的 `state`。

#### 1) `fact_anchor_node`

- 职责：将 `selected_texts` 汇总，交给事实锚定 Agent 提取结构化事实
- 调用：`fact_anchor_agent(state["selected_texts"])`
- 产出：`fact_anchor_result`

#### 2) `parallel_analysis_node`

- 职责：基于事实锚定结果 + 原始文本，做五维并行分析
- 并行实现：
  - 使用 `asyncio.gather(...)` 并发执行 5 个维度的分析
  - 每个维度函数通过 `asyncio.to_thread(...)` 在后台线程运行同步 LLM 调用，避免阻塞
- 维度（详见 `backend/agents/parallel_analysts.py`）：
  - `event_context`：事件脉络梳理
  - `involved_parties`：涉事主体汇总
  - `core_demands`：核心诉求结论
  - `emotion_evolution`：情感流程演变
  - `risk_warnings`：潜在风险预警

#### 3) `consistency_check_node`

- 职责：对五维结果做逻辑交叉校验，并在通过校验的前提下 **整合生成最终 Markdown 报告**
- 调用：`consistency_checker_agent(fact_result, parallel_results)`
- 产出：`final_report`

#### 4) 重试与强制生成（演示环境）

工作流包含重试机制，但为避免耗时，默认 `max_retries = 1`：

- `should_retry(state)`
  - 通过：结束（END）
  - 未通过且未超限：进入 `retry_node`，回到并行分析
  - 超限：进入 `force_generate_node`，强制整合生成

> 注：当前 `consistency_checker_agent` 的实现偏“演示模式”，在多数情况下直接返回可用的 Markdown 报告，并将 `is_consistent` 视为 True，以确保稳定产出。

### `run_workflow(...)` 的执行方式

`run_workflow` 会：

1. `create_workflow()` 编译 `StateGraph`
2. 构造 `initial_state`（包含 `selected_texts`）
3. 通过 `app.stream(initial_state)` 流式迭代各节点更新
4. 可选 `progress_callback(stage, message)` 在阶段切换时回调（前端若需要进度可扩展接口）
5. 返回 `final_report`
6. 若 `final_report` 为空，会尝试 `generate_final_report(force_generate=True)` 兜底

此外，为避免 Windows + uvicorn 某些场景 stdout 管道关闭导致 `print` 抛 `WinError 233`，工作流使用 `_safe_print(...)`：日志输出失败不会影响主流程。

---

## Agent 实现（`backend/agents/*`）

### 统一的 LLM 选择策略

三个 agent 文件均提供 `get_llm()`，通过环境变量决定使用哪个模型提供方：

- `DEEPSEEK_API_KEY`（OpenAI 兼容 base_url：`https://api.deepseek.com`）
  - 可选：`DEEPSEEK_MODEL`（默认 `deepseek-chat`）
- `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`
- `OPENAI_API_KEY`（默认 `gpt-4`）
- `ANTHROPIC_API_KEY`（默认 `claude-3-sonnet-20240229`）

并使用 `python-dotenv` 的 `load_dotenv()` 支持从 `.env` 加载。

---

### 阶段一：事实锚定（`fact_anchor.py`）

**输入**：`selected_texts: List[str]`

**做法**：

- 将多条文本拼成：
  - `文本 1:\n...\n\n文本 2:\n...`
- 使用系统提示词约束角色为“首席事实官”，要求严格基于文本提取：
  - 时间线 timeline
  - 核心当事人 core_parties
  - 已发生动作 actions
- 模型输出期望为 JSON，但实现中会：
  - 用正则提取 `{...}` 块尝试 `json.loads`
  - 解析失败则回退为包含 `raw_analysis` 的结构

**输出**：`Dict[str, Any]`，至少包含：

- `timeline: []`
- `core_parties: []`
- `actions: []`
- `raw_analysis: str`

> 设计意图：后续多维分析依赖“事实锚定”作为全局上下文锚点，减少幻觉与跑题。

---

### 阶段二：五维并行分析（`parallel_analysts.py`）

**输入**：

- `fact_anchor_result: Dict[str, Any]`
- `selected_texts: List[str]`

**做法**：

每个维度一个函数（同步），并提供对应的异步包装（`asyncio.to_thread`）：

- `analyze_event_context(_async)`
- `analyze_involved_parties(_async)`
- `analyze_core_demands(_async)`
- `analyze_emotion_evolution(_async)`
- `analyze_risk_warnings(_async)`

提示词统一风格：要求“详实、专业、避免空话套话”，并同时提供：

- 事实锚定摘要（timeline/core_parties/actions）
- 原始文本拼接内容

**输出**：每维返回 `str`（可直接作为报告段落）。

**并发策略**：

在 `workflow.parallel_analysis_node` 中用 `asyncio.gather` 并行执行 5 个维度，显著降低总耗时（受模型响应时间影响）。

---

### 阶段三：一致性校验与最终报告（`consistency_checker.py`）

**输入**：

- `fact_anchor_result`
- `parallel_results`

**做法**：

- 将五维结果拼成一个多段摘要 `analysis_summary`
- 将事实锚定拼成 `facts_str`
- 使用“报告总审校”系统提示词：
  - 检查严重逻辑矛盾
  - 验证诉求与风险对应
  - 与事实锚定保持基本一致
- **输出要求**：只输出最终 Markdown 报告正文，不输出 JSON/解释

**输出**：

- `consistency_checker_agent(...) -> (is_consistent, final_report, issues)`
  - 当前实现为演示稳定性优先：一般直接返回 `True, report, ""`

同时提供：

- `generate_final_report(..., force_generate: bool)`
  - 在重试超限或异常兜底时强制整合生成报告

---

## 可扩展点（工程化建议）

1. **流式进度/分段返回**
   - `run_workflow` 已支持 `progress_callback`；可在 `api.py` 增加 WebSocket/SSE，把阶段进度推送给前端
2. **输入结构升级**
   - 当前仅传 `texts: string[]`，若要“证据溯源/可追踪”，建议传入 `{id, text, meta}`，在报告中保留引用 id
3. **限流与保护**
   - 对 `texts` 数量、单条长度、总字符数做限制，避免极端输入造成超时或费用不可控
4. **一致性校验增强**
   - 当前校验偏演示模式；可让模型输出结构化矛盾点与修订建议，再决定重试或强制生成

---

## 快速自检

- 后端启动：
  - `python -m uvicorn backend.api:app --reload --port 8000`
- 接口测试：
  - `POST /api/generate-report`，body 带 `texts`
- 环境变量：
  - `.env` 至少提供一个可用的 LLM API Key（DeepSeek/OpenAI/Anthropic/Azure）


