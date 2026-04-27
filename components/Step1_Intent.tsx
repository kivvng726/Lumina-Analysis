import React, { useState, useEffect } from 'react';
import { Mic, Paperclip, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { parseIntent } from '../services/geminiService';
import { TaskConfig } from '../types';

interface Props {
  onComplete: (config: TaskConfig) => void;
}

const PLACEHOLDERS = [
  "分析过去一周小红书上关于‘Model Y 刹车变硬’的负面舆情...",
  "追踪 iPhone 16 发热问题的公众看法...",
  "监控瑞幸咖啡新品发布的市场反馈..."
];

export const Step1_Intent: React.FC<Props> = ({ onComplete }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<TaskConfig>({
    entity: '', platform: '', timeRange: '', query: ''
  });

  // Placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsLoading(true);
      // Simulate API call or real call
      const result = await parseIntent(query);
      setConfig({
        entity: result.entity || '目标主体',
        platform: result.platform || '全网',
        timeRange: result.timeRange || '近期',
        query
      });
      setIsLoading(false);
      setShowConfig(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full relative">
      {/* Background Aurora */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full blur-3xl opacity-30 -z-10 animate-pulse" />

      {/* Main Input */}
      <div className={`relative w-full max-w-2xl transition-all duration-500 ${showConfig ? '-translate-y-16' : ''}`}>
        <div 
          className={`
            flex items-center bg-white rounded-2xl px-6 py-5 shadow-sm
            border transition-all duration-300
            ${isFocused ? 'border-blue-500 shadow-blue-100 shadow-lg scale-[1.01]' : 'border-slate-200 shadow-sm'}
          `}
        >
          <Mic className="text-slate-400 w-5 h-5 mr-4 hover:text-blue-500 cursor-pointer transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-lg text-slate-800 placeholder-slate-400 font-medium"
            placeholder={PLACEHOLDERS[placeholderIdx]}
            autoFocus
          />
          <div className="flex items-center gap-3">
             <Paperclip className="text-slate-400 w-5 h-5 hover:text-blue-500 cursor-pointer transition-colors" />
             {isLoading ? (
               <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
             ) : (
               <button 
                onClick={() => handleKeyDown({ key: 'Enter' } as any)}
                className={`p-2 rounded-full transition-all ${query ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}
               >
                 <ArrowRight className="w-4 h-4" />
               </button>
             )}
          </div>
        </div>
        
        {/* Loading Progress Bar */}
        {isLoading && (
          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-slate-100 overflow-hidden rounded-b-lg">
             <div className="h-full bg-blue-500 animate-[progress_1s_ease-in-out_infinite]" style={{ width: '30%' }} />
          </div>
        )}
      </div>

      {/* Configuration Card (Slide Down) */}
      {showConfig ? (
        <div
          key={`${String(config.entity || '')}-${String(config.platform || '')}-${String(
            config.timeRange || ''
          )}`}
          className="w-full max-w-2xl mt-4 animate-slide-down"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">已识别意图 (Intent Detected)</h3>
                <p className="text-lg text-slate-800 font-medium">任务配置确认</p>
              </div>
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                <div className="text-xs text-slate-400 mb-1">分析实体</div>
                <div className="font-semibold text-slate-700 group-hover:text-blue-600">
                  {String(config.entity || '')}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                <div className="text-xs text-slate-400 mb-1">数据平台</div>
                <div className="font-semibold text-red-500 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500" />
                   <span>{String(config.platform || '')}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                <div className="text-xs text-slate-400 mb-1">时间范围</div>
                <div className="font-semibold text-slate-700 group-hover:text-blue-600">
                  {String(config.timeRange || '')}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => onComplete(config)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
              >
                开始抓取
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
