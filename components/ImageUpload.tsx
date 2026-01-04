
import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileImage, Video, ImageIcon, FileText, Image as ImageIconLucide, Type, Smartphone, Monitor } from 'lucide-react';
import { GenerationOptions, VideoDuration, VideoModel, ImageGenModel, InputType, AspectRatio } from '../types';

interface ImageUploadProps {
  onGenerate: (input: File | string, options: GenerationOptions) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onGenerate }) => {
  const [inputType, setInputType] = useState<InputType>('TEXT');
  const [model, setModel] = useState<VideoModel>('Sora2');
  const [duration, setDuration] = useState<VideoDuration>('15s');
  const [imageModel, setImageModel] = useState<ImageGenModel>('Nano Banana');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [textScript, setTextScript] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onGenerate(event.target.files[0], { model, duration, imageModel, inputType: 'IMAGE', aspectRatio });
    }
  };

  const handleTxtFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextScript(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (inputType === 'IMAGE' && event.dataTransfer.files && event.dataTransfer.files[0]) {
      onGenerate(event.dataTransfer.files[0], { model, duration, imageModel, inputType: 'IMAGE', aspectRatio });
    }
  }, [onGenerate, model, duration, imageModel, inputType, aspectRatio]);

  const handleTextSubmit = () => {
    if (textScript.trim()) {
      onGenerate(textScript, { model, duration, imageModel, inputType: 'TEXT', aspectRatio });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* Input Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-900/80 p-1 rounded-full border border-zinc-800 flex gap-1">
          <button
            onClick={() => setInputType('IMAGE')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
              inputType === 'IMAGE' 
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ImageIconLucide className="w-4 h-4" />
            이미지 모드
          </button>
          <button
            onClick={() => setInputType('TEXT')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
              inputType === 'TEXT' 
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Type className="w-4 h-4" />
            대본 모드
          </button>
        </div>
      </div>

      {/* Options Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>화면 비율 (Aspect Ratio)</span>
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['9:16', '16:9'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => setAspectRatio(r)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  aspectRatio === r 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r === '9:16' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {r === '9:16' ? '세로 (9:16)' : '가로 (16:9)'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
            <Video className="w-4 h-4 text-indigo-400" />
            <span>타겟 영상 모델</span>
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['VEO3', 'Sora2'] as VideoModel[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  model === m 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>영상 길이 (초)</span>
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['8s', '10s', '15s'] as VideoDuration[]).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  duration === d 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
            <ImageIcon className="w-4 h-4 text-pink-400" />
            <span>이미지 생성 엔진</span>
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['Nano Banana', 'Nano Banana Pro'] as ImageGenModel[]).map((im) => (
              <button
                key={im}
                onClick={() => setImageModel(im)}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  imageModel === im 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {im}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area (Dynamic) */}
      <div className="animate-fade-in">
        {inputType === 'IMAGE' ? (
          <div 
            className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-500 transition-all cursor-pointer group relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer relative z-10">
              <div className="p-4 bg-zinc-800 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/50">
                <Upload className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">이미지 업로드</h2>
              <p className="text-zinc-400 text-sm mb-6">클릭하거나 파일을 드래그하여 놓으세요</p>
              
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-md text-xs text-zinc-500 font-mono border border-zinc-700">
                  <FileImage className="w-4 h-4" />
                  <span>JPG, PNG 파일 지원</span>
                </div>
              </div>

              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-end">
               <input 
                type="file" 
                accept=".txt" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleTxtFileUpload} 
               />
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg border border-zinc-700 transition-colors"
               >
                 <Upload className="w-3.5 h-3.5" />
                 대본 파일(.txt) 불러오기
               </button>
             </div>
             <div className="w-full relative">
                <textarea 
                  value={textScript}
                  onChange={(e) => setTextScript(e.target.value)}
                  placeholder="영화 대본이나 소설의 한 장면을 입력하세요..."
                  className="w-full h-80 bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
                />
             </div>
             <div className="flex items-center gap-3">
               <button
                 onClick={handleTextSubmit}
                 disabled={!textScript.trim()}
                 className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
               >
                 <Video className="w-5 h-5" />
                 스토리보드 설계 시작
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
