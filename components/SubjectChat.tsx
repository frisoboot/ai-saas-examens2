import React, { useState, useEffect, useRef } from 'react';
import { StudentProfile } from '../types';
import { createSubjectChat } from '../services/geminiService';
import { Button } from './Button';
import { Send, ArrowLeft, Bot, User, Sparkles } from 'lucide-react';
// Chat interface returned by createSubjectChat (server-side wrapper)
interface ChatInterface {
  sessionId: string;
  sendMessage: (message: string) => Promise<string>;
}
import ReactMarkdown from 'react-markdown';

interface SubjectChatProps {
  subject: string;
  student: StudentProfile;
  onBack: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const SubjectChat: React.FC<SubjectChatProps> = ({ subject, student, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<ChatInterface | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat
    chatRef.current = createSubjectChat(subject, student);
    
    // Initial greeting
    setMessages([{
      role: 'model',
      text: `Hoi ${student.name}! Ik ben je AI-expert voor **${subject}** (${student.level}). \n\nJe gaf aan dat je moeite hebt met: *${student.strugglePoints}*. \n\nWaar zullen we mee beginnen?`
    }]);
  }, [subject, student]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatRef.current) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const responseText = await chatRef.current.sendMessage(userMsg);

      setMessages(prev => [...prev, { role: 'model', text: responseText || "Sorry, ik begreep dat niet helemaal." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Er ging iets mis met de verbinding. Probeer het opnieuw." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
               <h2 className="font-bold text-slate-800">{subject} Expert</h2>
               <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI</span>
            </div>
            <p className="text-xs text-slate-500">Niveau: {student.level}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'model' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                {msg.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                <ReactMarkdown 
                  components={{
                    // Style basic markdown elements to look good in chat
                    p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    strong: ({children}) => <strong className="font-bold">{children}</strong>,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 flex-shrink-0">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto relative flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Stel een vraag over ${subject}...`}
            className="flex-1 p-4 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none shadow-inner"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white rounded-lg p-3 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
