import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Play, Plus, ArrowRight, Bot, Database, Sparkles, Command, Mic, Cpu, Loader2, Trash2, Link2, Save } from 'lucide-react';
import {
  workflowDefinitionToOrchestrationState,
  type OrchestrationWorkflowNode as WorkflowNode,
  type OrchestrationWorkflowEdge as WorkflowEdge,
} from '../mappers/workflowDefinitionToOrchestration';

interface Props {
  onComplete: () => void;
}

/** 与 work-flow/workflow_engine/frontend/src/api/workflowApi.ts 中 generatePublicOpinionWorkflow 一致；经 Lumina Vite 代理到后端 */
type PublicOpinionGenerateRequest = {
  topic: string;
  requirements?: Record<string, unknown>;
  model?: string;
};

type PublicOpinionGenerateResponse = {
  workflow: { name?: string; description?: string; nodes?: unknown[]; edges?: unknown[] };
  status: string;
  metadata?: Record<string, unknown>;
};

async function generatePublicOpinionWorkflow(
  payload: PublicOpinionGenerateRequest
): Promise<PublicOpinionGenerateResponse> {
  const response = await fetch('/api/v1/workflows/generate-public-opinion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? JSON.stringify((body as { detail: unknown }).detail)
        : String(body ?? response.statusText);
    throw new Error(detail || `HTTP ${response.status}`);
  }

  return body as PublicOpinionGenerateResponse;
}

const INITIAL_NODES_TEMPLATE: WorkflowNode[] = [
  { 
    id: 'n1', type: 'input', label: '数据集输入', x: 100, y: 300, 
    status: 'completed', progress: 100, logs: ['加载 Dataset #202601...', '数据完整性校验通过'], color: 'bg-slate-800' 
  },
  { 
    id: 'n2', type: 'agent', label: '情感极性分析', model: 'Gemini-Flash', x: 350, y: 300, 
    status: 'pending', progress: 0, logs: ['等待上游数据...'], color: 'bg-blue-600' 
  },
  { 
    id: 'n3', type: 'agent', label: '风险预警识别', model: 'Gemini-Pro', x: 600, y: 300, 
    status: 'pending', progress: 0, logs: ['等待上游数据...'], color: 'bg-red-600' 
  },
  { 
    id: 'n4', type: 'output', label: '报告生成', model: 'Report-v2', x: 850, y: 300, 
    status: 'pending', progress: 0, logs: ['等待分析结果...'], color: 'bg-green-600' 
  },
];

const TOOLS = [
    { id: 't1', label: '竞品对比 Agent', icon: <Bot className="w-4 h-4" /> },
    { id: 't2', label: '观点聚类 Agent', icon: <Cpu className="w-4 h-4" /> },
    { id: 't3', label: '关键词云提取', icon: <Database className="w-4 h-4" /> },
];

