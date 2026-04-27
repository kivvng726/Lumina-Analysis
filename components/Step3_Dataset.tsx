import React, { useState } from 'react';
import { CommentData } from '../types';
import { Check, Database, RefreshCcw, Lock } from 'lucide-react';

interface Props {
  data: CommentData[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onComplete: (lockedIds: string[]) => void;
}

export const Step3_Dataset: React.FC<Props> = ({ data, selectedIds, onSelectedIdsChange, onComplete }) => {
  const [view, setView] = useState<'active' | 'graveyard'>('active');

  const selectedIdSet = new Set(selectedIds);

  // Filter logic
  const activeItems = data.filter(d => d.status === 'accepted');
  const graveyardItems = data.filter(d => d.status === 'rejected');
  
  const displayItems = view === 'active' ? activeItems : graveyardItems;

  const toggleSelection = (id: string) => {
    const nextIds = selectedIdSet.has(id)
      ? selectedIds.filter(existingId => existingId !== id)
      : [...selectedIds, id];

    onSelectedIdsChange(nextIds);
  };

  const handleRetrieve = (id: string) => {
     // Logic to move from graveyard to active would involve lifting state up in a real app
     // Here we simulate UI feedback
     alert("数据 ID " + id + " 已复活 (逻辑模拟)");
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* Header Actions */}
      <div className="h-16 bg-white border-b border-slate-200 px-8 flex justify-between items-center z-20">
         <div className="flex gap-4 bg-slate-100 p-1 rounded-lg">
             <button 
                onClick={() => setView('active')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'active' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 有效数据 ({activeItems.length})
             </button>
             <button 
                onClick={() => setView('graveyard')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'graveyard' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-red-500'}`}
             >
                 回收站 ({graveyardItems.length})
             </button>
         </div>

         <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">已选中: <b className="text-slate-900">{selectedIdSet.size}</b> 条</span>
            <button 
                onClick={() => onComplete(Array.from(selectedIdSet))}
                className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-transform active:scale-95"
            >
                <Lock className="w-4 h-4" />
                锁定数据集
            </button>
         </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-8">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {displayItems.map(item => (
                 <div 
                    key={item.id}
                    onClick={() => view === 'active' && toggleSelection(item.id)}
                    className={`
                        relative bg-white rounded-xl p-5 border transition-all cursor-pointer group
                        ${selectedIdSet.has(item.id) && view === 'active' ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-slate-200 hover:border-blue-300'}
                    `}
                 >
                     {/* Checkbox (Active View) */}
                     {view === 'active' && (
                         <div className={`
                             absolute top-4 right-4 w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                             ${selectedIdSet.has(item.id) ? 'bg-blue-500 border-blue-500' : 'bg-slate-50 border-slate-300'}
                         `}>
                             {selectedIdSet.has(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                     )}

                     {/* Retrieve Action (Graveyard View) */}
                     {view === 'graveyard' && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleRetrieve(item.id); }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors"
                         >
                             <RefreshCcw className="w-4 h-4" />
                         </button>
                     )}

                     <div className="flex items-center gap-2 mb-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.riskLevel === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                             {item.user[0].toUpperCase()}
                         </div>
                         <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-700">{item.user}</span>
                             <span className="text-[10px] text-slate-400">{item.platform} • {item.timestamp}</span>
                         </div>
                     </div>
                     
                     <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                         {item.content}
                     </p>
                     
                     <div className="mt-4 flex gap-2">
                        {item.sentiment === 'negative' && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded font-medium">负面情绪</span>}
                        {item.riskLevel === 'high' && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded font-medium flex items-center gap-1">高风险</span>}
                     </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};
