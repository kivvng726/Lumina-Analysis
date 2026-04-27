import React, { useState, useEffect, useRef } from 'react';
import { CrawlItem } from '../types';
import { Play, Pause, ChevronDown, ChevronRight, Code, X, Radio, Globe, MessageSquare, CornerDownRight, CheckCircle } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

// --- Mock Data Generators ---
const MOCK_USERS = ['CarLover_99', 'TechGeek', 'Momo', 'Alex_D', 'Tesla_Bear', 'EV_Queen', 'AutoInsider'];
const MOCK_CONTENT_XH = [
    '提车一周，感觉刹车有问题，特别是冷车启动时。',
    '避雷！Model Y 降价了，但是服务态度太差。',
    '这内饰简直是毛坯房，但是开起来是真香。',
    '关于单踏板模式的适应过程，写了3000字长文...',
    '刹车变硬是不是通病？有没有懂行的来说说？'
];
const MOCK_CONTENT_WB = [
    '特斯拉又上热搜了？这次是因为刹车失灵？',
    '#特斯拉# 刚刚路过车祸现场，看着像Y。',
    '马斯克这波操作看不懂，股价要跌。',
    '有一说一，辅助驾驶确实遥遥领先。'
];
const MOCK_CONTENT_WEB = [
    '【新闻】某地特斯拉发生严重交通事故，警方已介入。',
    '汽车之家论坛：Model Y 冬季续航实测报告。',
    '雪球：分析特斯拉Q4财报对供应链的影响。'
];

const generateItem = (platform: 'xiaohongshu' | 'weibo' | 'web', idPrefix: string): CrawlItem => {
    const isPost = Math.random() > 0.6;
    const contentPool = platform === 'xiaohongshu' ? MOCK_CONTENT_XH : platform === 'weibo' ? MOCK_CONTENT_WB : MOCK_CONTENT_WEB;
    const content = contentPool[Math.floor(Math.random() * contentPool.length)];
    
    // Generate children (Comments)
    const children: CrawlItem[] = [];
    if (isPost && Math.random() > 0.3) {
        const commentCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < commentCount; i++) {
            const hasSub = Math.random() > 0.5;
            const subs: CrawlItem[] = [];
            if (hasSub) {
                 for (let j = 0; j < Math.floor(Math.random() * 5) + 2; j++) {
                     subs.push({
                        id: `${idPrefix}-c${i}-s${j}`,
                        type: 'sub-comment',
                        user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
                        content: '回复: 确实我也遇到了这个问题。',
                        platform,
                        timestamp: '刚刚'
                     });
                 }
            }

            children.push({
                id: `${idPrefix}-c${i}`,
                type: 'comment',
                user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
                content: '这明显是操作失误吧，不要尬黑。',
                platform,
                timestamp: '1分钟前',
                children: subs
            });
        }
    }

    return {
        id: idPrefix,
        type: isPost ? 'post' : 'comment',
        user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
        content: isPost ? content : '转发微博',
        platform,
        timestamp: '刚刚',
        children,
        rawJson: {
            crawl_id: idPrefix,
            platform: platform,
            meta: {
                user_agent: "LuminaBot/1.0",
                latency_ms: Math.floor(Math.random() * 100)
            },
            data: {
                content: content,
                author_id: "u_" + Math.floor(Math.random() * 10000)
            }
        }
    };
};

