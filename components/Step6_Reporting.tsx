import React, { useState, useRef, useEffect } from 'react';
import { 
  Layout, AlignLeft, BarChart2, Quote, Wand2, MoreVertical, 
  Trash2, Plus, ChevronRight, X, Save, Printer, Type, 
  PieChart, LineChart, Image as ImageIcon, Sparkles, GripVertical, FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LineChart as RechartsLineChart, Line } from 'recharts';
import { MOCK_COMMENTS } from '../constants';
import ReactMarkdown from 'react-markdown';

// --- Types & Mock Data ---

type BlockType = 'h1' | 'h2' | 'text' | 'chart' | 'quote' | 'insight';

interface Block {
  id: string;
  type: BlockType;
  content: string; // Text content or Chart Title
  chartType?: 'bar' | 'line';
  data?: any[]; // Mock chart data
  traceable?: {
    keyword: string;
    evidenceIds: string[];
  };
}

const MOCK_CHART_DATA = [
    { name: '1月1日', value: 400 },
    { name: '1月2日', value: 300 },
    { name: '1月3日', value: 600 },
    { name: '1月4日', value: 800 },
    { name: '1月5日', value: 500 },
];

const INITIAL_BLOCKS: Block[] = [
  { id: 'b1', type: 'h1', content: '深度舆情洞察报告' },
  { id: 'b2', type: 'text', content: 'Lumina Analysis #20260124 • 自动生成' },
  { id: 'b3', type: 'h2', content: '1. 电池续航争议分析' },
  { 
    id: 'b4', 
    type: 'text', 
    content: '用户普遍反映车辆在冬季低温环境下，续航里程缩水超过 40%。这一数据与官方宣称的 WLTP 续航存在显著差异，引发了关于“虚假宣传”的广泛讨论。',
    traceable: {
      keyword: '续航里程缩水超过 40%',
      evidenceIds: ['3', '6', '8']
    }
  },
  { 
    id: 'b5', 
    type: 'chart', 
    content: '续航相关负面声量趋势',
    chartType: 'bar',
    data: MOCK_CHART_DATA
  },
  { id: 'b6', type: 'h2', content: '2. 关键风险预警' },
  { 
    id: 'b7', 
    type: 'insight', 
    content: '监测到高风险关键词聚类：“集体诉讼”与“退一赔三”。已有核心 KOL 开始组织维权群，且负面情绪在官方冷处理后呈现指数级上升。',
    traceable: {
        keyword: '负面情绪在官方冷处理后呈现指数级上升',
        evidenceIds: ['3', '10']
    }
  },
  { 
    id: 'b8', 
    type: 'quote', 
    content: '我们正在组织关于幽灵刹车问题的集体诉讼，请受害者联系。',
    traceable: { keyword: '', evidenceIds: ['10'] } 
  },
  { id: 'b9', type: 'h2', content: '3. 品牌公关建议' },
  { 
    id: 'b10', 
    type: 'text', 
    content: '建议立即停止技术辩解，转为共情沟通。优先处理极端案例，并考虑推出冬季专属的关怀政策（如免费检测、充电权益）以平息怒火。' 
  }
];

interface Step6ReportingProps {
  agentReport: string;
  isLoading: boolean;
  error: string | null;
  onGenerateReport: () => void;
}

