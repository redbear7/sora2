
import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Save, Trash2, CheckCircle2, Cloud, Zap } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const LOCAL_KEY_NAME = 'cinescript_api_key';

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasCloudKey, setHasCloudKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(LOCAL_KEY_NAME);
      if (saved) setKeyInput(saved);
      setIsSaved(false);
      
      const aiStudio = (window as any).aistudio;
      if (aiStudio?.hasSelectedApiKey) {
        aiStudio.hasSelectedApiKey().then((has: boolean) => setHasCloudKey(has));
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(LOCAL_KEY_NAME, keyInput.trim());
    onSave(keyInput.trim());
    setIsSaved(true);
    setTimeout(onClose, 800);
  };

  const handleOpenAIStudioKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      try {
        await aiStudio.openSelectKey();
        onSave(''); // Trigger re-check in parent
        setIsSaved(true);
        setTimeout(onClose, 800);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleDelete = () => {
    localStorage.removeItem(LOCAL_KEY_NAME);
    setKeyInput('');
    onSave('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">API 환경 설정</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Cloud Selection */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-xs font-black text-sky-400 uppercase tracking-widest">
                <Cloud className="w-3.5 h-3.5" /> Google AI Studio 로드
             </div>
             <p className="text-xs text-zinc-500 leading-relaxed">내부 인증 시스템을 사용하여 유료 결제 계정의 프로젝트 키를 즉시 로드합니다. (추천)</p>
             <button 
                onClick={handleOpenAIStudioKey}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-900/20"
             >
               {hasCloudKey ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
               {hasCloudKey ? 'API 키 로드됨' : 'Google API 키 선택'}
             </button>
             <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                className="block text-center text-[10px] text-sky-500 hover:underline"
             >결제 프로젝트 및 요금제 안내 보기</a>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-zinc-600 font-bold">OR</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* Manual Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest">
               수동 키 입력
            </div>
            <input 
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                disabled={!keyInput.trim()}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> 저장
              </button>
              {localStorage.getItem(LOCAL_KEY_NAME) && (
                <button onClick={handleDelete} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-900/20">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-950/50 flex items-center gap-2 text-[9px] text-zinc-600 uppercase font-black tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" /> SECURE BROWSER LOCAL STORAGE
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
