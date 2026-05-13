import React, { useState } from 'react';
import { User, Session } from '../types';
import { generateLicenseReport } from '../services/geminiService';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';

interface AiAssistantProps {
  users: User[];
  sessions: Session[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ users, sessions }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAi = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResponse(null);
    
    try {
      const result = await generateLicenseReport(users, sessions, query);
      setResponse(result);
    } catch (error) {
      setResponse("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Tóm tắt tình hình sử dụng license hôm nay",
    "Có ai đang dùng phiên bản phần mềm cũ không?",
    "Liệt kê các tài khoản sắp hết hạn trong tháng này",
    "Công ty nào đang sử dụng nhiều license nhất?"
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-8 h-8" />
          <h2 className="text-xl font-bold">Trợ lý Quản trị AI</h2>
        </div>
        <p className="text-blue-100 opacity-90 text-sm">Sử dụng Gemini để phân tích dữ liệu license, người dùng và phát hiện bất thường.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {!response && !isLoading && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Tôi có thể giúp gì cho bạn?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
              {suggestions.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setQuery(s)}
                  className="text-sm text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all text-slate-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-slate-500 animate-pulse">Đang phân tích dữ liệu hệ thống...</p>
          </div>
        )}

        {response && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="prose prose-slate max-w-none">
                {/* Simple markdown rendering simulation since we can't use a library like react-markdown easily here without installing it */}
                {response.split('\n').map((line, i) => {
                    if (line.startsWith('###')) return <h3 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2">{line.replace('###', '')}</h3>
                    if (line.startsWith('**')) return <strong key={i} className="block mt-2">{line.replace(/\*\*/g, '')}</strong>
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-slate-700">{line.replace('- ', '')}</li>
                    return <p key={i} className="text-slate-600 my-1">{line}</p>
                })}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setResponse(null)} className="text-sm text-blue-600 hover:underline">
                    Xóa kết quả
                </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative max-w-4xl mx-auto flex gap-2">
          <input 
            type="text" 
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            placeholder="Đặt câu hỏi về dữ liệu license..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
          />
          <button 
            onClick={handleAskAi}
            disabled={!query.trim() || isLoading}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};