import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIChatMessagesSkeleton } from '@/components/SkeletonScreen';
import { useAIChat } from '@/context/AIChatContext';

export function AIChatWidget() {
  const { isOpen, closeChat, toggleChat } = useAIChat();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your CookMate AI assistant. Need help with a recipe or ingredient substitution?" }
  ]);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleSend = () => {
    const question = input.trim();

    if (!question) return;

    setMessages((current) => [...current, { role: 'user', content: question }]);
    setInput('');
    setIsReplying(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: "I can help with that. For a lighter swap, try Greek yogurt, evaporated milk, or a blended cashew cream depending on the sauce.",
        },
      ]);
      setIsReplying(false);
    }, 900);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="mb-4 flex h-[500px] w-[calc(100vw-2rem)] max-w-96 flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl shadow-orange-950/10 sm:w-96"
          >
            {/* Header */}
            <div className="orange-gradient flex items-center justify-between p-4 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/18 ring-1 ring-white/20">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold">CookMate AI</p>
                  <p className="text-[10px] font-medium text-orange-50">Online & ready to help</p>
                </div>
              </div>
              <button 
                onClick={closeChat}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-orange-500 text-white rounded-tr-none' 
                        : 'bg-orange-50 text-stone-900 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isReplying && <AIChatMessagesSkeleton />}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-stone-100 flex gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="rounded-xl border-orange-100 focus:border-orange-300 focus:ring-orange-500"
              />
              <Button 
                onClick={handleSend}
                disabled={isReplying}
                className="rounded-xl px-3"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleChat}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full orange-gradient text-white shadow-xl shadow-orange-500/30 transition-transform hover:scale-110 active:scale-95"
      >
        <MessageSquare size={24} className={isOpen ? 'hidden' : 'block'} />
        <X size={24} className={isOpen ? 'block' : 'hidden'} />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}
