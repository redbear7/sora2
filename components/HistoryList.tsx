
import React from 'react';
import { SavedStoryboard } from '../types';
import { FileJson, Eye, Copy, Trash2, Calendar, Check, AlertCircle } from 'lucide-react';

interface HistoryListProps {
  items: SavedStoryboard[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onView: (item: SavedStoryboard) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onDelete, onClearAll, onView }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, item: SavedStoryboard) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(item.data, null, 2));
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
        <FileJson className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">저장된 스토리보드가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => {
            if(confirm("모든 히스토리 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
              onClearAll();
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-medium transition-colors border border-rose-900/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          모든 기록 삭제
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
          <div 
            key={item.id}
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.options.aspectRatio === '9:16' ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400' : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'}`}>
                  {item.options.aspectRatio}
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-100 truncate">
                {item.data.theme.logline || "Untitled Story"}
              </h3>
              <p className="text-sm text-zinc-500 truncate">테마: {item.data.theme.theme}</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={(e) => handleCopy(e, item)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
                title="JSON 데이터 복사"
              >
                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === item.id ? '복사됨' : '복사'}
              </button>
              <button 
                onClick={() => onView(item)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
              >
                <Eye className="w-3.5 h-3.5" />
                상세 보기
              </button>
              <button 
                onClick={() => {
                  if(confirm("이 프로젝트를 삭제하시겠습니까?")) {
                    onDelete(item.id);
                  }
                }}
                className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
