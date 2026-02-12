import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage, CardRecord } from '../types';

interface AssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Assistant: React.FC<AssistantProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Xin chào! Tôi là Trợ lý HR ảo. Tôi có thể giúp gì cho bạn hôm nay? (Ví dụ: Tra cứu nhân viên, kiểm tra thẻ mượn...)',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: 'model',
      text: '...',
      timestamp: new Date()
    }]);

    try {
      const res = await fetch(
        'https://eghxnyzdnahwmpziwanz.supabase.co/functions/v1/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaHhueXpkbmFod21weml3YW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDk2MzgsImV4cCI6MjA4NDEyNTYzOH0.VEKpQcEVuyRmJoA4olnAQKTYMfTYQdNL21ZZOq6agME'
          },

          body: JSON.stringify({
            message: userMsg.text
          })
        }
      );

      const data = await res.json();

      setMessages(prev =>
        prev.map(msg =>
          msg.id === modelMsgId
            ? { ...msg, text: data.answer || 'Không có phản hồi từ trợ lý.' }
            : msg
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === modelMsgId
            ? { ...msg, text: 'Có lỗi xảy ra, vui lòng thử lại.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>


      {/* Chat Window */}
      <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-full">
              <Sparkles size={18} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Trợ lý HR AI</h3>
              <p className="text-xs text-slate-300">Sử dụng Gemini 3 Flash</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

    </>
  );
};