export const Step1_5_Crawling: React.FC<Props> = ({ onComplete }) => {
  const [counts, setCounts] = useState({ xiaohongshu: 0, weibo: 0, web: 0 });
  const [streams, setStreams] = useState<{
      xiaohongshu: CrawlItem[],
      weibo: CrawlItem[],
      web: CrawlItem[]
  }>({ xiaohongshu: [], weibo: [], web: [] });
  
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [inspectorData, setInspectorData] = useState<CrawlItem | null>(null);
  
  const bottomRefs = {
      xiaohongshu: useRef<HTMLDivElement>(null),
      weibo: useRef<HTMLDivElement>(null),
      web: useRef<HTMLDivElement>(null)
  };

  // --- Crawler Simulation Effect ---
  useEffect(() => {
    const interval = setInterval(() => {
        if (!isAutoScroll) return;

        // Randomly pick a platform to update to simulate async arrival
        const rand = Math.random();
        let platform: 'xiaohongshu' | 'weibo' | 'web' = 'xiaohongshu';
        if (rand > 0.6) platform = 'weibo';
        if (rand > 0.9) platform = 'web';

        const newItem = generateItem(platform, `${platform}-${Date.now()}`);

        setCounts(prev => ({ ...prev, [platform]: prev[platform] + (Math.floor(Math.random() * 3) + 1) }));
        setStreams(prev => {
            const newList = [...prev[platform], newItem];
            if (newList.length > 50) newList.shift(); // Keep memory sane
            return { ...prev, [platform]: newList };
        });

    }, 200); // High speed

    return () => clearInterval(interval);
  }, [isAutoScroll]);

  // --- Auto Scroll Effect ---
  useEffect(() => {
      if (isAutoScroll) {
          Object.values(bottomRefs).forEach(ref => {
              ref.current?.scrollIntoView({ behavior: 'smooth' });
          });
      }
  }, [streams, isAutoScroll]);

  const handleScroll = () => {
      if (isAutoScroll) setIsAutoScroll(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative overflow-hidden">
      
      {/* --- Top Status Bar (120px) --- */}
      <div className="h-[120px] bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <div className="flex gap-6 w-full max-w-5xl mx-auto">
              {/* Platform Card: Xiaohongshu */}
              <div className="flex-1 bg-red-50 rounded-xl border border-red-100 p-4 flex flex-col relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Xiaohongshu</span>
                      </div>
                      <Radio className="w-4 h-4 text-red-400 opacity-50" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-red-600 tabular-nums tracking-tight">
                      {counts.xiaohongshu.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-red-400 mt-1">Speed: 124/sec • Latency: 45ms</div>
              </div>

              {/* Platform Card: Weibo */}
              <div className="flex-1 bg-orange-50 rounded-xl border border-orange-100 p-4 flex flex-col relative overflow-hidden group">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Weibo</span>
                      </div>
                      <MessageSquare className="w-4 h-4 text-orange-400 opacity-50" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-orange-600 tabular-nums tracking-tight">
                      {counts.weibo.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-orange-400 mt-1">Speed: 82/sec • Latency: 12ms</div>
              </div>

               {/* Platform Card: Web */}
               <div className="flex-1 bg-blue-50 rounded-xl border border-blue-100 p-4 flex flex-col relative overflow-hidden group">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Web / News</span>
                      </div>
                      <Globe className="w-4 h-4 text-blue-400 opacity-50" />
                  </div>
                  <div className="text-3xl font-mono font-bold text-blue-600 tabular-nums tracking-tight">
                      {counts.web.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-400 mt-1">Speed: 15/sec • Latency: 220ms</div>
              </div>
          </div>
          
          <div className="ml-8 flex flex-col items-center gap-2">
              <button 
                onClick={onComplete}
                className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 font-bold transition-transform active:scale-95"
              >
                  <span>数据已就绪</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
              </button>
              <div className="text-[10px] text-slate-400">Total: {(counts.xiaohongshu + counts.weibo + counts.web).toLocaleString()} items</div>
          </div>
      </div>

      {/* --- Main Waterfall Stream --- */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-slate-200 min-h-0 relative">
          
          {/* Column 1: Xiaohongshu */}
          <FeedColumn 
            items={streams.xiaohongshu} 
            color="red" 
            scrollRef={bottomRefs.xiaohongshu}
            onScroll={handleScroll}
            onSelect={setInspectorData}
          />
          
          {/* Column 2: Weibo */}
          <FeedColumn 
            items={streams.weibo} 
            color="orange" 
            scrollRef={bottomRefs.weibo}
            onScroll={handleScroll}
            onSelect={setInspectorData}
          />

          {/* Column 3: Web */}
          <FeedColumn 
            items={streams.web} 
            color="blue" 
            scrollRef={bottomRefs.web}
            onScroll={handleScroll}
            onSelect={setInspectorData}
          />

          {/* Scroll Paused Indicator */}
          {!isAutoScroll && (
              <div 
                onClick={() => setIsAutoScroll(true)}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform animate-bounce z-10 flex items-center gap-2"
              >
                  <Play className="w-3 h-3 fill-current" />
                  新数据积压中... 点击恢复滚动
              </div>
          )}
      </div>

      {/* --- Inspector Drawer --- */}
      <div className={`fixed inset-y-0 right-0 w-[40%] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${inspectorData ? 'translate-x-0' : 'translate-x-full'}`}>
          {inspectorData && (
              <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-2">
                          <Code className="w-5 h-5 text-blue-500" />
                          <span className="font-bold text-slate-700">Raw Data Inspector</span>
                      </div>
                      <button onClick={() => setInspectorData(null)} className="p-2 hover:bg-slate-200 rounded-full">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 bg-[#1E293B]">
                      <pre className="text-xs font-mono text-green-400 leading-relaxed">
                          {JSON.stringify(inspectorData.rawJson || inspectorData, null, 2)}
                      </pre>
                  </div>
              </div>
          )}
      </div>

    </div>
  );
};

// --- Sub Components ---

const FeedColumn: React.FC<{
    items: CrawlItem[], 
    color: 'red' | 'orange' | 'blue',
    scrollRef: React.RefObject<HTMLDivElement | null>,
    onScroll: () => void,
    onSelect: (item: CrawlItem) => void
}> = ({ items, color, scrollRef, onScroll, onSelect }) => {
    
    const borderColor = color === 'red' ? 'border-red-100' : color === 'orange' ? 'border-orange-100' : 'border-blue-100';
    const bgColor = color === 'red' ? 'bg-red-50' : color === 'orange' ? 'bg-orange-50' : 'bg-blue-50';

    return (
        <div 
            className="h-full overflow-y-auto p-4 space-y-4 relative scroll-smooth"
            onWheel={onScroll}
        >
            {items.map((item) => (
                <ThreadCard key={item.id} item={item} color={color} onSelect={onSelect} />
            ))}
            <div ref={scrollRef} className="h-2" />
        </div>
    );
};

const ThreadCard: React.FC<{
    item: CrawlItem,
    color: 'red' | 'orange' | 'blue',
    onSelect: (item: CrawlItem) => void
}> = ({ item, color, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const highlightClass = color === 'red' ? 'hover:border-red-300' : color === 'orange' ? 'hover:border-orange-300' : 'hover:border-blue-300';
    const flashClass = color === 'red' ? 'animate-[flashRed_0.5s]' : color === 'orange' ? 'animate-[flashOrange_0.5s]' : 'animate-[flashBlue_0.5s]';

    return (
        <div 
            onClick={() => onSelect(item)}
            className={`
                bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer transition-all duration-300
                ${highlightClass} ${flashClass}
            `}
        >
            {/* L1: Root Post */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                        {item.user[0]}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{item.user}</span>
                </div>
                {item.type === 'post' && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${color === 'red' ? 'bg-red-50 text-red-500 border-red-100' : color === 'orange' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                        POST
                    </span>
                )}
            </div>
            
            <p className="text-sm text-slate-800 leading-relaxed mb-3">{item.content}</p>
            
            {/* L2 & L3: Threaded Comments */}
            {item.children && item.children.length > 0 && (
                <div className="mt-4 pl-3 border-l-2 border-slate-100 space-y-3">
                    {item.children.map(child => (
                        <div key={child.id} className="relative">
                            {/* Connector Line */}
                            <div className="absolute -left-[14px] top-3 w-3 h-[1px] bg-slate-200" />
                            
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-600">{child.user}</span>
                                    <span className="text-slate-400 scale-90">{child.timestamp}</span>
                                </div>
                                <p className="text-slate-600">{child.content}</p>

                                {/* L3: Sub-comments (Accordion) */}
                                {child.children && child.children.length > 0 && (
                                    <div className="mt-2">
                                        {!isExpanded ? (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                                className="text-[10px] text-blue-500 font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                            >
                                                <CornerDownRight className="w-3 h-3" />
                                                展开 {child.children.length} 条回复
                                            </button>
                                        ) : (
                                            <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2 animate-slide-down">
                                                {child.children.map(sub => (
                                                    <div key={sub.id} className="relative">
                                                         <div className="absolute -left-[14px] top-2.5 w-3 h-[1px] bg-slate-200" />
                                                         <div className="bg-slate-100 p-2 rounded text-[11px] text-slate-600">
                                                             <span className="font-bold mr-1">{sub.user}:</span>
                                                             {sub.content}
                                                         </div>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                                    className="text-[10px] text-slate-400 mt-1 hover:text-slate-600 ml-2"
                                                >
                                                    收起回复
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <style>{`
                @keyframes flashRed { 0% { background-color: #FEF2F2; } 100% { background-color: white; } }
                @keyframes flashOrange { 0% { background-color: #FFF7ED; } 100% { background-color: white; } }
                @keyframes flashBlue { 0% { background-color: #EFF6FF; } 100% { background-color: white; } }
            `}</style>
        </div>
    );
}