export const Step5_Orchestration: React.FC<Props> = ({ onComplete }) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotActive, setIsCopilotActive] = useState(false);
  const [isGrowing, setIsGrowing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [workflowApiHint, setWorkflowApiHint] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeEditorDraft, setNodeEditorDraft] = useState<{
    label: string;
    model: string;
    logsText: string;
  }>({ label: '', model: '', logsText: '' });
  const [edgeTargetIdDraft, setEdgeTargetIdDraft] = useState<string>('');
  const growthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const stopDemoGrowth = () => {
    if (growthIntervalRef.current !== null) {
      clearInterval(growthIntervalRef.current);
      growthIntervalRef.current = null;
    }
    setIsGrowing(false);
  };

  // --- 1. Growth Animation (Init)，可被「从后端生成」打断 ---
  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
        if (step >= INITIAL_NODES_TEMPLATE.length) {
            clearInterval(interval);
            growthIntervalRef.current = null;
            setIsGrowing(false);
            return;
        }

        const newNode = INITIAL_NODES_TEMPLATE[step];
        setNodes(prev => [...prev, newNode]);

        if (step > 0) {
            const prevNode = INITIAL_NODES_TEMPLATE[step - 1];
            setEdges(prev => [...prev, { 
                id: `e-${prevNode.id}-${newNode.id}`, 
                source: prevNode.id, 
                target: newNode.id 
            }]);
        }
        step++;
    }, 600); // Growth speed
    growthIntervalRef.current = interval;
    return () => {
      clearInterval(interval);
      growthIntervalRef.current = null;
    };
  }, []);

  // --- 2. Copilot Interaction Logic ---
  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    setIsCopilotActive(true);
    
    // Simulate parsing and modification
    setTimeout(() => {
        if (copilotInput.includes("诉求") || copilotInput.includes("需求")) {
            insertNodeLogic('n_demand', '诉求挖掘 Agent', 'n2', 'n3');
        } else if (copilotInput.includes("竞品")) {
             // Append branch logic demo (simplified to insert)
             insertNodeLogic('n_competitor', '竞品对比 Agent', 'n2', 'n3');
        }
        setCopilotInput('');
        setIsCopilotActive(false);
    }, 1500);
  };

  const insertNodeLogic = (newId: string, label: string, sourceId: string, targetId: string) => {
      // 1. Find positions
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);
      if (!sourceNode || !targetNode) return;

      const newX = (sourceNode.x + targetNode.x) / 2;
      const newY = sourceNode.y; // Linear layout for demo

      // 2. Shift downstream nodes right to make space
      setNodes(prev => prev.map(n => {
          if (n.x >= targetNode.x) return { ...n, x: n.x + 200 };
          return n;
      }));

      // 3. Create new node
      const newNode: WorkflowNode = {
          id: newId,
          type: 'agent',
          label: label,
          model: 'Gemini-Ultra',
          x: newX, // Initially overlap, will transition
          y: newY - 50, // Drop from above animation effect
          status: 'generating', // Special status for "Prompt Generating..."
          progress: 0,
          logs: ['正在生成 Prompt...', '分析用户指令...', '优化上下文窗口...'],
          color: 'bg-purple-600'
      };

      // 4. Update topology
      setNodes(prev => {
           // Insert new node and shift others
           const others = prev.map(n => n.x >= targetNode.x ? { ...n, x: n.x + 200 } : n);
           return [...others, { ...newNode, y: newY }]; // Animate Y drop
      });

      // 5. Update Edges
      setEdges(prev => {
          const filtered = prev.filter(e => !(e.source === sourceId && e.target === targetId));
          return [
              ...filtered,
              { id: `e-${sourceId}-${newId}`, source: sourceId, target: newId },
              { id: `e-${newId}-${targetId}`, source: newId, target: targetId }
          ];
      });

      // 6. Simulate Prompt Generation completion
      setTimeout(() => {
          setNodes(prev => prev.map(n => n.id === newId ? { 
              ...n, 
              status: 'pending', 
              logs: ['Prompt 生成完毕', '等待运行...'] 
          } : n));
      }, 2000);
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    if (!selectedNode) {
      setNodeEditorDraft({ label: '', model: '', logsText: '' });
      setEdgeTargetIdDraft('');
      return;
    }
    setNodeEditorDraft({
      label: selectedNode.label ?? '',
      model: selectedNode.model ?? '',
      logsText: Array.isArray(selectedNode.logs) ? selectedNode.logs.join('\n') : '',
    });
    setEdgeTargetIdDraft('');
  }, [selectedNodeId, selectedNode]);

  const addManualNode = () => {
    stopDemoGrowth();
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 480;
    const centerY = rect ? rect.height / 2 : 280;

    const id = `node_${Date.now()}`;
    const node: WorkflowNode = {
      id,
      type: 'agent',
      label: '新节点',
      model: '',
      x: centerX,
      y: centerY,
      status: 'pending',
      progress: 0,
      logs: ['手动创建的节点', '可编辑标题/模型/日志'],
      color: 'bg-indigo-600',
    };
    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(id);
    setWorkflowApiHint('已新增节点：请在右侧编辑内容');
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const id = selectedNodeId;
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
    setWorkflowApiHint(`已删除节点：${id}`);
  };

  const saveSelectedNodeEdits = () => {
    if (!selectedNodeId) return;
    const nextLogs = nodeEditorDraft.logsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              label: nodeEditorDraft.label.trim() || n.label,
              model: nodeEditorDraft.model.trim() || undefined,
              logs: nextLogs.length ? nextLogs : n.logs,
            }
          : n
      )
    );
    setWorkflowApiHint('节点内容已保存（仅前端状态）');
  };

  const addEdgeFromSelectedTo = () => {
    if (!selectedNodeId) return;
    const targetId = edgeTargetIdDraft;
    if (!targetId) return;
    if (targetId === selectedNodeId) return;
    const exists = edges.some((e) => e.source === selectedNodeId && e.target === targetId);
    if (exists) {
      setWorkflowApiHint('该连线已存在');
      return;
    }
    const id = `e-${selectedNodeId}-${targetId}-${Date.now()}`;
    setEdges((prev) => [...prev, { id, source: selectedNodeId, target: targetId }]);
    setWorkflowApiHint(`已新增连线：${selectedNodeId} → ${targetId}`);
  };

  const handleGenerateFromBackend = async () => {
    setWorkflowApiHint(null);
    setIsGeneratingWorkflow(true);
    try {
      const result = await generatePublicOpinionWorkflow({
        topic: '新能源汽车行业发展趋势',
        requirements: {
          analysis_depth: 'comprehensive',
          time_range: '最近3个月',
        },
        model: 'deepseek-chat',
      });
      console.log('[generate-public-opinion] 响应:', result);

      stopDemoGrowth();
      const wf = result.workflow;
      if (!wf || !Array.isArray(wf.nodes)) {
        throw new Error('响应中缺少 workflow.nodes');
      }
      const { nodes: nextNodes, edges: nextEdges } =
        workflowDefinitionToOrchestrationState(wf);
      setNodes(nextNodes);
      setEdges(nextEdges);

      const name = wf.name ?? '（未返回名称）';
      setWorkflowApiHint(
        `已载入后端工作流：${name}（${nextNodes.length} 个节点，${nextEdges.length} 条边）`
      );
    } catch (err) {
      console.error('[generate-public-opinion] 失败:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setWorkflowApiHint(`生成失败：${msg}`);
      window.alert(`生成失败：${msg}`);
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };

  // --- 3. Run Workflow Simulation ---
  const handleRun = () => {
      setIsRunning(true);
      
      const sequence = nodes.map(n => n.id);
      let currentIndex = 0;

      const processNode = () => {
          if (currentIndex >= sequence.length) {
              setIsRunning(false);
              setTimeout(onComplete, 1000);
              return;
          }

          const nodeId = sequence[currentIndex];
          
          // Set to running
          setNodes(prev => prev.map(n => n.id === nodeId ? { 
              ...n, 
              status: 'running',
              logs: [...n.logs, '正在处理数据块...', '调用 LLM API...', '聚合结果...']
          } : n));

          // Progress animation
          let progress = 0;
          const progressInterval = setInterval(() => {
              progress += 10;
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, progress } : n));
              if (progress >= 100) {
                  clearInterval(progressInterval);
                  // Complete
                  setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'completed' } : n));
                  currentIndex++;
                  processNode();
              }
          }, 150); // Speed of each node
      };

      processNode();
  };

  const endNodeDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDraggingNodeId(null);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    if (e.button !== 0) return;
    setSelectedNodeId(nodeId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    dragRef.current = { id: nodeId, offX: mx - node.x, offY: my - node.y };
    setDraggingNodeId(nodeId);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handleNodePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== nodeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nx = mx - drag.offX;
    const ny = my - drag.offY;
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x: nx, y: ny } : n))
    );
  };

  // --- Helpers ---
  const getPath = (edge: WorkflowEdge) => {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (!src || !tgt) return '';
      
      // Bezier curve
      const c1x = src.x + 100;
      const c1y = src.y;
      const c2x = tgt.x - 100;
      const c2y = tgt.y;
      
      return `M ${src.x} ${src.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tgt.x} ${tgt.y}`;
  };

  return (
    <div className="w-full min-h-screen relative bg-slate-50 overflow-hidden flex flex-col pt-12">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
             backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
        }} 
      />

      {/* --- Toolbar (Left) --- */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <button
                type="button"
                onClick={addManualNode}
                className="w-10 h-10 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                title="新增节点"
              >
                  <Plus className="w-5 h-5" />
              </button>
              {TOOLS.map(tool => (
                  <div 
                    key={tool.id} 
                    className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-grab active:cursor-grabbing transition-colors group relative"
                    title={tool.label}
                    draggable
                    onDragEnd={() => {
                        // Mock drop logic
                        if (tool.id === 't1') insertNodeLogic('n_comp', '竞品对比 Agent', 'n2', 'n3');
                    }}
                  >
                      {tool.icon}
                      <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {tool.label}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* --- Header (Right)：同伴 work-flow 后端生成 + 本地演示运行 --- */}
      <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleGenerateFromBackend}
              disabled={isGeneratingWorkflow}
              className="px-4 py-2.5 rounded-full font-medium shadow-lg border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isGeneratingWorkflow ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGeneratingWorkflow ? '正在请求后端…' : '从后端生成舆情工作流'}
            </button>
            <button 
              onClick={handleRun}
              disabled={isRunning || isGrowing}
              className={`
                px-6 py-2.5 rounded-full font-medium shadow-xl flex items-center gap-2 transition-all active:scale-95
                ${isRunning ? 'bg-white text-slate-400 border border-slate-200' : 'bg-slate-900 text-white hover:bg-black'}
            `}
            >
              <Play className={`w-4 h-4 ${isRunning ? 'text-green-500' : 'fill-current'}`} />
              {isRunning ? '工作流运行中...' : '启动工作流'}
            </button>
          </div>
          {workflowApiHint ? (
            <p className="max-w-sm text-right text-xs text-slate-600 bg-white/90 border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              {workflowApiHint}
            </p>
          ) : null}
      </div>

      {/* --- Node Editor (Right Drawer) --- */}
      {selectedNode ? (
        <div className="absolute top-24 right-6 z-20 w-[360px] max-w-[92vw] bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs text-slate-400 font-mono truncate">选中节点：{selectedNode.id}</div>
              <div className="text-sm font-bold text-slate-800 truncate">{selectedNode.label}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded"
              title="关闭"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3">
            <label className="block">
              <div className="text-xs font-bold text-slate-600 mb-1">标题</div>
              <input
                value={nodeEditorDraft.label}
                onChange={(e) => setNodeEditorDraft((d) => ({ ...d, label: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-blue-50"
                placeholder="节点标题（显示在卡片上）"
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-slate-600 mb-1">模型（可选）</div>
              <input
                value={nodeEditorDraft.model}
                onChange={(e) => setNodeEditorDraft((d) => ({ ...d, model: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-blue-50"
                placeholder="例如：deepseek-chat / gpt-4o-mini"
              />
            </label>

            <label className="block">
              <div className="text-xs font-bold text-slate-600 mb-1">日志 / 描述（每行一条）</div>
              <textarea
                value={nodeEditorDraft.logsText}
                onChange={(e) => setNodeEditorDraft((d) => ({ ...d, logsText: e.target.value }))}
                className="w-full min-h-[110px] rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:ring-4 focus:ring-blue-50"
                placeholder="比如：\n后端类型: SentimentAnalysis\n分析用户情绪倾向…"
              />
            </label>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={saveSelectedNodeEdits}
                className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存节点
              </button>
              <button
                type="button"
                onClick={deleteSelectedNode}
                className="px-3 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                title="删除节点（会移除相关连线）"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-600 mb-2">新增连线（从当前节点出发）</div>
              <div className="flex items-center gap-2">
                <select
                  value={edgeTargetIdDraft}
                  onChange={(e) => setEdgeTargetIdDraft(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none bg-white"
                >
                  <option value="">选择目标节点…</option>
                  {nodes
                    .filter((n) => n.id !== selectedNode.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.id})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={addEdgeFromSelectedTo}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2"
                  title="新增连线"
                >
                  <Link2 className="w-4 h-4" />
                  连线
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- Infinite Canvas --- */}
      {/* flex-1 内子节点均为 absolute，无文档流高度，必须给容器显式 min-height，否则画布高度为 0 会整页空白 */}
      <div
        ref={canvasRef}
        className="flex-1 relative w-full overflow-hidden min-h-[calc(100vh-11rem)]"
      >
          {/* 点击空白取消选中 */}
          <div
            className="absolute inset-0"
            onPointerDown={(e) => {
              if (draggingNodeId) return;
              // 只有点到空白处才取消；节点本身会 stop via pointer capture
              if (e.target === e.currentTarget) setSelectedNodeId(null);
            }}
          />
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {edges.map(edge => (
                  <path 
                    key={edge.id}
                    d={getPath(edge)}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    fill="none"
                    className="transition-all duration-500"
                  />
              ))}
              {/* Running Particle */}
              {isRunning && nodes.some(n => n.status === 'running') && (
                   <circle r="4" fill="#3b82f6" filter="url(#glow)">
                       <animateMotion 
                          dur="1s" 
                          repeatCount="indefinite"
                          path={getPath(edges.find(e => {
                              const sourceNode = nodes.find(n => n.id === e.source);
                              return sourceNode && sourceNode.status === 'completed';
                          }) || edges[0])}
                       />
                   </circle>
              )}
              <defs>
                  <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
              </defs>
          </svg>

          {nodes.map(node => (
              <div
                 key={node.id}
                 role="presentation"
                 onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                 onPointerMove={(e) => handleNodePointerMove(e, node.id)}
                 onPointerUp={endNodeDrag}
                 onPointerCancel={endNodeDrag}
                 onLostPointerCapture={() => {
                   dragRef.current = null;
                   setDraggingNodeId(null);
                 }}
                 style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
                 className={`
                    absolute w-[220px] bg-white rounded-2xl shadow-lg border group touch-none select-none
                    ${draggingNodeId === node.id ? 'z-30 cursor-grabbing shadow-xl transition-none' : 'z-10 cursor-grab transition-all duration-500'}
                    ${node.status === 'running' ? 'border-blue-500 shadow-blue-200 ring-4 ring-blue-50 scale-105' : 'border-slate-200'}
                    ${node.status === 'generating' ? 'border-purple-500 shadow-purple-200 animate-pulse' : ''}
                    ${selectedNodeId === node.id ? 'ring-2 ring-violet-300 border-violet-300' : ''}
                 `}
              >
                  {/* Node Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${node.status === 'running' ? 'bg-green-500 animate-pulse' : node.status === 'completed' ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="font-bold text-slate-700 text-sm">{node.label}</span>
                      </div>
                      {node.model && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              <Bot className="w-3 h-3" />
                              {node.model}
                          </div>
                      )}
                  </div>

                  {/* Node Body: Terminal Log */}
                  <div className="p-4 bg-white h-[80px] overflow-hidden relative">
                      <div className="space-y-1">
                          {node.logs.slice(-3).map((log, i) => (
                              <div key={i} className="text-[10px] text-slate-500 font-mono truncate animate-slide-down">
                                  {'>'} {log}
                              </div>
                          ))}
                          {node.status === 'running' && (
                              <div className="text-[10px] text-blue-500 font-mono animate-pulse">_</div>
                          )}
                      </div>
                      {/* Gradient fade */}
                      <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent" />
                  </div>

                  {/* Progress Bar */}
                  {node.progress > 0 && (
                      <div className="h-1 w-full bg-slate-100 rounded-b-2xl overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-200 ${node.color}`} 
                            style={{ width: `${node.progress}%` }} 
                          />
                      </div>
                  )}

                  {/* Handles */}
                  <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-300 rounded-full" />
                  <div className="absolute top-1/2 -right-1 w-2 h-2 bg-slate-300 rounded-full" />
              </div>
          ))}
      </div>

      {/* --- Copilot Bar (Bottom) --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl z-30">
          <form 
            onSubmit={handleCopilotSubmit}
            className={`
                bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-2 flex items-center gap-3 transition-all duration-300
                ${isCopilotActive ? 'ring-4 ring-purple-100 border-purple-300 scale-105' : 'hover:scale-[1.01]'}
            `}
          >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                  {isCopilotActive ? <Sparkles className="w-5 h-5 animate-spin" /> : <Command className="w-5 h-5" />}
              </div>
              
              <input 
                type="text" 
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Copilot: 输入指令修改画布 (例如：'添加诉求挖掘步骤'，'加入竞品对比')..."
                className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400 text-sm font-medium h-full py-2"
              />

              <div className="flex items-center gap-2 pr-2">
                  <button type="button" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <Mic className="w-4 h-4" />
                  </button>
                  <button 
                    type="submit"
                    disabled={!copilotInput.trim()} 
                    className="bg-slate-900 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-black"
                  >
                      <ArrowRight className="w-4 h-4" />
                  </button>
              </div>
          </form>
          
          {/* Helper Text */}
          {!isCopilotActive && (
             <div className="text-center mt-3 text-xs text-slate-400 font-medium animate-pulse">
                 ✨ 试着输入: "在情感分析后增加诉求挖掘"
             </div>
          )}
      </div>

    </div>
  );
};
