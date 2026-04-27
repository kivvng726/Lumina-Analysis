import React, { useEffect, useState, useRef } from 'react';
import { CommentData } from '../types';
import { MOCK_COMMENTS } from '../constants';
import { Brain, Filter, Trash2, CheckCircle, Sparkles, Plus, AlertCircle, ArrowRight } from 'lucide-react';
import { analyzeSemantics } from '../services/geminiService';

interface Props {
  onComplete: (cleanedData: CommentData[]) => void;
}

// 扩展模拟数据以包含特定场景
const STREAM_SOURCE: CommentData[] = [
  { id: 'demo1', user: 'TeslaFan', content: 'Model Y的新悬挂感觉不错，但是今天早上刹车感觉有点硬。', platform: 'xiaohongshu', timestamp: '刚刚', likes: 12, status: 'pending' },
  { id: 'demo2', user: 'ShopOwner', content: 'Model Y刹车片大促销，全场5折，点击链接购买！', platform: 'xiaohongshu', timestamp: '1分钟前', likes: 0, status: 'pending' },
  { id: 'demo3', user: 'SpamBot', content: '兼职刷单，日入500，加V详聊。', platform: 'xiaohongshu', timestamp: '2分钟前', likes: 0, status: 'pending' },
  ...MOCK_COMMENTS.slice(2)
];

interface RuleTag {
  id: string;
  label: string;
  type: 'include' | 'exclude';
  isNew?: boolean;
}

