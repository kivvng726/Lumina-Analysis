import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { ArrowRight, ShieldAlert, Zap, Users, MessageCircle, Flag, Play, Expand, AlertTriangle } from 'lucide-react';

interface Props {
  onNext: () => void;
}

// --- Mock Data ---

const TIMELINE_DATA = [
  { date: '1月1日', volume: 120 },
  { date: '1月2日', volume: 132 },
  { date: '1月3日', volume: 101 },
  { date: '1月4日', volume: 434, event: 'KOL 爆料视频发布' },
  { date: '1月5日', volume: 890, event: '舆情爆发' },
  { date: '1月6日', volume: 1230, event: '官方发布声明' },
  { date: '1月7日', volume: 920 },
];

const BUBBLES = [
  { id: '1', label: '全额退款', size: 90, color: '#EF4444', type: 'urgent', subBubbles: ['退一赔三', '原价回购', '退定金'] }, // Red
  { id: '2', label: '公开道歉', size: 70, color: '#F97316', type: 'neutral', subBubbles: [] }, // Orange
  { id: '3', label: '延长保修', size: 60, color: '#3B82F6', type: 'expect', subBubbles: [] }, // Blue
  { id: '4', label: '修改文案', size: 45, color: '#F97316', type: 'neutral', subBubbles: [] },
  { id: '5', label: '硬件升级', size: 50, color: '#3B82F6', type: 'expect', subBubbles: [] },
];

// --- Sub Components ---

/** 
 * [D] 情感流程 (Particle Sankey) 
 * Canvas-based particle system
 */
const ParticleSankey: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      type: 'positive' | 'negative';
    }

    const particles: Particle[] = [];
    const particleCount = 400;
    const midPointX = rect.width * 0.5;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: 2 + Math.random() * 2,
        vy: (Math.random() - 0.5) * 0.5,
        color: '#4ADE80', // Start Green
        life: Math.random() * 100,
        type: 'positive'
      });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Draw bottleneck node (The Crisis Event)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.arc(midPointX, rect.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw Label
      ctx.fillStyle = '#64748B';
      ctx.font = '10px Inter';
      ctx.fillText('刹车测试视频流出', midPointX - 40, rect.height / 2 + 25);

      particles.forEach(p => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Reset if out of bounds
        if (p.x > rect.width) {
          p.x = 0;
          p.y = rect.height * 0.3 + Math.random() * (rect.height * 0.4); // Start concentrated
          p.color = '#4ADE80'; // Reset to Green
          p.type = 'positive';
          p.vx = 2 + Math.random() * 2; // Normal speed
        }

        // Interaction at midpoint (The Crisis)
        if (p.type === 'positive' && p.x > midPointX) {
           // 80% chance to turn negative
           if (Math.random() > 0.2) {
               p.type = 'negative';
               p.color = '#EF4444'; // Turn Red
               p.vx = 4 + Math.random() * 3; // Speed up (Viral spread)
               // Scatter effect
               p.vy = (Math.random() - 0.5) * 4; 
           }
        }

        // Draw
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const size = p.type === 'negative' ? 1.5 : 1.2;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full rounded-xl" />;
};

/** 
 * [E] 潜在风险 (Risk Topology) 
 * SVG with CSS animations
 */
const RiskTopology: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <svg width="100%" height="100%" viewBox="0 0 400 300" className="z-10">
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            
            {/* Connections */}
            <line x1="200" y1="150" x2="120" y2="100" stroke="#475569" strokeWidth="1" />
            <line x1="200" y1="150" x2="280" y2="100" stroke="#475569" strokeWidth="1" />
            <line x1="200" y1="150" x2="200" y2="240" stroke="#EF4444" strokeWidth="2" strokeDasharray="4" className="animate-pulse" />
            
            {/* Ripples for High Risk Node */}
            <circle cx="200" cy="240" r="10" stroke="#EF4444" strokeWidth="1" fill="none" className="animate-[ping_2s_infinite]" />
            <circle cx="200" cy="240" r="20" stroke="#EF4444" strokeWidth="0.5" fill="none" className="animate-[ping_2s_infinite_0.5s]" />

            {/* Central Node (Event) */}
            <g transform="translate(200, 150)">
                <circle r="15" fill="#334155" stroke="#94A3B8" strokeWidth="2" />
                <text y="4" textAnchor="middle" fill="#CBD5E1" fontSize="10" fontWeight="bold">事件本体</text>
            </g>

            {/* Risk 1: PR */}
            <g transform="translate(120, 100)">
                <circle r="12" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                <text y="20" textAnchor="middle" fill="#94A3B8" fontSize="9">品牌商誉</text>
            </g>

            {/* Risk 2: Regulatory */}
            <g transform="translate(280, 100)">
                <circle r="12" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
                <text y="20" textAnchor="middle" fill="#94A3B8" fontSize="9">监管介入</text>
            </g>

            {/* Risk 3: Lawsuit (High Risk) */}
            <g transform="translate(200, 240)">
                <circle r="18" fill="#450A0A" stroke="#EF4444" strokeWidth="2" filter="url(#glow)" className="animate-[pulse_1s_infinite]" />
                <text y="4" textAnchor="middle" fill="#FECACA" fontSize="10" fontWeight="bold">集体诉讼</text>
                <text y="-25" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold" className="animate-bounce">⚠️ 高风险</text>
            </g>
        </svg>
    </div>
  );
};

