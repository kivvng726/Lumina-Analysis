/**
 * 将 work-flow 后端的 WorkflowDefinition（与 frontend/src/mappers/workflowGraph.ts 同源逻辑）
 * 转为 Lumina 编排页使用的画布节点/边（非 @xyflow，仅为绝对定位卡片 + SVG 连线）。
 */

export type OrchestrationUiNodeType = 'input' | 'agent' | 'output';

export interface OrchestrationWorkflowNode {
  id: string;
  type: OrchestrationUiNodeType;
  /** 后端原始 type，如 DataCollection、SentimentAnalysis */
  backendType?: string;
  label: string;
  model?: string;
  x: number;
  y: number;
  status: 'pending' | 'generating' | 'running' | 'completed';
  progress: number;
  logs: string[];
  color: string;
}

export interface OrchestrationWorkflowEdge {
  id: string;
  source: string;
  target: string;
}

/** 与 workflowGraph.ts 一致的网格落位 */
const X_GAP = 220;
const Y_GAP = 120;
const START_X = 80;
const START_Y = 120;

interface ApiWorkflowNode {
  id?: string;
  type?: string;
  config?: {
    title?: string;
    description?: string;
    params?: Record<string, unknown>;
  };
  position?: { x: number; y: number };
  x?: number;
  y?: number;
}

interface ApiWorkflowEdge {
  source: string;
  target: string;
}

function getNodePosition(node: ApiWorkflowNode, index: number): { x: number; y: number } {
  if (
    node.position &&
    Number.isFinite(node.position.x) &&
    Number.isFinite(node.position.y)
  ) {
    return { x: node.position.x, y: node.position.y };
  }
  if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
    return { x: Number(node.x), y: Number(node.y) };
  }
  return {
    x: START_X + (index % 4) * X_GAP,
    y: START_Y + Math.floor(index / 4) * Y_GAP,
  };
}

function mapBackendTypeToUiType(backendType: string): OrchestrationUiNodeType {
  const t = (backendType || '').trim().toLowerCase();
  if (t === 'start') return 'input';
  if (t === 'end') return 'output';
  return 'agent';
}

function colorForNode(uiType: OrchestrationUiNodeType, backendType: string): string {
  if (uiType === 'input') return 'bg-slate-800';
  if (uiType === 'output') return 'bg-green-600';
  const b = backendType.toLowerCase();
  if (b.includes('sentiment') || b.includes('情感')) return 'bg-blue-600';
  if (b.includes('collect') || b.includes('data') || b.includes('数据')) return 'bg-amber-600';
  if (b.includes('report') || b.includes('报告')) return 'bg-emerald-600';
  if (b.includes('filter') || b.includes('过滤')) return 'bg-orange-600';
  return 'bg-indigo-600';
}

/** 对齐 workflowGraph.normalizeWorkflowDefinition */
function normalizeDefinition(workflow: {
  nodes?: unknown[];
  edges?: unknown[];
}): { nodes: ApiWorkflowNode[]; edges: ApiWorkflowEdge[] } {
  const rawNodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const nodes: ApiWorkflowNode[] = rawNodes.map((item, index) => {
    const node = item as ApiWorkflowNode;
    const id = node.id || `node_${index + 1}`;
    const type = node.type || 'Code';
    const title =
      node.config?.title || `${type} 节点`;
    return {
      ...node,
      id,
      type,
      config: {
        ...(node.config ?? {}),
        title,
        params: node.config?.params ?? {},
      },
    };
  });

  const nodeIdSet = new Set(nodes.map((n) => n.id as string));
  const rawEdges = Array.isArray(workflow.edges) ? workflow.edges : [];
  const edges = rawEdges
    .map((e) => e as ApiWorkflowEdge)
    .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

  return { nodes, edges };
}

export function workflowDefinitionToOrchestrationState(workflow: {
  name?: string;
  description?: string;
  nodes?: unknown[];
  edges?: unknown[];
}): {
  nodes: OrchestrationWorkflowNode[];
  edges: OrchestrationWorkflowEdge[];
} {
  const { nodes: normNodes, edges: normEdges } = normalizeDefinition(workflow);

  const nodes: OrchestrationWorkflowNode[] = normNodes.map((node, index) => {
    const pos = getNodePosition(node, index);
    const backendType = node.type || 'Code';
    const uiType = mapBackendTypeToUiType(backendType);
    const title = node.config?.title || node.id || `node_${index}`;
    const params = node.config?.params;
    const modelFromParams =
      params && typeof params.model === 'string' ? params.model : undefined;

    const logs: string[] = [
      `后端类型: ${backendType}`,
      ...(node.config?.description
        ? [String(node.config.description).slice(0, 72)]
        : ['等待执行...']),
    ];

    return {
      id: node.id as string,
      type: uiType,
      backendType,
      label: title,
      model:
        modelFromParams ??
        (uiType === 'agent' ? backendType : undefined),
      x: pos.x,
      y: pos.y,
      status: 'pending',
      progress: 0,
      logs,
      color: colorForNode(uiType, backendType),
    };
  });

  const edges: OrchestrationWorkflowEdge[] = normEdges.map((edge, i) => ({
    id: `e-${edge.source}-${edge.target}-${i + 1}`,
    source: edge.source,
    target: edge.target,
  }));

  return { nodes, edges };
}