export const Step6_Reporting: React.FC<Step6ReportingProps> = ({
  agentReport,
  isLoading,
  error,
  onGenerateReport,
}) => {
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'none' | 'evidence' | 'chart' | 'ai'>('none');
  const [evidenceContext, setEvidenceContext] = useState<{ keyword: string, ids: string[] }>({ keyword: '', ids: [] });
  const [showSlashMenu, setShowSlashMenu] = useState<{ id: string, visible: boolean }>({ id: '', visible: false });
  const [isSaving, setIsSaving] = useState(false);

  // --- Handlers ---

  const handleBlockClick = (block: Block) => {
    setActiveBlockId(block.id);
    if (block.type === 'chart') {
      setSidebarMode('chart');
    } else if (sidebarMode === 'chart') {
      setSidebarMode('none');
    }
    // Don't auto-close evidence sidebar to allow reading while navigating
  };

  const handleTraceClick = (e: React.MouseEvent, keyword: string, ids: string[]) => {
    e.stopPropagation();
    setEvidenceContext({ keyword, ids });
    setSidebarMode('evidence');
  };

  const handleChartTypeChange = (type: 'bar' | 'line') => {
    if (activeBlockId) {
      setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...b, chartType: type } : b));
    }
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (activeBlockId === id) {
        setActiveBlockId(null);
        setSidebarMode('none');
    }
  };

  const addBlock = (afterId: string, type: BlockType) => {
    const index = blocks.findIndex(b => b.id === afterId);
    const newBlock: Block = {
        id: `new-${Date.now()}`,
        type,
        content: type === 'h2' ? '新章节标题' : type === 'chart' ? '新增数据图表' : type === 'quote' ? '点击引用证据' : '点击输入内容...',
        chartType: type === 'chart' ? 'bar' : undefined,
        data: type === 'chart' ? MOCK_CHART_DATA : undefined
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setShowSlashMenu({ id: '', visible: false });
    setActiveBlockId(newBlock.id);
  };

  const handleAiRewrite = () => {
      setIsSaving(true);
      setTimeout(() => {
          setBlocks(prev => prev.map(b => b.id === activeBlockId ? { ...b, content: b.content + ' (AI 已优化措辞)' } : b));
          setIsSaving(false);
      }, 1000);
  };

  // --- Renderers ---

  const renderBlockContent = (block: Block) => {
    switch (block.type) {
        case 'h1':
            return <h1 className="text-4xl font-bold text-slate-900 leading-tight">{block.content}</h1>;
        case 'h2':
            return <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-2 border-b border-slate-100 pb-2">{block.content}</h2>;
        case 'text':
        case 'insight':
            const isInsight = block.type === 'insight';
            if (!block.traceable) return <p className={`leading-relaxed text-slate-700 ${isInsight ? 'font-medium' : ''}`}>{block.content}</p>;
            
            const parts = block.content.split(block.traceable.keyword);
            return (
                <p className={`leading-relaxed text-slate-700 ${isInsight ? 'font-medium' : ''}`}>
                    {parts[0]}
                    <span 
                        onClick={(e) => handleTraceClick(e, block.traceable!.keyword, block.traceable!.evidenceIds)}
                        className={`
                            border-b-2 cursor-pointer transition-colors px-0.5 rounded
                            ${sidebarMode === 'evidence' && evidenceContext.keyword === block.traceable!.keyword 
                                ? 'bg-yellow-100 border-yellow-400 text-slate-900' 
                                : 'border-blue-300 text-slate-800 hover:bg-blue-50'}
                        `}
                    >
                        {block.traceable.keyword}
                    </span>
                    {parts[1]}
                </p>
            );
        case 'chart':
            return (
                <div className="w-full h-64 bg-slate-50 rounded-lg border border-slate-100 p-4 relative pointer-events-none">
                    <h4 className="text-xs font-bold text-slate-500 text-center mb-2 uppercase">{block.content}</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        {block.chartType === 'line' ? (
                            <RechartsLineChart data={block.data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <RechartsTooltip />
                                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{r: 4}} />
                            </RechartsLineChart>
                        ) : (
                            <BarChart data={block.data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                    <div className="absolute inset-0 z-10" /> {/* Layer to catch clicks on parent */}
                </div>
            );
        case 'quote':
            return (
                <div className="flex gap-4 p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg italic text-slate-600">
                    <Quote className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                        "{block.content}"
                        <div className="text-xs text-slate-400 mt-2 not-italic font-bold text-right">— 原始引用源</div>
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="w-full min-h-screen flex bg-[#F1F5F9] relative">
      
      {/* --- Left Sidebar: Outline (240px) --- */}
      <div className="w-[240px] flex-none bg-white border-r border-slate-200 flex flex-col z-20">
          <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                  <Layout className="w-5 h-5 text-blue-600" />
                  文档大纲
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {blocks.filter(b => b.type === 'h1' || b.type === 'h2').map((b, i) => (
                  <div 
                    key={b.id}
                    onClick={() => {
                        document.getElementById(`block-${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setActiveBlockId(b.id);
                    }}
                    className={`
                        px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors truncate
                        ${b.type === 'h1' ? 'font-bold text-slate-800' : 'text-slate-500 pl-6 hover:text-blue-600'}
                        ${activeBlockId === b.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}
                    `}
                  >
                      {b.content}
                  </div>
              ))}
          </div>
          <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
              <span>共 {blocks.length} 个数据块</span>
              <span>{isSaving ? 'Saving...' : 'Saved'}</span>
          </div>
      </div>

      {/* --- Center: Editor Canvas --- */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth p-8 flex justify-center">
          <div className="w-full max-w-4xl bg-white border border-slate-100 mb-20 relative animate-slide-down">
              
              {/* Paper Header */}
              <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-12 sticky top-0 z-10 opacity-95">
                  <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex items-center gap-4 text-slate-400">
                      <button
                        onClick={onGenerateReport}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          <>
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            正在生成报告…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            生成 AI 报告
                          </>
                        )}
                      </button>
                      <button className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors">
                          <Printer className="w-4 h-4" />
                          <span className="text-xs font-bold">导出 PDF</span>
                      </button>
                  </div>
              </div>

              {/* Paper Content */}
              <div className="p-12 md:p-16 space-y-8">
                  {agentReport ? (
                    <div className="space-y-8">
                      {/* 元数据行 */}
                      <p className="text-sm md:text-base text-slate-400">
                        Lumina Analysis · 自动生成 AI 深度研判报告
                      </p>
                      {/* 主体 Markdown 报告，使用自定义 Typography */}
                      <div className="max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }) => (
                              <h1
                                className="text-[2.25rem] md:text-[2.5rem] font-extrabold text-slate-900 mb-8 leading-tight"
                                {...props}
                              />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2
                                className="text-xl md:text-2xl font-semibold text-slate-900 mt-6 md:mt-8 mb-4 border-b border-slate-200 pb-1"
                                {...props}
                              />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3
                                className="text-lg md:text-xl font-semibold text-slate-700 mt-4 mb-3"
                                {...props}
                              />
                            ),
                            p: ({ node, ...props }) => (
                              <p
                                className="text-slate-700 leading-relaxed my-3"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong
                                className="font-semibold text-slate-900"
                                {...props}
                              />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc pl-6 my-3 space-y-1"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal pl-6 my-3 space-y-1"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li
                                className="leading-relaxed"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {agentReport}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 顶部提示区域（无报告时） */}
                      <div className="mb-4 p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                  AI 深度研判报告（示例模版）
                              </span>
                              {error && (
                                <span className="text-xs text-red-500">
                                  {error}
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-slate-500">
                              点击右上角「生成 AI 报告」后，这里将被工作流生成的真实 Markdown 报告替换。
                              目前展示的是一个可编辑的示例报告版式。
                          </div>
                          {isLoading && (
                            <div className="mt-2 text-xs text-slate-400">
                              正在生成报告，请稍候...
                            </div>
                          )}
                      </div>

                      {blocks.map((block) => (
                      <div 
                        key={block.id} 
                        id={`block-${block.id}`}
                        onClick={() => handleBlockClick(block)}
                        onMouseEnter={() => setShowSlashMenu(prev => ({ ...prev, id: block.id }))}
                        onMouseLeave={() => setShowSlashMenu(prev => !prev.visible ? { ...prev, id: '' } : prev)}
                        className={`
                            relative group transition-all duration-200 pl-4 border-l-4 rounded-r-lg
                            ${activeBlockId === block.id ? 'border-blue-500 bg-blue-50/10' : 'border-transparent hover:border-slate-200'}
                            ${block.type === 'insight' ? 'bg-purple-50/50 p-6 rounded-lg !border-l-4 !border-purple-300' : ''}
                        `}
                      >
                          {/* Block Controls (Left) */}
                          <div className={`absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 ${activeBlockId === block.id ? 'opacity-100' : ''}`}>
                             <div className="p-1.5 hover:bg-slate-200 rounded cursor-grab active:cursor-grabbing text-slate-400">
                                 <GripVertical className="w-4 h-4" />
                             </div>
                             <button onClick={() => deleteBlock(block.id)} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded text-slate-400 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                          </div>

                          {/* Insight Icon */}
                          {block.type === 'insight' && (
                              <div className="flex items-center gap-2 mb-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
                                  <Sparkles className="w-4 h-4" />
                                  AI Insight
                              </div>
                          )}

                          {/* Content Render */}
                          {renderBlockContent(block)}

                          {/* Floating Context Toolbar (Top Right of Block) */}
                          {activeBlockId === block.id && block.type === 'text' && (
                              <div className="absolute -top-10 right-0 bg-slate-800 text-white rounded-lg shadow-lg flex items-center p-1 gap-1 animate-scale-in">
                                  <button onClick={handleAiRewrite} className="flex items-center gap-1 px-2 py-1 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                                      <Wand2 className="w-3 h-3" />
                                      AI 润色
                                  </button>
                                  <div className="w-px h-3 bg-white/20" />
                                  <button className="px-2 py-1 hover:bg-white/20 rounded text-xs font-medium transition-colors">扩写</button>
                              </div>
                          )}

                          {/* Slash Menu Trigger (Bottom) */}
                          {(showSlashMenu.id === block.id || showSlashMenu.visible) && (
                              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setShowSlashMenu({ id: block.id, visible: !showSlashMenu.visible }); }}
                                    className="bg-white border border-slate-200 shadow-sm rounded-full p-1 text-slate-400 hover:text-blue-500 hover:scale-110 transition-all"
                                  >
                                      <Plus className={`w-4 h-4 transition-transform ${showSlashMenu.visible ? 'rotate-45' : ''}`} />
                                  </button>
                                  
                                  {/* Dropdown */}
                                  {showSlashMenu.visible && showSlashMenu.id === block.id && (
                                      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 w-48 p-1.5 flex flex-col gap-1 animate-scale-in origin-top">
                                          <button onClick={() => addBlock(block.id, 'h2')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 text-sm">
                                              <Type className="w-4 h-4 text-slate-400" /> 标题 H2
                                          </button>
                                          <button onClick={() => addBlock(block.id, 'text')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 text-sm">
                                              <FileText className="w-4 h-4 text-slate-400" /> 文本段落
                                          </button>
                                          <button onClick={() => addBlock(block.id, 'chart')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 text-sm">
                                              <BarChart2 className="w-4 h-4 text-slate-400" /> 图表
                                          </button>
                                          <button onClick={() => addBlock(block.id, 'quote')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 text-sm">
                                              <Quote className="w-4 h-4 text-slate-400" /> 引用
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  ))}
                    
                    {/* End of Document Padding */}
                    <div className="h-32 flex items-center justify-center text-slate-300 text-sm">
                        --- 文档结束 ---
                    </div>
                    </>
                  )}
              </div>
          </div>
      </div>

      {/* --- Right Sidebar: Context (320px) --- */}
      <div 
        className={`
            w-[320px] flex-none bg-white border-l border-slate-200 flex flex-col shadow-xl z-30 transition-transform duration-300
            ${sidebarMode !== 'none' ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}
        `}
      >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                  {sidebarMode === 'evidence' && <><Quote className="w-4 h-4 text-blue-500" /> 证据溯源池</>}
                  {sidebarMode === 'chart' && <><BarChart2 className="w-4 h-4 text-blue-500" /> 图表配置</>}
              </span>
              <button onClick={() => setSidebarMode('none')} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                  <X className="w-4 h-4" />
              </button>
          </div>

          {/* Content: Evidence */}
          {sidebarMode === 'evidence' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                   <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-xs font-medium">
                       溯源结论: "{evidenceContext.keyword}"
                   </div>
                   {evidenceContext.ids.map(id => {
                       const comment = MOCK_COMMENTS.find(c => c.id === id) || MOCK_COMMENTS[0];
                       return (
                           <div key={id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                               <div className="flex justify-between items-center mb-2">
                                   <span className="font-bold text-slate-700">{comment.user}</span>
                                   <span className="text-[10px] text-slate-400">{comment.platform}</span>
                               </div>
                               <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                           </div>
                       )
                   })}
              </div>
          )}

          {/* Content: Chart Config */}
          {sidebarMode === 'chart' && (
              <div className="flex-1 p-6 space-y-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">图表类型</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleChartTypeChange('bar')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${activeBlockId && blocks.find(b=>b.id===activeBlockId)?.chartType === 'bar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                              <BarChart2 className="w-6 h-6" />
                              <span className="text-xs">柱状图</span>
                          </button>
                          <button 
                            onClick={() => handleChartTypeChange('line')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${activeBlockId && blocks.find(b=>b.id===activeBlockId)?.chartType === 'line' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                              <LineChart className="w-6 h-6" />
                              <span className="text-xs">折线图</span>
                          </button>
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">数据源</label>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-slate-400">
                          已链接到 Mod 4 (Visualization) 数据集。
                      </div>
                  </div>
              </div>
          )}
      </div>

      <style>{`
          @keyframes scale-in {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in { animation: scale-in 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
};
