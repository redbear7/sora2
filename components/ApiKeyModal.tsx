
import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Save, Trash2, CheckCircle2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const LOCAL_KEY_NAME = 'cinescript_api_key';

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(LOCAL_KEY_NAME);
      if (saved) setKeyInput(saved);
      setIsSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(LOCAL_KEY_NAME, keyInput.trim());
    onSave(keyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleDelete = () => {
    localStorage.removeItem(LOCAL_KEY_NAME);
    setKeyInput('');
    onSave('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">API 키 설정</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400 leading-relaxed">
              CineScript AI는 사용자의 로컬 환경에 API 키를 저장합니다. 키가 서버로 전송되거나 공유되지 않으므로 안전합니다.
            </p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Google AI Studio에서 키 발급받기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Gemini API Key</label>
            <div className="relative">
              <input 
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              onClick={handleSave}
              disabled={!keyInput.trim()}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isSaved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {isSaved ? '저장 완료' : '설정 저장'}
            </button>
            {localStorage.getItem(LOCAL_KEY_NAME) && (
              <button 
                onClick={handleDelete}
                className="w-full py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                기존 키 삭제
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-950/50 flex items-center gap-2 text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Local Storage Encryption (Browser Only)
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