export const Step2_Cleaning: React.FC<Props> = ({ onComplete }) => {
  // State
  const [streamIndex, setStreamIndex] = useState(0);
  const [activeItem, setActiveItem] = useState<CommentData | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'layer1' | 'layer2'>('idle');
  const [cotMessage, setCotMessage] = useState<string>('');
  
  const [acceptedList, setAcceptedList] = useState<CommentData[]>([]);
  const [graveyardList, setGraveyardList] = useState<CommentData[]>([]);
  
  const [rules, setRules] = useState<RuleTag[]>([
    { id: 'r1', label: '包含: "刹车"', type: 'include' },
    { id: 'r2', label: '包含: "Model Y"', type: 'include' },
  ]);

  const [evolutionToast, setEvolutionToast] = useState<{show: boolean, rule: string}>({ show: false, rule: '' });

  // Simulation Loop
  useEffect(() => {
    let cancelled = false;

    if (streamIndex >= STREAM_SOURCE.length) {
        // Completion
        const timer = setTimeout(() => {
          if (!cancelled) {
            onComplete(acceptedList);
          }
        }, 3000);

        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
    }

    const processItem = async () => {
        if (cancelled) return;
        const item = { ...STREAM_SOURCE[streamIndex] };
        if (cancelled) return;
        setActiveItem(item);

        // --- Layer 1: Rules Check ---
        if (cancelled) return;
        setProcessingStage('layer1');
        await new Promise(r => setTimeout(r, 600)); // Visual delay
        if (cancelled) return;

        // Simple mock rule logic
        const hasKeyword = item.content.includes("刹车") || item.content.includes("Model Y");
        // Check dynamic rules
        const isExcluded = rules.some(r => r.type === 'exclude' && item.content.includes(r.label.split('"')[1]));

        if (!hasKeyword && !isExcluded) {
             // Pass Layer 1, but technically if it doesn't match 'include' rules it might be filtered in a real app. 
             // For demo logic: let it pass if it matches include, reject if matches exclude.
             // Here we assume "Interest" filter.
             // Simplification:
        }

        if (isExcluded) {
            if (!cancelled) {
              handleReject(item, '规则拦截: ' + rules.find(r => item.content.includes(r.label.split('"')[1]))?.label);
            }
            return; 
        }

        // --- Layer 2: LLM Check ---
        if (cancelled) return;
        setProcessingStage('layer2');
        setCotMessage('正在分析语义...');
        await new Promise(r => setTimeout(r, 800)); // Thinking delay
        if (cancelled) return;

        // Scenario: Ad Detection
        if (item.content.includes("促销") || item.content.includes("兼职") || item.content.includes("点击链接")) {
            setCotMessage('识别为电商广告/垃圾信息');
            await new Promise(r => setTimeout(r, 600)); 
            if (cancelled) return;
            
            handleReject(item, 'LLM 语义拦截: 广告营销');

            // Evolution Trigger
            if (item.content.includes("促销") && !rules.some(r => r.label.includes("促销"))) {
                setEvolutionToast({ show: true, rule: '排除: "促销"' });
            }
        } else {
            setCotMessage('内容相关且真实');
            await new Promise(r => setTimeout(r, 400));
            if (!cancelled) {
              handleAccept(item);
            }
        }
    };

    processItem();

    return () => {
      cancelled = true;
    };

  }, [streamIndex, rules]); // Re-run when index changes or rules update (to apply new rules to next items)

  const handleReject = (item: CommentData, reason: string) => {
      setGraveyardList(prev => [{ ...item, status: 'rejected', rejectionReason: reason }, ...prev]);
      nextItem();
  };

  const handleAccept = (item: CommentData) => {
      setAcceptedList(prev => [{ ...item, status: 'accepted' }, ...prev]);
      nextItem();
  };

  const nextItem = () => {
      setActiveItem(null);
      setProcessingStage('idle');
      setCotMessage('');
      setStreamIndex(prev => prev + 1);
  };

  const confirmEvolution = () => {
      if (!evolutionToast.show) return;
      const newLabel = evolutionToast.rule;
      setRules(prev => [...prev, { id: `new-${Date.now()}`, label: newLabel, type: 'exclude', isNew: true }]);
      setEvolutionToast({ show: false, rule: '' });
  };

  return (
    <div className="w-full h-full p-6 flex flex-col gap-6 bg-slate-50">
       {/* Header */}
       <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">数据清洗管道 (Pipeline)</h2>
           <p className="text-slate-500 text-sm">双层过滤：关键词规则 + LLM 语义识别</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">已扫描</span>
                <span className="text-xl font-bold text-slate-700">{streamIndex}</span>
            </div>
             <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">已采纳</span>
                <span className="text-xl font-bold text-green-600">{acceptedList.length}</span>
            </div>
        </div>
      </div>

      {/* --- Visual Pipeline Area (The Dual Gates) --- */}
      <div className="relative h-64 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-center">
          
          {/* Background Decor */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          
          {/* Main Pipeline Container */}
          <div className="flex items-center justify-between px-16 relative z-10">
              
              {/* Gate 1: Dynamic Rules */}
              <div className="flex flex-col items-center gap-4 w-64">
                  <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${processingStage === 'layer1' ? 'border-yellow-400 bg-yellow-50 shadow-lg scale-105' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-wrap justify-center gap-2">
                          {rules.map(rule => (
                              <span key={rule.id} className={`px-2 py-1 text-xs font-mono rounded border flex items-center gap-1 ${rule.isNew ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                                  <Filter className="w-3 h-3" />
                                  {rule.label}
                              </span>
                          ))}
                      </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layer 1: 规则库</span>
              </div>

              {/* Connecting Pipe */}
              <div className="flex-1 h-2 bg-slate-100 rounded-full mx-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200 w-full" />
                  {/* Data Moving Animation */}
                  {activeItem && (
                      <div className={`
                          absolute top-0 bottom-0 w-8 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]
                          transition-all duration-[1400ms] ease-linear
                          ${processingStage === 'layer1' ? 'left-[10%]' : processingStage === 'layer2' ? 'left-[60%]' : 'left-[100%]'}
                      `} />
                  )}
              </div>

              {/* Gate 2: LLM Brain */}
              <div className="flex flex-col items-center gap-4 w-64 relative">
                  {/* CoT Bubble */}
                  <div className={`
                      absolute -top-16 left-1/2 -translate-x-1/2 w-48 bg-purple-600 text-white p-3 rounded-xl shadow-xl z-20 transition-all duration-300
                      ${processingStage === 'layer2' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}>
                      <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase opacity-75">思维链 (CoT)</span>
                      </div>
                      <p className="text-xs font-medium leading-tight">
                        {String(cotMessage || '')}
                      </p>
                      <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rotate-45" />
                  </div>

                  <div className={`p-6 rounded-full border-2 transition-all duration-500 ${processingStage === 'layer2' ? 'border-purple-500 bg-purple-50 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-110' : 'border-slate-200 bg-white'}`}>
                      <Brain className={`w-10 h-10 ${processingStage === 'layer2' ? 'text-purple-600 animate-pulse' : 'text-slate-300'}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layer 2: 语义脑</span>
              </div>

          </div>

          {/* Active Data Item Visual (Floating below pipeline) */}
          <div className="absolute bottom-6 left-0 w-full text-center">
              {activeItem ? (
                 <div className="inline-block bg-white px-6 py-2 rounded-full border border-slate-200 shadow-sm text-sm text-slate-600 animate-slide-down max-w-lg truncate">
                     正在处理:{' '}
                     <span className="font-bold text-slate-800">
                       "{String(activeItem.content || '')}"
                     </span>
                 </div>
              ) : (
                 <div className="inline-block text-slate-400 text-xs">等待数据输入...</div>
              )}
          </div>
      </div>

      {/* Evolution Toast Overlay */}
      {evolutionToast.show && (
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 z-50 bg-white p-4 rounded-xl shadow-2xl border border-blue-100 flex items-center gap-4 animate-slide-down w-[400px]">
              <div className="p-3 bg-blue-50 rounded-full">
                  <Sparkles className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">建议生成新规则</h4>
                  <p className="text-xs text-slate-500 mt-1">检测到大量类似广告，建议添加: <code className="bg-slate-100 px-1 rounded">{evolutionToast.rule}</code></p>
              </div>
              <button 
                onClick={confirmEvolution}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                  确认生成
              </button>
          </div>
      )}

      {/* --- Bottom Split View --- */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          
          {/* Left: Accepted (Live) */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-bold text-slate-700 text-sm">保留数据 (Live)</span>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {acceptedList.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="p-4 rounded-lg border border-slate-100 bg-white hover:border-green-200 hover:shadow-md transition-all animate-slide-down group">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-700">@{item.user}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{item.timestamp}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                            {String(item.content || '')}
                          </p>
                      </div>
                  ))}
                  {acceptedList.length === 0 && <div className="text-center text-slate-300 text-xs mt-10">等待符合条件的数据...</div>}
              </div>
          </div>

          {/* Right: Graveyard (Rejected) */}
          <div className="bg-[#FEF2F2] rounded-xl border border-red-100 flex flex-col overflow-hidden">
               <div className="px-5 py-3 border-b border-red-100 bg-red-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-red-900 text-sm">墓地 (Graveyard)</span>
                  </div>
                  <span className="text-xs text-red-400 font-mono">Deleted: {graveyardList.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {graveyardList.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="p-4 rounded-lg border border-red-100 bg-white/60 opacity-80 hover:opacity-100 transition-all animate-slide-down relative overflow-hidden group">
                          {/* Strikethrough effect */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                              <div className="w-full h-1 bg-red-500 transform -rotate-12" />
                          </div>

                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-red-800/50">@{item.user}</span>
                              <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-100 px-2 py-0.5 rounded-full font-bold">
                                  <AlertCircle className="w-3 h-3" />
                                  {item.rejectionReason?.split(':')[1] || '拦截'}
                              </div>
                          </div>
                          <p className="text-sm text-slate-500/80 line-through decoration-red-200">
                            {String(item.content || '')}
                          </p>
                      </div>
                  ))}
                  {graveyardList.length === 0 && <div className="text-center text-red-200 text-xs mt-10">墓地暂空...</div>}
              </div>
          </div>
      </div>
    </div>
  );
};