/**
 * [A] 事件脉络 (Timeline River)
 */
const TimelineRiver: React.FC = () => {
    return (
        <div className="w-full h-full min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <AreaChart data={TIMELINE_DATA} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} dy={10} />
                    <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#1E293B' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorVol)" 
                        animationDuration={2000}
                    />
                </AreaChart>
            </ResponsiveContainer>
            
            {/* Floating Milestones */}
            <div className="absolute top-[20%] left-[55%] group cursor-pointer z-10">
                <div className="flex flex-col items-center">
                    <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg group-hover:scale-125 transition-transform">
                        <Flag className="w-3 h-3" />
                    </div>
                    <div className="h-8 w-0.5 bg-blue-300/50 group-hover:h-12 transition-all duration-300"></div>
                    <div className="absolute bottom-12 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-3 py-2 rounded-lg shadow-xl border border-blue-100 text-xs w-32 text-center pointer-events-none transform translate-y-2 group-hover:translate-y-0 duration-300">
                        <span className="font-bold block text-blue-900">官方发布声明</span>
                        <span className="text-slate-500 scale-90 block">1月6日 14:00</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-[45%] left-[35%] group cursor-pointer z-10">
                <div className="flex flex-col items-center">
                     <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg group-hover:scale-125 transition-transform">
                        <AlertTriangle className="w-3 h-3" />
                    </div>
                    <div className="h-6 w-0.5 bg-red-300/50 group-hover:h-10 transition-all duration-300"></div>
                    <div className="absolute bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-3 py-2 rounded-lg shadow-xl border border-red-100 text-xs w-32 text-center pointer-events-none">
                        <span className="font-bold block text-red-900">舆情爆发点</span>
                        <span className="text-slate-500 scale-90 block">KOL 视频转发</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * [B] 涉事主体 (Gravity Graph)
 */
const GravityGraph: React.FC = () => {
    return (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
             {/* Center Node */}
             <div className="absolute w-16 h-16 rounded-full bg-slate-900 shadow-xl flex items-center justify-center z-10 animate-[float_6s_ease-in-out_infinite]">
                 <span className="text-xs text-white font-bold text-center leading-tight">Model Y<br/>刹车事件</span>
             </div>

             {/* Orbiting Nodes */}
             <div className="absolute w-40 h-40 border border-slate-200 rounded-full animate-[spin_20s_linear_infinite]" />
             
             {/* Nodes - Positions are roughly calculated for layout */}
             <div className="absolute top-8 left-12 group cursor-pointer animate-[float_5s_ease-in-out_infinite_1s]">
                 <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center group-hover:border-blue-500 group-hover:scale-110 transition-all">
                     <Users className="w-4 h-4 text-slate-500 group-hover:text-blue-500" />
                 </div>
                 <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-medium mt-1 w-max">维权车主群</div>
                 {/* Connection Line */}
                 <div className="absolute top-5 left-5 w-20 h-[1px] bg-red-300 origin-left rotate-[30deg] -z-10 group-hover:bg-red-500" />
             </div>

             <div className="absolute bottom-10 right-10 group cursor-pointer animate-[float_7s_ease-in-out_infinite_2s]">
                 <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center group-hover:border-blue-500 group-hover:scale-110 transition-all">
                     <div className="font-bold text-slate-700 text-xs">Tesla</div>
                 </div>
                 <div className="absolute top-12 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-medium mt-1 w-max">品牌方</div>
             </div>

             <div className="absolute top-1/2 right-4 group cursor-pointer animate-[float_4s_ease-in-out_infinite_0.5s]">
                 <div className="w-9 h-9 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center group-hover:border-blue-500 group-hover:scale-110 transition-all">
                     <span className="text-[9px] font-bold text-slate-600">KOL</span>
                 </div>
             </div>
        </div>
    );
}

/**
 * [C] 核心诉求 (Bubble Matrix)
 */
const BubbleMatrix: React.FC = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleBubbleClick = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const activeItem = BUBBLES.find(b => b.id === expandedId);

    return (
        <div className="w-full h-full relative flex items-center justify-center p-4">
            {expandedId && activeItem ? (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                     <h4 className="text-lg font-bold mb-4" style={{color: activeItem.color}}>{activeItem.label} - 细分诉求</h4>
                     <div className="flex gap-3 flex-wrap justify-center">
                         {activeItem.subBubbles.length > 0 ? activeItem.subBubbles.map((sub, i) => (
                             <div key={i} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-medium text-sm border border-slate-200 shadow-sm animate-[scaleIn_0.3s_ease-out]" style={{animationDelay: `${i*0.1}s`}}>
                                 {sub}
                             </div>
                         )) : <span className="text-slate-400 text-sm">暂无细分数据</span>}
                     </div>
                     <button onClick={() => setExpandedId(null)} className="mt-6 text-xs text-slate-400 hover:text-slate-600">点击空白处返回</button>
                </div>
            ) : null}

            {/* Bubble Layout (Simulated Packed) */}
            <div className={`relative w-full h-full ${expandedId ? 'blur-sm scale-95' : ''} transition-all duration-300`}>
                {BUBBLES.map((bubble, i) => (
                    <div 
                        key={bubble.id}
                        onClick={() => handleBubbleClick(bubble.id)}
                        className="absolute rounded-full shadow-md flex items-center justify-center cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                        style={{
                            width: bubble.size,
                            height: bubble.size,
                            backgroundColor: bubble.color,
                            opacity: 0.9,
                            top: i === 0 ? '10%' : i === 1 ? '50%' : i === 2 ? '20%' : i === 3 ? '60%' : '30%',
                            left: i === 0 ? '10%' : i === 1 ? '50%' : i === 2 ? '60%' : i === 3 ? '15%' : '40%',
                            animation: `float ${3 + i}s ease-in-out infinite`
                        }}
                    >
                        <span className="text-white font-bold text-xs pointer-events-none group-hover:scale-110 transition-transform">{bubble.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Main Layout ---

export const Step4_Visualization: React.FC<Props> = ({ onNext }) => {
  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none flex justify-between items-end mb-6">
         <div>
             <h2 className="text-3xl font-light text-slate-800">全景体检 (Global Health Check)</h2>
             <p className="text-slate-500 mt-1 text-sm font-medium tracking-wide">五维舆情结构化分析 • 实时动态模拟</p>
         </div>
         <button 
            onClick={onNext}
            className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full shadow-lg shadow-blue-200/50 flex items-center gap-2 transition-all active:scale-95"
         >
             <span className="font-medium">进入深度编排</span>
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
         </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-5 min-h-0 pb-2">
          
          {/* [D] 情感流程 (Sankey) - Top Left (2x2) */}
          <div className="col-span-2 row-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4 relative z-10">
                  <div className="p-2 bg-blue-50 rounded-xl">
                      <Zap className="w-5 h-5 text-blue-500 fill-current" />
                  </div>
                  <h3 className="font-bold text-slate-700">情感流转 (Emotional Flow)</h3>
              </div>
              <div className="flex-1 relative rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  <ParticleSankey />
                  <div className="absolute bottom-3 right-3 flex gap-4 text-[10px] font-bold uppercase text-slate-400">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div>期待/中立</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>愤怒/负面</div>
                  </div>
              </div>
          </div>

          {/* [E] 潜在风险 (Risk) - Top Right (2x2) */}
          <div className="col-span-2 row-span-2 bg-slate-900 rounded-[24px] p-0 shadow-lg border border-slate-800 flex flex-col relative overflow-hidden group">
               <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                  <div className="p-2 bg-red-900/30 rounded-xl border border-red-900/50">
                      <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-bold text-slate-100">风险拓扑 (Risk Topology)</h3>
              </div>
              <RiskTopology />
          </div>

          {/* [A] 事件脉络 (Timeline) - Bottom Left (2x1) */}
          <div className="col-span-2 row-span-1 bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <Play className="w-4 h-4 text-blue-500 fill-current" />
                      事件脉络 (Context)
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">近 7 天声量趋势</span>
              </div>
              <div className="flex-1 min-h-[200px] min-w-0 -ml-2">
                  <TimelineRiver />
              </div>
          </div>

          {/* [B] 涉事主体 (Relation) - Bottom Center (1x1) */}
          <div className="col-span-1 row-span-1 bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
               <div className="absolute top-4 left-4 z-10">
                   <h3 className="font-bold text-slate-700 text-sm">主体关系</h3>
               </div>
               <GravityGraph />
          </div>

          {/* [C] 核心诉求 (Bubbles) - Bottom Right (1x1) */}
          <div className="col-span-1 row-span-1 bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
               <div className="absolute top-4 left-4 z-10">
                   <h3 className="font-bold text-slate-700 text-sm">核心诉求</h3>
               </div>
               <div className="absolute top-4 right-4 z-10">
                   <Expand className="w-4 h-4 text-slate-300" />
               </div>
               <BubbleMatrix />
          </div>

      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
